-- =============================================================
-- Mahima App — multi-language messaging foundation
-- Adds admin-managed language list (app_languages).
-- Seeds English / Hindi / Punjabi.
-- Adds a LANGUAGES page entry and grants the admin role access.
-- Idempotent: safe to re-run.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.app_languages (
    code            varchar(8)  PRIMARY KEY,         -- ISO 639-1, optionally suffixed (e.g. 'en', 'hi', 'pa', 'pt-BR')
    name            varchar(80) NOT NULL,            -- English display name, e.g. 'English'
    native_name     varchar(80) NOT NULL,            -- Self-name in that language, e.g. 'हिन्दी'
    enabled         boolean     NOT NULL DEFAULT true,
    is_default      boolean     NOT NULL DEFAULT false,
    display_order   integer     NOT NULL DEFAULT 0,
    rtl             boolean     NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Only one default language at a time
CREATE UNIQUE INDEX IF NOT EXISTS ux_app_languages_one_default
    ON public.app_languages (is_default) WHERE is_default = true;

-- Seed: en (default), hi, pa
INSERT INTO public.app_languages (code, name, native_name, enabled, is_default, display_order, rtl)
VALUES
    ('en', 'English', 'English', true, true,  10, false),
    ('hi', 'Hindi',   'हिन्दी',  true, false, 20, false),
    ('pa', 'Punjabi', 'ਪੰਜਾਬੀ',  true, false, 30, false)
ON CONFLICT (code) DO UPDATE
SET name          = EXCLUDED.name,
    native_name   = EXCLUDED.native_name,
    enabled       = EXCLUDED.enabled,
    display_order = EXCLUDED.display_order,
    rtl           = EXCLUDED.rtl,
    updated_at    = now();

-- Register the admin page so RBAC can gate it
INSERT INTO public.pages (key, title, description, created_at, updated_at)
VALUES ('LANGUAGES', 'Languages', 'Admin-managed language list used for translations and message routing.', now(), now())
ON CONFLICT (key) DO UPDATE
SET title       = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at  = now();

-- Grant LANGUAGES page to the admin role (and any role named 'Admin')
INSERT INTO public.role_permissions (role_id, page_key)
SELECT r.id, 'LANGUAGES'
FROM public.roles r
WHERE LOWER(r.name) IN ('admin', 'administrator')
ON CONFLICT DO NOTHING;
