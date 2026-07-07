<<<<<<< HEAD
INSERT INTO public.pages (key, name, description, created_at, updated_at)
VALUES ('AUDIT_TRAIL', 'Audit Trail', 'Admin audit log viewer for application actions and entity changes.', now(), now())
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO public.role_permissions (role_id, page_key, created_at)
SELECT r.id, 'AUDIT_TRAIL', now()
=======
INSERT INTO public.pages (key, title, description, created_at, updated_at)
VALUES ('AUDIT_TRAIL', 'Audit Trail', 'Admin audit log viewer for application actions and entity changes.', now(), now())
ON CONFLICT (key) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO public.role_permissions (role_id, page_key)
SELECT r.id, 'AUDIT_TRAIL'
>>>>>>> 6b902a41 (Update Mahima app server files and related changes)
FROM public.roles r
WHERE lower(r.name) = 'admin'
ON CONFLICT DO NOTHING;
