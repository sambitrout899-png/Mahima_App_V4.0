-- Purpose:
--   Soft-delete duplicate users that share the same normalized mobile number.
--   This keeps one active user per mobile number, clears mobile numbers from the
--   duplicates, and stores the duplicate rows in an audit table before updating.
--
-- How the keeper is chosen:
--   1. Earliest joindate is kept.
--   2. If joindate ties, the smallest id is kept.
--
-- Safe run order:
--   1. Run the preview SELECT below.
--   2. If the keep/delete list looks correct, run the DO block.
--   3. Run 20260618_unique_user_mobile.sql to create the normalized unique index.

-- PREVIEW ONLY: this does not change data.
WITH normalized_users AS (
    SELECT
        id,
        username,
        displayname,
        email,
        phone,
        joindate,
        CASE
            WHEN length(raw_phone) > 10 AND raw_phone LIKE '91%' THEN right(raw_phone, 10)
            ELSE raw_phone
        END AS normalized_phone
    FROM (
        SELECT
            id,
            username,
            displayname,
            email,
            phone,
            joindate,
            regexp_replace(coalesce(phone, ''), '\D', '', 'g') AS raw_phone
        FROM public.users
        WHERE coalesce(username, '') NOT ILIKE 'deleted_%'
          AND coalesce(displayname, '') NOT ILIKE 'Deleted%'
    ) u
),
ranked AS (
    SELECT
        *,
        first_value(id) OVER (
            PARTITION BY normalized_phone
            ORDER BY coalesce(joindate, now()) ASC, id ASC
        ) AS keep_user_id,
        row_number() OVER (
            PARTITION BY normalized_phone
            ORDER BY coalesce(joindate, now()) ASC, id ASC
        ) AS duplicate_rank,
        count(*) OVER (PARTITION BY normalized_phone) AS duplicate_count
    FROM normalized_users
    WHERE normalized_phone <> ''
)
SELECT
    normalized_phone,
    duplicate_count,
    CASE WHEN duplicate_rank = 1 THEN 'KEEP' ELSE 'SOFT_DELETE' END AS action,
    id,
    keep_user_id,
    username,
    displayname,
    email,
    phone,
    joindate
FROM ranked
WHERE duplicate_count > 1
ORDER BY normalized_phone, duplicate_rank;

-- EXECUTE CLEANUP: run this only after reviewing the preview above.
DO $$
DECLARE
    set_clause text;
    cleanup_run_id uuid := md5(random()::text || clock_timestamp()::text)::uuid;
    is_deleted_column text;
    deleted_at_column text;
BEGIN
    CREATE TABLE IF NOT EXISTS public.user_duplicate_mobile_cleanup_audit (
        audit_id bigserial PRIMARY KEY,
        cleanup_run_id uuid NOT NULL,
        duplicate_user_id uuid NOT NULL,
        keep_user_id uuid NOT NULL,
        normalized_phone text NOT NULL,
        duplicate_username text NULL,
        duplicate_displayname text NULL,
        duplicate_email text NULL,
        duplicate_phone text NULL,
        duplicate_joindate timestamp with time zone NULL,
        captured_at_utc timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TEMP TABLE duplicate_users_to_soft_delete ON COMMIT DROP AS
    WITH normalized_users AS (
        SELECT
            id,
            username,
            displayname,
            email,
            phone,
            joindate,
            CASE
                WHEN length(raw_phone) > 10 AND raw_phone LIKE '91%' THEN right(raw_phone, 10)
                ELSE raw_phone
            END AS normalized_phone
        FROM (
            SELECT
                id,
                username,
                displayname,
                email,
                phone,
                joindate,
                regexp_replace(coalesce(phone, ''), '\D', '', 'g') AS raw_phone
            FROM public.users
            WHERE coalesce(username, '') NOT ILIKE 'deleted_%'
              AND coalesce(displayname, '') NOT ILIKE 'Deleted%'
        ) u
    ),
    ranked AS (
        SELECT
            *,
            first_value(id) OVER (
                PARTITION BY normalized_phone
                ORDER BY coalesce(joindate, now()) ASC, id ASC
            ) AS keep_user_id,
            row_number() OVER (
                PARTITION BY normalized_phone
                ORDER BY coalesce(joindate, now()) ASC, id ASC
            ) AS duplicate_rank,
            count(*) OVER (PARTITION BY normalized_phone) AS duplicate_count
        FROM normalized_users
        WHERE normalized_phone <> ''
    )
    SELECT *
    FROM ranked
    WHERE duplicate_count > 1
      AND duplicate_rank > 1;

    INSERT INTO public.user_duplicate_mobile_cleanup_audit (
        cleanup_run_id,
        duplicate_user_id,
        keep_user_id,
        normalized_phone,
        duplicate_username,
        duplicate_displayname,
        duplicate_email,
        duplicate_phone,
        duplicate_joindate
    )
    SELECT
        cleanup_run_id,
        id,
        keep_user_id,
        normalized_phone,
        username,
        displayname,
        email,
        phone,
        joindate
    FROM duplicate_users_to_soft_delete;

    set_clause := '
        username = ''deleted_duplicate_'' || left(id::text, 8),
        email = NULL,
        phone = NULL,
        displayname = ''Deleted duplicate user'',
        profilephotourl = NULL';

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'passwordhash'
    ) THEN
        set_clause := set_clause || ', passwordhash = md5(random()::text || clock_timestamp()::text)';
    END IF;

    SELECT column_name
    INTO is_deleted_column
    FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND lower(column_name) = 'isdeleted'
    LIMIT 1;

    IF is_deleted_column IS NOT NULL THEN
        set_clause := set_clause || ', "' || replace(is_deleted_column, '"', '""') || '" = true';
    END IF;

    SELECT column_name
    INTO deleted_at_column
    FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND lower(column_name) = 'deletedat'
    LIMIT 1;

    IF deleted_at_column IS NOT NULL THEN
        set_clause := set_clause || ', "' || replace(deleted_at_column, '"', '""') || '" = now()';
    END IF;

    EXECUTE '
        UPDATE public.users
        SET ' || set_clause || '
        WHERE id IN (SELECT id FROM duplicate_users_to_soft_delete)';
END $$;

-- VERIFY: should return zero rows after cleanup.
WITH normalized_users AS (
    SELECT
        id,
        phone,
        CASE
            WHEN length(raw_phone) > 10 AND raw_phone LIKE '91%' THEN right(raw_phone, 10)
            ELSE raw_phone
        END AS normalized_phone
    FROM (
        SELECT
            id,
            phone,
            regexp_replace(coalesce(phone, ''), '\D', '', 'g') AS raw_phone
        FROM public.users
        WHERE coalesce(username, '') NOT ILIKE 'deleted_%'
          AND coalesce(displayname, '') NOT ILIKE 'Deleted%'
    ) u
)
SELECT normalized_phone, count(*) AS remaining_count, array_agg(id) AS user_ids
FROM normalized_users
WHERE normalized_phone <> ''
GROUP BY normalized_phone
HAVING count(*) > 1
ORDER BY remaining_count DESC, normalized_phone;
