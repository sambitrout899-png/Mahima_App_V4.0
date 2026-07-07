BEGIN;

CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid PRIMARY KEY,
    name varchar(160) NOT NULL,
    slug varchar(80) NOT NULL UNIQUE,
    domain varchar(180) NULL UNIQUE,
    contact_name varchar(160) NULL,
    contact_email varchar(256) NULL,
    contact_phone varchar(32) NULL,
    status varchar(32) NOT NULL DEFAULT 'active',
    is_root_tenant boolean NOT NULL DEFAULT false,
    created_at_utc timestamptz NOT NULL DEFAULT now(),
    updated_at_utc timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.module_catalog (
    code varchar(64) PRIMARY KEY,
    name varchar(120) NOT NULL,
    description text NULL,
    monthly_price_inr numeric(12,2) NOT NULL DEFAULT 0,
    is_base_module boolean NOT NULL DEFAULT false,
    enabled boolean NOT NULL DEFAULT true,
    display_order integer NOT NULL DEFAULT 0,
    created_at_utc timestamptz NOT NULL DEFAULT now(),
    updated_at_utc timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id uuid PRIMARY KEY,
    code varchar(64) NOT NULL UNIQUE,
    name varchar(120) NOT NULL,
    description text NULL,
    monthly_price_inr numeric(12,2) NOT NULL DEFAULT 0,
    is_base_free_plan boolean NOT NULL DEFAULT false,
    enabled boolean NOT NULL DEFAULT true,
    display_order integer NOT NULL DEFAULT 0,
    created_at_utc timestamptz NOT NULL DEFAULT now(),
    updated_at_utc timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_plan_modules (
    plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    module_code varchar(64) NOT NULL REFERENCES public.module_catalog(code) ON DELETE RESTRICT,
    created_at_utc timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (plan_id, module_code)
);

CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
    status varchar(32) NOT NULL DEFAULT 'active',
    starts_at_utc timestamptz NOT NULL DEFAULT now(),
    ends_at_utc timestamptz NULL,
    trial_ends_at_utc timestamptz NULL,
    created_at_utc timestamptz NOT NULL DEFAULT now(),
    updated_at_utc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_tenant_subscriptions_tenant_status ON public.tenant_subscriptions(tenant_id, status);

CREATE TABLE IF NOT EXISTS public.payment_intents (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    purpose varchar(64) NOT NULL DEFAULT 'module_activation',
    module_code varchar(64) NULL REFERENCES public.module_catalog(code) ON DELETE RESTRICT,
    plan_id uuid NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
    amount_inr numeric(12,2) NOT NULL DEFAULT 0,
    currency varchar(8) NOT NULL DEFAULT 'INR',
    provider varchar(40) NOT NULL DEFAULT 'upi',
    status varchar(32) NOT NULL DEFAULT 'pending',
    provider_order_id varchar(160) NULL,
    provider_payment_id varchar(160) NULL,
    upi_vpa varchar(120) NULL,
    upi_payee_name varchar(160) NULL,
    upi_deep_link text NULL,
    metadata_json jsonb NULL,
    created_at_utc timestamptz NOT NULL DEFAULT now(),
    paid_at_utc timestamptz NULL,
    expires_at_utc timestamptz NULL
);
CREATE INDEX IF NOT EXISTS ix_payment_intents_tenant_status ON public.payment_intents(tenant_id, status);
CREATE INDEX IF NOT EXISTS ix_payment_intents_provider_order ON public.payment_intents(provider_order_id);

CREATE TABLE IF NOT EXISTS public.tenant_module_licenses (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    module_code varchar(64) NOT NULL REFERENCES public.module_catalog(code) ON DELETE RESTRICT,
    status varchar(32) NOT NULL DEFAULT 'active',
    price_inr numeric(12,2) NOT NULL DEFAULT 0,
    source varchar(32) NOT NULL DEFAULT 'manual',
    activated_by_payment_id uuid NULL REFERENCES public.payment_intents(id) ON DELETE SET NULL,
    starts_at_utc timestamptz NOT NULL DEFAULT now(),
    ends_at_utc timestamptz NULL,
    created_at_utc timestamptz NOT NULL DEFAULT now(),
    updated_at_utc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_tenant_module_licenses_tenant_module_status ON public.tenant_module_licenses(tenant_id, module_code, status);

CREATE TABLE IF NOT EXISTS public.payment_events (
    id uuid PRIMARY KEY,
    payment_intent_id uuid NOT NULL REFERENCES public.payment_intents(id) ON DELETE CASCADE,
    event_type varchar(80) NOT NULL,
    provider_event_id varchar(160) NULL,
    payload_json jsonb NULL,
    created_at_utc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_payment_events_provider_event ON public.payment_events(provider_event_id);

CREATE TABLE IF NOT EXISTS public.tenant_landing_configs (
    tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    logo_url text NULL,
    hero_image_url text NULL,
    hero_title varchar(220) NOT NULL,
    hero_subtitle text NULL,
    primary_color varchar(32) NULL,
    accent_color varchar(32) NULL,
    contact_email varchar(256) NULL,
    contact_phone varchar(32) NULL,
    address text NULL,
    service_times_json jsonb NULL,
    social_links_json jsonb NULL,
    sections_json jsonb NULL,
    published boolean NOT NULL DEFAULT true,
    created_at_utc timestamptz NOT NULL DEFAULT now(),
    updated_at_utc timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.tenants (id, name, slug, contact_email, status, is_root_tenant)
VALUES ('00000000-0000-0000-0000-000000000001', 'Mahima Ministry', 'mahima-root', 'admin@mahimaministries.in', 'active', true)
ON CONFLICT (slug) DO UPDATE SET is_root_tenant = true, updated_at_utc = now();

INSERT INTO public.module_catalog (code, name, description, monthly_price_inr, is_base_module, enabled, display_order)
VALUES
('base', 'Base Membership', 'Members, roles, attendance, prayer, sermons, landing page basics.', 0, true, true, 10),
('chat', 'Jai Masih Chat', 'Direct and group chat, voice notes, calls, notifications.', 499, false, true, 20),
('payroll', 'Payroll', 'Staff payroll, slips, attendance-based payouts.', 299, false, true, 30),
('accounting', 'Accounting', 'Income, expense, ledgers, reports.', 399, false, true, 40),
('automation', 'Ministry Automation', 'Scheduled ministry messages and AI-assisted drafts.', 299, false, true, 50)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    monthly_price_inr = EXCLUDED.monthly_price_inr,
    is_base_module = EXCLUDED.is_base_module,
    enabled = EXCLUDED.enabled,
    display_order = EXCLUDED.display_order,
    updated_at_utc = now();

INSERT INTO public.subscription_plans (id, code, name, description, monthly_price_inr, is_base_free_plan, enabled, display_order)
VALUES ('00000000-0000-0000-0000-000000000101', 'base-free', 'Base Free', 'Zero-priced plan matching today''s member experience.', 0, true, true, 10)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    monthly_price_inr = EXCLUDED.monthly_price_inr,
    is_base_free_plan = EXCLUDED.is_base_free_plan,
    enabled = EXCLUDED.enabled,
    display_order = EXCLUDED.display_order,
    updated_at_utc = now();

INSERT INTO public.subscription_plan_modules (plan_id, module_code)
VALUES ('00000000-0000-0000-0000-000000000101', 'base')
ON CONFLICT DO NOTHING;

INSERT INTO public.tenant_module_licenses (id, tenant_id, module_code, status, price_inr, source)
VALUES ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'base', 'active', 0, 'base-free')
ON CONFLICT DO NOTHING;

INSERT INTO public.tenant_landing_configs (tenant_id, hero_title, hero_subtitle, contact_email, published)
VALUES ('00000000-0000-0000-0000-000000000001', 'Mahima Ministry', 'Welcome to Mahima Ministry.', 'admin@mahimaministries.in', true)
ON CONFLICT (tenant_id) DO NOTHING;

COMMIT;
