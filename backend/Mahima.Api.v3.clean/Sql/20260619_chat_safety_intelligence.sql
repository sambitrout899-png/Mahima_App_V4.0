CREATE TABLE IF NOT EXISTS public.chat_safety_alerts (
    id bigserial PRIMARY KEY,
    message_id uuid NOT NULL UNIQUE,
    chat_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    category text NOT NULL,
    severity text NOT NULL,
    alert_level text NOT NULL,
    security_escalation boolean NOT NULL DEFAULT false,
    confidence numeric(5,2) NOT NULL DEFAULT 0,
    summary text NOT NULL,
    evidence_snippet text NULL,
    conversation_snippet text NULL,
    pastor_followup_sent boolean NOT NULL DEFAULT false,
    is_resolved boolean NOT NULL DEFAULT false,
    created_at_utc timestamp with time zone NOT NULL DEFAULT now(),
    resolved_at_utc timestamp with time zone NULL
);

ALTER TABLE public.chat_safety_alerts
    ADD COLUMN IF NOT EXISTS conversation_snippet text NULL,
    ADD COLUMN IF NOT EXISTS security_escalation boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.chat_safety_scans (
    message_id uuid PRIMARY KEY,
    scanned_at_utc timestamp with time zone NOT NULL DEFAULT now(),
    engine text NOT NULL DEFAULT 'rules'
);

CREATE INDEX IF NOT EXISTS ix_chat_safety_alerts_open_level_created
    ON public.chat_safety_alerts(is_resolved, alert_level, created_at_utc DESC);

CREATE INDEX IF NOT EXISTS ix_chat_safety_alerts_sender_created
    ON public.chat_safety_alerts(sender_id, created_at_utc DESC);

INSERT INTO public.chat_safety_scans (message_id, scanned_at_utc, engine)
SELECT m.id, now(), 'system-excluded'
FROM public.messages m
JOIN public.users u ON u.id = m.senderid
WHERE (
    lower(coalesce(u.username, '')) = 'pastor.bot'
    OR upper(coalesce(u."UserCode", '')) = 'BOTPASTOR'
    OR lower(coalesce(u.email, '')) = 'pastor.bot@mahimaministries.local'
    OR lower(coalesce(u.displayname, '')) IN ('ai counseller', 'ai pastor')
)
ON CONFLICT (message_id) DO NOTHING;

UPDATE public.chat_safety_alerts a
SET is_resolved = true,
    resolved_at_utc = COALESCE(a.resolved_at_utc, now()),
    summary = CASE
        WHEN a.summary ILIKE '%Auto-resolved: AI Pastor/system message excluded from safety scan.%' THEN a.summary
        ELSE a.summary || ' (Auto-resolved: AI Pastor/system message excluded from safety scan.)'
    END
FROM public.users u
WHERE a.sender_id = u.id
  AND a.is_resolved = false
  AND (
      lower(coalesce(u.username, '')) = 'pastor.bot'
      OR upper(coalesce(u."UserCode", '')) = 'BOTPASTOR'
      OR lower(coalesce(u.email, '')) = 'pastor.bot@mahimaministries.local'
      OR lower(coalesce(u.displayname, '')) IN ('ai counseller', 'ai pastor')
  );

CREATE TABLE IF NOT EXISTS public.user_access_blocks (
    user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    reason text NULL,
    blocked_by uuid NULL,
    blocked_at_utc timestamp with time zone NOT NULL DEFAULT now(),
    is_active boolean NOT NULL DEFAULT true
);
