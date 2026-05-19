CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.ministry_scheduled_message_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_key text NOT NULL,
    scheduled_local_date date NOT NULL,
    sent_at_utc timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ministry_scheduled_message_runs_key_date
    ON public.ministry_scheduled_message_runs (message_key, scheduled_local_date);

CREATE TABLE IF NOT EXISTS public.ministry_automation_settings (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at_utc timestamp with time zone NOT NULL DEFAULT now()
);

INSERT INTO public.ministry_automation_settings (key, value)
VALUES
    ('Enabled', 'true'),
    ('TimeZone', 'Asia/Kolkata'),
    ('DailyWordTime', '06:30'),
    ('WelcomeTime', '07:00'),
    ('NightPrayerTime', '18:30'),
    ('SaturdayReminderTime', '18:00'),
    ('DeliveryWindowMinutes', '90'),
    ('DailyWordEnabled', 'true'),
    ('WelcomeEnabled', 'true'),
    ('NightPrayerEnabled', 'true'),
    ('SaturdayReminderEnabled', 'true')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.users (id, "UserCode", username, email, displayname, role, joindate)
SELECT gen_random_uuid(), 'BOTPASTOR', 'pastor.bot', 'pastor.bot@mahimaministries.local', 'AI Pastor', 'admin', now()
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE username = 'pastor.bot' OR "UserCode" = 'BOTPASTOR'
);
