BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.users
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.users
    ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_tenant'
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT fk_users_tenant
            FOREIGN KEY (tenant_id)
            REFERENCES public.tenants(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_users_tenant_id
    ON public.users(tenant_id);

CREATE INDEX IF NOT EXISTS ix_users_tenant_username
    ON public.users(tenant_id, lower(trim(username)));

CREATE INDEX IF NOT EXISTS ix_users_tenant_email
    ON public.users(tenant_id, lower(trim(coalesce(email, ''))));

DELETE FROM public.tenant_module_licenses a
USING public.tenant_module_licenses b
WHERE a.id <> b.id
  AND a.tenant_id = b.tenant_id
  AND a.module_code = b.module_code
  AND a.status = 'active'
  AND b.status = 'active'
  AND a.updated_at_utc < b.updated_at_utc;

CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_module_licenses_active
    ON public.tenant_module_licenses(tenant_id, module_code)
    WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_events_provider_event
    ON public.payment_events(provider_event_id)
    WHERE provider_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_tenants_domain_lower
    ON public.tenants(lower(domain))
    WHERE domain IS NOT NULL AND domain <> '';

INSERT INTO public.payment_events (id, payment_intent_id, event_type, provider_event_id, payload_json)
SELECT gen_random_uuid(), id, 'backfill-paid', provider_payment_id, '{"source":"phase2-backfill"}'
FROM public.payment_intents
WHERE status = 'paid'
  AND provider_payment_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.payment_events pe
      WHERE pe.provider_event_id = public.payment_intents.provider_payment_id
  );

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'pages'
    ) THEN
        INSERT INTO public.pages (key, title, description)
        SELECT 'MULTITENANT', 'Multi-Tenant', 'Platform tenant, licensing, and payment administration.'
        WHERE NOT EXISTS (SELECT 1 FROM public.pages WHERE key = 'MULTITENANT');

        INSERT INTO public.pages (key, title, description)
        SELECT 'LANDING_PAGE', 'Landing Page', 'Church landing page configuration.'
        WHERE NOT EXISTS (SELECT 1 FROM public.pages WHERE key = 'LANDING_PAGE');
    END IF;
END $$;

DO $$
DECLARE
    admin_role_id integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'role_permissions'
    ) THEN
        SELECT id INTO admin_role_id
        FROM public.roles
        WHERE lower(name) = 'admin'
        ORDER BY id
        LIMIT 1;

        IF admin_role_id IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, page_key)
            SELECT admin_role_id, 'MULTITENANT'
            WHERE NOT EXISTS (
                SELECT 1 FROM public.role_permissions
                WHERE role_id = admin_role_id AND page_key = 'MULTITENANT'
            );

            INSERT INTO public.role_permissions (role_id, page_key)
            SELECT admin_role_id, 'LANDING_PAGE'
            WHERE NOT EXISTS (
                SELECT 1 FROM public.role_permissions
                WHERE role_id = admin_role_id AND page_key = 'LANDING_PAGE'
            );
        END IF;
    END IF;
END $$;

COMMIT;
