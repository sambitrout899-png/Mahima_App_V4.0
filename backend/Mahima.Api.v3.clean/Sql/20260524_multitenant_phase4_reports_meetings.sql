BEGIN;

ALTER TABLE public."Teams"
    ADD COLUMN IF NOT EXISTS "TenantId" uuid NULL;

UPDATE public."Teams"
SET "TenantId" = '00000000-0000-0000-0000-000000000001'
WHERE "TenantId" IS NULL;

ALTER TABLE public."Teams"
    ALTER COLUMN "TenantId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_teams_tenant_id
    ON public."Teams"("TenantId");

ALTER TABLE public."Tasks"
    ADD COLUMN IF NOT EXISTS "TenantId" uuid NULL;

UPDATE public."Tasks"
SET "TenantId" = '00000000-0000-0000-0000-000000000001'
WHERE "TenantId" IS NULL;

ALTER TABLE public."Tasks"
    ALTER COLUMN "TenantId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tasks_tenant_id
    ON public."Tasks"("TenantId");

ALTER TABLE public."Meetings"
    ADD COLUMN IF NOT EXISTS "TenantId" uuid NULL;

UPDATE public."Meetings"
SET "TenantId" = '00000000-0000-0000-0000-000000000001'
WHERE "TenantId" IS NULL;

ALTER TABLE public."Meetings"
    ALTER COLUMN "TenantId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_meetings_tenant_id
    ON public."Meetings"("TenantId");

ALTER TABLE public.analytics_user_overview
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.analytics_user_overview
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.analytics_user_overview
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_analytics_user_overview_tenant_id
    ON public.analytics_user_overview(tenant_id);

ALTER TABLE public.analytics_task_by_role
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.analytics_task_by_role
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.analytics_task_by_role
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_analytics_task_by_role_tenant_id
    ON public.analytics_task_by_role(tenant_id);

ALTER TABLE public.analytics_team_productivity
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.analytics_team_productivity
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.analytics_team_productivity
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_analytics_team_productivity_tenant_id
    ON public.analytics_team_productivity(tenant_id);

ALTER TABLE public.analytics_prayer_overview
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.analytics_prayer_overview
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.analytics_prayer_overview
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_analytics_prayer_overview_tenant_id
    ON public.analytics_prayer_overview(tenant_id);

COMMIT;
