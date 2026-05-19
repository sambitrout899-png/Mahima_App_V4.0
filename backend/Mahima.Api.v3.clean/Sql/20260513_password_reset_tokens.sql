-- Stores password reset tokens issued via /api/auth/forgot-password.
--
-- We never store the raw token. The plaintext token is sent in the reset
-- email; the database holds only a SHA-256 hash of it. When the user clicks
-- the link, the API hashes the token from the URL and looks it up here.
--
-- Tokens auto-expire (expires_at) and are single-use (marked used_at when
-- consumed). A user requesting a fresh link simply gets a new row; the
-- old row remains but is discarded on the next consume attempt.

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id          bigserial PRIMARY KEY,
    user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash  text        NOT NULL,
    expires_at  timestamptz NOT NULL,
    used_at     timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    ip          text
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_password_reset_tokens_hash
    ON public.password_reset_tokens (token_hash);

CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user
    ON public.password_reset_tokens (user_id);
