CREATE TABLE IF NOT EXISTS public.tenant_role_permissions (
    tenant_id uuid NOT NULL,
    role_id integer NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    page_key text NOT NULL,
    created_at_utc timestamp with time zone NOT NULL DEFAULT now(),
    updated_at_utc timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, role_id, page_key)
);

CREATE INDEX IF NOT EXISTS ix_tenant_role_permissions_role
    ON public.tenant_role_permissions(role_id, page_key);
