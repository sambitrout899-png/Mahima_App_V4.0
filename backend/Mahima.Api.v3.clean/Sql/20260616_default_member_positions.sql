BEGIN;

CREATE TABLE IF NOT EXISTS public.positions (
    id bigserial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text NULL,
    parent_position_id bigint NULL REFERENCES public.positions(id) ON DELETE SET NULL,
    visibility_scope text NOT NULL DEFAULT 'My',
    is_active boolean NOT NULL DEFAULT true,
    created_at_utc timestamp with time zone NOT NULL DEFAULT now(),
    updated_at_utc timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_positions (
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    position_id bigint NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
    is_primary boolean NOT NULL DEFAULT false,
    assigned_at_utc timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, position_id)
);

CREATE INDEX IF NOT EXISTS ix_positions_parent ON public.positions(parent_position_id);
CREATE INDEX IF NOT EXISTS ix_user_positions_user ON public.user_positions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_positions_primary ON public.user_positions(user_id) WHERE is_primary;

UPDATE public.positions
SET description = COALESCE(description, 'Default personal data visibility for ordinary members.'),
    visibility_scope = 'My',
    is_active = true,
    updated_at_utc = now()
WHERE lower(name) = lower('Member');

INSERT INTO public.positions (name, description, visibility_scope, is_active)
SELECT 'Member', 'Default personal data visibility for ordinary members.', 'My', true
WHERE NOT EXISTS (
    SELECT 1
    FROM public.positions
    WHERE lower(name) = lower('Member')
);

WITH member_position AS (
    SELECT id
    FROM public.positions
    WHERE lower(name) = lower('Member')
    LIMIT 1
),
unassigned_users AS (
    SELECT u.id
    FROM public.users u
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.user_positions up
        WHERE up.user_id = u.id
    )
)
INSERT INTO public.user_positions (user_id, position_id, is_primary, assigned_at_utc)
SELECT u.id, mp.id, true, now()
FROM unassigned_users u
CROSS JOIN member_position mp
ON CONFLICT (user_id, position_id) DO NOTHING;

COMMIT;
