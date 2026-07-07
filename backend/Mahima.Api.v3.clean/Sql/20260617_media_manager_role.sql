-- Creates the Media Manager role and gives it normal staff access plus media management.
-- Safe to run multiple times.

INSERT INTO public.pages (key, title, description, created_at, updated_at)
VALUES
  ('SERMONS', 'Sermons', 'Sermons, books, articles, and media library.', now(), now())
ON CONFLICT (key) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO public.roles (name, description, created_at, updated_at)
SELECT 'Media Manager',
       'Staff media role with access to upload and manage sermons, books, and articles.',
       now(),
       now()
WHERE NOT EXISTS (
    SELECT 1
    FROM public.roles r
    WHERE regexp_replace(lower(coalesce(r.name, '')), '[^a-z0-9]', '', 'g') = 'mediamanager'
);

UPDATE public.roles
SET description = 'Staff media role with access to upload and manage sermons, books, and articles.',
    updated_at = now()
WHERE regexp_replace(lower(coalesce(name, '')), '[^a-z0-9]', '', 'g') = 'mediamanager';

-- Copy whatever the current Staff role can see, so future staff page choices are preserved.
INSERT INTO public.role_permissions (role_id, page_key)
SELECT media.id, rp.page_key
FROM public.roles media
JOIN public.roles staff
  ON regexp_replace(lower(coalesce(staff.name, '')), '[^a-z0-9]', '', 'g') = 'staff'
JOIN public.role_permissions rp
  ON rp.role_id = staff.id
WHERE regexp_replace(lower(coalesce(media.name, '')), '[^a-z0-9]', '', 'g') = 'mediamanager'
  AND NOT EXISTS (
      SELECT 1
      FROM public.role_permissions existing
      WHERE existing.role_id = media.id
        AND upper(existing.page_key) = upper(rp.page_key)
  );

-- Fallback baseline if the database does not have a Staff role yet.
INSERT INTO public.role_permissions (role_id, page_key)
SELECT media.id, p.key
FROM public.roles media
CROSS JOIN (VALUES
  ('DASHBOARD'),
  ('PASTOR'),
  ('PRAYER_REQUESTS'),
  ('TASKS'),
  ('ATTENDANCE'),
  ('SERMONS')
) AS p(key)
WHERE regexp_replace(lower(coalesce(media.name, '')), '[^a-z0-9]', '', 'g') = 'mediamanager'
  AND NOT EXISTS (
      SELECT 1
      FROM public.role_permissions existing
      WHERE existing.role_id = media.id
        AND upper(existing.page_key) = p.key
  );

-- Media management page is mandatory even if Staff does not have it.
INSERT INTO public.role_permissions (role_id, page_key)
SELECT media.id, 'SERMONS'
FROM public.roles media
WHERE regexp_replace(lower(coalesce(media.name, '')), '[^a-z0-9]', '', 'g') = 'mediamanager'
  AND NOT EXISTS (
      SELECT 1
      FROM public.role_permissions existing
      WHERE existing.role_id = media.id
        AND upper(existing.page_key) = 'SERMONS'
  );
