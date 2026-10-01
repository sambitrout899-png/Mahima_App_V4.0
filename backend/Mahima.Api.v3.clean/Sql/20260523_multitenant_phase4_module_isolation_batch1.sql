BEGIN;

ALTER TABLE public.prayerrequests
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.prayerrequests p
SET tenant_id = COALESCE(u.tenant_id, '00000000-0000-0000-0000-000000000001')
FROM public.users u
WHERE p.userid = u.id
  AND p.tenant_id IS NULL;

UPDATE public.prayerrequests
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.prayerrequests
    ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_prayerrequests_tenant') THEN
        ALTER TABLE public.prayerrequests
            ADD CONSTRAINT fk_prayerrequests_tenant
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_prayerrequests_tenant_id ON public.prayerrequests(tenant_id);

ALTER TABLE public.expenses
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.expenses e
SET tenant_id = COALESCE(u.tenant_id, '00000000-0000-0000-0000-000000000001')
FROM public.users u
WHERE e.created_by_user_id::text = u.id::text
  AND e.tenant_id IS NULL;

UPDATE public.expenses
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.expenses
    ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expenses_tenant') THEN
        ALTER TABLE public.expenses
            ADD CONSTRAINT fk_expenses_tenant
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_expenses_tenant_id ON public.expenses(tenant_id);

ALTER TABLE public."AttendanceRecords"
    ADD COLUMN IF NOT EXISTS "TenantId" uuid NULL;

UPDATE public."AttendanceRecords" a
SET "TenantId" = COALESCE(u.tenant_id, '00000000-0000-0000-0000-000000000001')
FROM public.users u
WHERE a."UserId" = u.id::text
  AND a."TenantId" IS NULL;

UPDATE public."AttendanceRecords"
SET "TenantId" = '00000000-0000-0000-0000-000000000001'
WHERE "TenantId" IS NULL;

ALTER TABLE public."AttendanceRecords"
    ALTER COLUMN "TenantId" SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_records_tenant') THEN
        ALTER TABLE public."AttendanceRecords"
            ADD CONSTRAINT fk_attendance_records_tenant
            FOREIGN KEY ("TenantId") REFERENCES public.tenants(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_attendance_records_tenant_id ON public."AttendanceRecords"("TenantId");

ALTER TABLE public."Sermons"
    ADD COLUMN IF NOT EXISTS "TenantId" uuid NULL;

UPDATE public."Sermons"
SET "TenantId" = '00000000-0000-0000-0000-000000000001'
WHERE "TenantId" IS NULL;

ALTER TABLE public."Sermons"
    ALTER COLUMN "TenantId" SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sermons_tenant') THEN
        ALTER TABLE public."Sermons"
            ADD CONSTRAINT fk_sermons_tenant
            FOREIGN KEY ("TenantId") REFERENCES public.tenants(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_sermons_tenant_id ON public."Sermons"("TenantId");

ALTER TABLE public.baptism_requests
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.baptism_requests
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.baptism_requests
    ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_baptism_requests_tenant') THEN
        ALTER TABLE public.baptism_requests
            ADD CONSTRAINT fk_baptism_requests_tenant
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_baptism_requests_tenant_id ON public.baptism_requests(tenant_id);

ALTER TABLE public.marriage_applications
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.marriage_applications
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.marriage_applications
    ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_marriage_applications_tenant') THEN
        ALTER TABLE public.marriage_applications
            ADD CONSTRAINT fk_marriage_applications_tenant
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_marriage_applications_tenant_id ON public.marriage_applications(tenant_id);

ALTER TABLE public.candidates
    ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

UPDATE public.candidates
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE public.candidates
    ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_candidates_tenant') THEN
        ALTER TABLE public.candidates
            ADD CONSTRAINT fk_candidates_tenant
            FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_candidates_tenant_id ON public.candidates(tenant_id);

COMMIT;
