BEGIN;

ALTER TABLE public.ministry_automation_settings
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.ministry_automation_settings
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.ministry_automation_settings
    ALTER COLUMN tenant_id SET NOT NULL;

DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT c.conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'ministry_automation_settings'
      AND c.contype = 'p'
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.ministry_automation_settings DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

ALTER TABLE public.ministry_automation_settings
    ADD CONSTRAINT pk_ministry_automation_settings PRIMARY KEY (tenant_id, key);

CREATE INDEX IF NOT EXISTS ix_ministry_automation_settings_tenant_id
    ON public.ministry_automation_settings(tenant_id);

ALTER TABLE public.ministry_scheduled_message_runs
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.ministry_scheduled_message_runs
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.ministry_scheduled_message_runs
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ministry_scheduled_message_runs_tenant_id
    ON public.ministry_scheduled_message_runs(tenant_id);

DROP INDEX IF EXISTS public.ux_ministry_scheduled_message_runs_key_date;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ministry_scheduled_message_runs_tenant_key_date
    ON public.ministry_scheduled_message_runs(tenant_id, message_key, scheduled_local_date);

COMMIT;
