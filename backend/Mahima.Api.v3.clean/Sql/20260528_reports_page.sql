INSERT INTO public.pages (key, title, description, created_at, updated_at)
VALUES ('REPORTS', 'Reports', 'Custom reporting workbench with slicing, grouping, export, and print.', now(), now())
ON CONFLICT (key) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO public.role_permissions (role_id, page_key)
SELECT r.id, 'REPORTS'
FROM public.roles r
WHERE lower(r.name) = 'admin'
  AND NOT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.page_key = 'REPORTS'
  );
