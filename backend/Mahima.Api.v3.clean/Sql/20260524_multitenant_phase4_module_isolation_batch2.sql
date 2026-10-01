BEGIN;

ALTER TABLE public."Timesheets"
    ADD COLUMN IF NOT EXISTS "TenantId" uuid NULL;

UPDATE public."Timesheets" t
SET "TenantId" = COALESCE(u.tenant_id, '00000000-0000-0000-0000-000000000001')
FROM public.users u
WHERE t."UserId" = u.id::text
  AND t."TenantId" IS NULL;

UPDATE public."Timesheets"
SET "TenantId" = '00000000-0000-0000-0000-000000000001'
WHERE "TenantId" IS NULL;

ALTER TABLE public."Timesheets"
    ALTER COLUMN "TenantId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_timesheets_tenant_id ON public."Timesheets"("TenantId");

ALTER TABLE public.staff_payroll_settings
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.staff_payroll_settings s
SET tenant_id = COALESCE(u.tenant_id, '00000000-0000-0000-0000-000000000001')
FROM public.users u
WHERE s.user_id = u.id::text
  AND s.tenant_id IS NULL;

UPDATE public.staff_payroll_settings
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.staff_payroll_settings
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_staff_payroll_settings_tenant_id ON public.staff_payroll_settings(tenant_id);

ALTER TABLE public.payroll_runs
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.payroll_runs r
SET tenant_id = COALESCE(u.tenant_id, '00000000-0000-0000-0000-000000000001')
FROM public.users u
WHERE r.user_id = u.id::text
  AND r.tenant_id IS NULL;

UPDATE public.payroll_runs
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.payroll_runs
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_payroll_runs_tenant_id ON public.payroll_runs(tenant_id);

ALTER TABLE public.accounts
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.accounts
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.accounts
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_accounts_tenant_id ON public.accounts(tenant_id);

DO $$
DECLARE
    idx_name text;
BEGIN
    SELECT i.relname INTO idx_name
    FROM pg_index x
    JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_class t ON t.oid = x.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'accounts'
      AND x.indisunique
      AND pg_get_indexdef(i.oid) ILIKE '%(name)%'
    LIMIT 1;

    IF idx_name IS NOT NULL THEN
        EXECUTE format('DROP INDEX IF EXISTS public.%I', idx_name);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_accounts_tenant_name
    ON public.accounts(tenant_id, lower(name));

ALTER TABLE public.journal_entries
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.journal_entries
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.journal_entries
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_journal_entries_tenant_id ON public.journal_entries(tenant_id);

ALTER TABLE public."Attachments"
    ADD COLUMN IF NOT EXISTS "TenantId" uuid NULL;

UPDATE public."Attachments"
SET "TenantId" = '00000000-0000-0000-0000-000000000001'
WHERE "TenantId" IS NULL;

ALTER TABLE public."Attachments"
    ALTER COLUMN "TenantId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_attachments_tenant_id ON public."Attachments"("TenantId");

COMMIT;
