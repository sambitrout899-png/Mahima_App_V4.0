INSERT INTO public.pages (key, title, description, created_at, updated_at)
VALUES
    ('CHAT', 'Jai Masih Chat', 'Direct and group chat, voice notes, calls, notifications, and chat safety.', now(), now()),
    ('SUBSCRIPTIONS', 'Subscriptions', 'Tenant subscription status and package upgrades.', now(), now())
ON CONFLICT (key) DO UPDATE
SET title = excluded.title,
    description = excluded.description,
    updated_at = now();
