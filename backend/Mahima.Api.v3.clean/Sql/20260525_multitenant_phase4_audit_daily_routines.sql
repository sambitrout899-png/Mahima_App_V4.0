BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.daily_page_visits (
    id bigserial PRIMARY KEY,
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    user_id uuid NULL,
    path text NOT NULL,
    title text NULL,
    referrer text NULL,
    user_agent text NULL,
    ip_address text NULL,
    created_at_utc timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_events (
    id bigserial PRIMARY KEY,
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    event_type text NOT NULL,
    severity text NOT NULL DEFAULT 'medium',
    username text NULL,
    user_id uuid NULL,
    path text NULL,
    ip_address text NULL,
    user_agent text NULL,
    details text NULL,
    created_at_utc timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_access_blocks (
    user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    reason text NULL,
    blocked_by uuid NULL,
    blocked_at_utc timestamp with time zone NOT NULL DEFAULT now(),
    is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public."AuditLogs"
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public."AuditLogs"
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public."AuditLogs"
    ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001',
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.adminnotifications
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.adminnotifications n
SET tenant_id = COALESCE(u.tenant_id, '00000000-0000-0000-0000-000000000001')
FROM public.users u
WHERE n.userid = u.id
  AND n.tenant_id IS NULL;

UPDATE public.adminnotifications
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.adminnotifications
    ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001',
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.daily_page_visits
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.daily_page_visits v
SET tenant_id = COALESCE(u.tenant_id, '00000000-0000-0000-0000-000000000001')
FROM public.users u
WHERE v.user_id = u.id
  AND v.tenant_id IS NULL;

UPDATE public.daily_page_visits
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.daily_page_visits
    ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001',
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.security_events
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.security_events e
SET tenant_id = COALESCE(u.tenant_id, '00000000-0000-0000-0000-000000000001')
FROM public.users u
WHERE e.user_id = u.id
  AND e.tenant_id IS NULL;

UPDATE public.security_events
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.security_events
    ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001',
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.user_access_blocks
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.user_access_blocks b
SET tenant_id = COALESCE(u.tenant_id, '00000000-0000-0000-0000-000000000001')
FROM public.users u
WHERE b.user_id = u.id
  AND b.tenant_id IS NULL;

UPDATE public.user_access_blocks
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.user_access_blocks
    ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001',
    ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_auditlogs_tenant_id
    ON public."AuditLogs"(tenant_id);

CREATE INDEX IF NOT EXISTS ix_adminnotifications_tenant_id
    ON public.adminnotifications(tenant_id);

CREATE INDEX IF NOT EXISTS ix_daily_page_visits_tenant_created_at
    ON public.daily_page_visits(tenant_id, created_at_utc);

CREATE INDEX IF NOT EXISTS ix_security_events_tenant_created_at
    ON public.security_events(tenant_id, created_at_utc);

CREATE INDEX IF NOT EXISTS ix_user_access_blocks_tenant_active
    ON public.user_access_blocks(tenant_id, is_active);

COMMIT;
