BEGIN;

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS domain_status varchar(32) NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS domain_verification_token varchar(160) NULL,
    ADD COLUMN IF NOT EXISTS domain_verified_at_utc timestamptz NULL,
    ADD COLUMN IF NOT EXISTS domain_last_checked_at_utc timestamptz NULL;

UPDATE public.tenants
SET domain_status = CASE
    WHEN domain IS NULL OR btrim(domain) = '' THEN 'none'
    WHEN domain_status IS NULL OR domain_status = 'none' THEN 'pending'
    ELSE domain_status
END;

UPDATE public.tenants
SET domain_verification_token = 'mahima-verify-' || replace(id::text, '-', '')
WHERE domain IS NOT NULL
  AND btrim(domain) <> ''
  AND (domain_verification_token IS NULL OR btrim(domain_verification_token) = '');

CREATE INDEX IF NOT EXISTS ix_tenants_domain_status
    ON public.tenants(domain_status);

COMMIT;
