BEGIN;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.users
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.users
    ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_tenant') THEN
        ALTER TABLE public.users
            ADD CONSTRAINT fk_users_tenant
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_users_tenant_id ON public.users(tenant_id);

ALTER TABLE public."Teams"
    ADD COLUMN IF NOT EXISTS "TenantId" uuid NULL;

UPDATE public."Teams"
SET "TenantId" = '00000000-0000-0000-0000-000000000001'
WHERE "TenantId" IS NULL;

ALTER TABLE public."Teams"
    ALTER COLUMN "TenantId" SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_teams_tenant') THEN
        ALTER TABLE public."Teams"
            ADD CONSTRAINT fk_teams_tenant
            FOREIGN KEY ("TenantId") REFERENCES public.tenants(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_teams_tenant_id ON public."Teams"("TenantId");

ALTER TABLE public."Tasks"
    ADD COLUMN IF NOT EXISTS "TenantId" uuid NULL;

UPDATE public."Tasks"
SET "TenantId" = '00000000-0000-0000-0000-000000000001'
WHERE "TenantId" IS NULL;

ALTER TABLE public."Tasks"
    ALTER COLUMN "TenantId" SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_tenant') THEN
        ALTER TABLE public."Tasks"
            ADD CONSTRAINT fk_tasks_tenant
            FOREIGN KEY ("TenantId") REFERENCES public.tenants(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_tasks_tenant_id ON public."Tasks"("TenantId");

ALTER TABLE public.chats
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.chats c
SET tenant_id = COALESCE(u.tenant_id, '00000000-0000-0000-0000-000000000001')
FROM public.users u
WHERE c.createdby = u.id
  AND c.tenant_id IS NULL;

UPDATE public.chats
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.chats
    ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chats_tenant') THEN
        ALTER TABLE public.chats
            ADD CONSTRAINT fk_chats_tenant
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_chats_tenant_id ON public.chats(tenant_id);

COMMIT;
