-- Purpose:
--   Restore the important Admin user "SambitR" if it was soft-deleted by the
--   duplicate mobile cleanup.
--
-- Run order:
--   1. Run the PREVIEW query first.
--   2. If it shows the correct SambitR row, run the RESTORE transaction.
--   3. If password login fails after restore, use Admin reset password for this user.

-- PREVIEW: confirm the exact user row that will be restored.
SELECT
    a.audit_id,
    a.duplicate_user_id AS restore_user_id,
    a.keep_user_id AS previous_keeper_user_id,
    a.normalized_phone,
    a.duplicate_username,
    a.duplicate_displayname,
    a.duplicate_email,
    a.duplicate_phone,
    u.username AS current_username,
    u.displayname AS current_displayname,
    u.email AS current_email,
    u.phone AS current_phone,
    u.role AS current_role
FROM public.user_duplicate_mobile_cleanup_audit a
JOIN public.users u ON u.id = a.duplicate_user_id
WHERE lower(coalesce(a.duplicate_username, '')) = lower('SambitR')
   OR lower(coalesce(a.duplicate_displayname, '')) = lower('SambitR')
ORDER BY a.captured_at_utc DESC
LIMIT 5;

-- RESTORE: run only after the preview above identifies the correct SambitR row.
BEGIN;

WITH target AS (
    SELECT *
    FROM public.user_duplicate_mobile_cleanup_audit
    WHERE lower(coalesce(duplicate_username, '')) = lower('SambitR')
       OR lower(coalesce(duplicate_displayname, '')) = lower('SambitR')
    ORDER BY captured_at_utc DESC
    LIMIT 1
),
clear_conflicting_active_phone AS (
    UPDATE public.users u
    SET phone = NULL
    FROM target t
    WHERE u.id <> t.duplicate_user_id
      AND regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') <> ''
      AND (
        CASE
            WHEN length(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g')) > 10
                 AND regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') LIKE '91%'
                THEN right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 10)
            ELSE regexp_replace(coalesce(u.phone, ''), '\D', '', 'g')
        END
      ) = t.normalized_phone
    RETURNING u.id AS cleared_user_id
)
UPDATE public.users u
SET
    username = t.duplicate_username,
    displayname = coalesce(t.duplicate_displayname, t.duplicate_username),
    email = t.duplicate_email,
    phone = t.duplicate_phone
FROM target t
WHERE u.id = t.duplicate_user_id;

DO $$
DECLARE
    is_deleted_column text;
    deleted_at_column text;
    restore_user_id uuid;
BEGIN
    SELECT duplicate_user_id
    INTO restore_user_id
    FROM public.user_duplicate_mobile_cleanup_audit
    WHERE lower(coalesce(duplicate_username, '')) = lower('SambitR')
       OR lower(coalesce(duplicate_displayname, '')) = lower('SambitR')
    ORDER BY captured_at_utc DESC
    LIMIT 1;

    IF restore_user_id IS NULL THEN
        RAISE EXCEPTION 'No cleanup audit row found for SambitR.';
    END IF;

    SELECT column_name
    INTO is_deleted_column
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND lower(column_name) = 'isdeleted'
    LIMIT 1;

    IF is_deleted_column IS NOT NULL THEN
        EXECUTE 'UPDATE public.users SET "' || replace(is_deleted_column, '"', '""') || '" = false WHERE id = $1'
        USING restore_user_id;
    END IF;

    SELECT column_name
    INTO deleted_at_column
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND lower(column_name) = 'deletedat'
    LIMIT 1;

    IF deleted_at_column IS NOT NULL THEN
        EXECUTE 'UPDATE public.users SET "' || replace(deleted_at_column, '"', '""') || '" = NULL WHERE id = $1'
        USING restore_user_id;
    END IF;
END $$;

COMMIT;

-- VERIFY: SambitR should now be active again.
SELECT
    id,
    username,
    displayname,
    email,
    phone,
    role
FROM public.users
WHERE lower(coalesce(username, '')) = lower('SambitR')
   OR lower(coalesce(displayname, '')) = lower('SambitR');
