-- Emergency recovery for the important Admin user SambitR.
--
-- This script:
--   1. Finds SambitR in the duplicate cleanup audit table.
--   2. Restores username/display/email/phone.
--   3. Reactivates isdeleted/deletedat if those columns exist.
--   4. Clears any active login block.
--   5. Sets a temporary ASP.NET Identity-compatible password.
--
-- Temporary password after running this script:
--   Mahima@2026#Reset
--
-- Change the password immediately after login.

BEGIN;

DO $$
DECLARE
    restore_user_id uuid;
    restored_username text;
    restored_displayname text;
    restored_email text;
    restored_phone text;
    restored_normalized_phone text;
    is_deleted_column text;
    deleted_at_column text;
    temp_password_hash text := 'AQAAAAIAAYagAAAAEHLHKsaLGGoQbp6fT0kMcQIQ1bjsRBRHu7eeA7SE2lQ4C4H17daJIqLQ4e+c+hegwg==';
BEGIN
    SELECT
        duplicate_user_id,
        duplicate_username,
        coalesce(duplicate_displayname, duplicate_username),
        duplicate_email,
        duplicate_phone,
        normalized_phone
    INTO
        restore_user_id,
        restored_username,
        restored_displayname,
        restored_email,
        restored_phone,
        restored_normalized_phone
    FROM public.user_duplicate_mobile_cleanup_audit
    WHERE lower(coalesce(duplicate_username, '')) = lower('SambitR')
       OR lower(coalesce(duplicate_displayname, '')) = lower('SambitR')
    ORDER BY captured_at_utc DESC
    LIMIT 1;

    IF restore_user_id IS NULL THEN
        RAISE EXCEPTION 'No cleanup audit row found for SambitR. Check public.users manually for username/displayname like SambitR or deleted_duplicate_%%.';
    END IF;

    -- Make room for SambitR's original mobile number.
    UPDATE public.users u
    SET phone = NULL
    WHERE u.id <> restore_user_id
      AND regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') <> ''
      AND (
        CASE
            WHEN length(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g')) > 10
                 AND regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') LIKE '91%'
                THEN right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 10)
            ELSE regexp_replace(coalesce(u.phone, ''), '\D', '', 'g')
        END
      ) = restored_normalized_phone;

    UPDATE public.users
    SET
        username = restored_username,
        displayname = restored_displayname,
        email = restored_email,
        phone = restored_phone,
        passwordhash = temp_password_hash
    WHERE id = restore_user_id;

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

    IF to_regclass('public.user_access_blocks') IS NOT NULL THEN
        UPDATE public.user_access_blocks
        SET is_active = false
        WHERE user_id = restore_user_id;
    END IF;
END $$;

COMMIT;

SELECT
    id,
    username,
    displayname,
    email,
    phone,
    role,
    left(passwordhash, 12) AS passwordhash_prefix
FROM public.users
WHERE lower(coalesce(username, '')) = lower('SambitR')
   OR lower(coalesce(displayname, '')) = lower('SambitR');
