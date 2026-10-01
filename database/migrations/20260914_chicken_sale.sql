CREATE TABLE IF NOT EXISTS public.chicken_sale_access (
 user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
 assigned_by uuid NOT NULL REFERENCES public.users(id),
 assigned_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.chicken_sale_days (
 business_date date PRIMARY KEY,
 version integer NOT NULL DEFAULT 1,
 document jsonb NOT NULL,
 updated_by uuid NOT NULL REFERENCES public.users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.chicken_sale_audit (
 id bigserial PRIMARY KEY,
 actor_id uuid NOT NULL REFERENCES public.users(id),
 action text NOT NULL,
 details jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
