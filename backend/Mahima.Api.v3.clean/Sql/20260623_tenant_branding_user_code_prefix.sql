ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS user_code_prefix text NOT NULL DEFAULT 'MHN';

UPDATE public.tenants
SET user_code_prefix = upper(regexp_replace(coalesce(user_code_prefix, ''), '[^A-Za-z0-9]', '', 'g'))
WHERE user_code_prefix IS NOT NULL;

UPDATE public.tenants
SET user_code_prefix = 'MHN'
WHERE user_code_prefix IS NULL OR btrim(user_code_prefix) = '';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_tenants_user_code_prefix_not_blank'
          AND conrelid = 'public.tenants'::regclass
    ) THEN
        ALTER TABLE public.tenants
            ADD CONSTRAINT chk_tenants_user_code_prefix_not_blank
            CHECK (length(btrim(user_code_prefix)) BETWEEN 2 AND 12)
            NOT VALID;
    END IF;
END $$;
