INSERT INTO public.pages (key, title, description, created_at, updated_at)
VALUES
  ('DASHBOARD', 'Home', 'Main Mahima home screen.', now(), now()),
  ('PASTOR', 'AI Counseller', 'AI Counseller guidance and prayer assistant.', now(), now()),
  ('APP_DOWNLOADS', 'App Downloads', 'Android and iOS app download and upgrade page.', now(), now()),
  ('SERMONS', 'Sermons', 'Sermon library and media page.', now(), now()),
  ('PRAYER_REQUESTS', 'Prayer Requests', 'Prayer request submission and follow-up.', now(), now()),
  ('TASKS', 'Tasks', 'Tasks, assignments, and utilization dashboard.', now(), now()),
  ('USERS', 'Users', 'User account and profile management.', now(), now()),
  ('TEAMS', 'Teams', 'Team and team member management.', now(), now()),
  ('ROLES', 'Roles', 'Role creation and page access assignment.', now(), now()),
  ('PAGES', 'Pages', 'Application page registry.', now(), now()),
  ('ATTENDANCE', 'Attendance', 'Staff attendance and timesheets.', now(), now()),
  ('PAYROLL', 'Payroll', 'Payroll processing and reporting.', now(), now()),
  ('COSTS', 'Costs', 'Income, expense, accounts, and journal entries.', now(), now()),
  ('MARRIAGE', 'Marriage', 'Marriage ministry records and certificates.', now(), now()),
  ('BAPTISM', 'Baptism', 'Baptism records and certificates.', now(), now()),
  ('COUNSELLING', 'Counselling', 'Counselling cases, sessions, and follow-up.', now(), now()),
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
  ('DASHBOARD'),
  ('PASTOR'),
  ('APP_DOWNLOADS'),
  ('SERMONS'),
  ('PRAYER_REQUESTS'),
  ('TASKS'),
  ('USERS'),
  ('TEAMS'),
  ('ROLES'),
  ('PAGES'),
  ('ATTENDANCE'),
  ('PAYROLL'),
  ('COSTS'),
  ('MARRIAGE'),
  ('BAPTISM'),
  ('COUNSELLING'),
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
