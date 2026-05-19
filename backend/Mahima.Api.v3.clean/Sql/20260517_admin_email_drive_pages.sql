INSERT INTO public.pages (key, title, description, created_at, updated_at)
VALUES
  ('ADMIN_DASHBOARD', 'Admin Dashboard', 'Executive ministry analytics and admin overview.', now(), now()),
  ('LIVE_USERS', 'Live Users', 'Connected users and app activity monitoring for admins.', now(), now()),
  ('MESSAGE_CENTER', 'Message Center', 'Automated Jai Masih messages, reminders, and ministry scheduling.', now(), now()),
  ('EMAIL_CLIENT', 'Email Client', 'Admin email connectivity, composer, and mailbox settings.', now(), now()),
  ('GOOGLE_DRIVE', 'Google Drive', 'Admin Google Drive upload, download, and file workspace.', now(), now())
ON CONFLICT (key) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO public.role_permissions (role_id, page_key)
SELECT r.id, p.key
FROM public.roles r
CROSS JOIN (VALUES
  ('ADMIN_DASHBOARD'),
  ('LIVE_USERS'),
  ('MESSAGE_CENTER'),
  ('EMAIL_CLIENT'),
  ('GOOGLE_DRIVE')
) AS p(key)
WHERE lower(r.name) = 'admin'
  AND NOT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.page_key = p.key
  );
