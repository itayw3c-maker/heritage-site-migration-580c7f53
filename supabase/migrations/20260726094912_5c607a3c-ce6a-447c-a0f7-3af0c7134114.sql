-- admin_emails allowlist
CREATE TABLE public.admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_emails TO authenticated;
GRANT ALL ON public.admin_emails TO service_role;

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_emails admin all"
ON public.admin_emails FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Enforce lowercase on insert/update
CREATE OR REPLACE FUNCTION public.tg_admin_emails_lower()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.email = lower(NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER admin_emails_lower
BEFORE INSERT OR UPDATE ON public.admin_emails
FOR EACH ROW EXECUTE FUNCTION public.tg_admin_emails_lower();

-- Seed
INSERT INTO public.admin_emails(email) VALUES ('eden@asael.digital')
ON CONFLICT (email) DO NOTHING;

-- Add wp_status to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS wp_status text;

-- Auto-promote to admin on signup if email allowlisted AND email confirmed.
-- Fires on INSERT (already-confirmed at signup) and on UPDATE when email_confirmed_at is set.
CREATE OR REPLACE FUNCTION public.tg_auto_admin_from_allowlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  v_email := lower(NEW.email);
  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;
  -- Only promote after email is confirmed
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.admin_emails WHERE email = v_email) THEN
    INSERT INTO public.admins(user_id, email)
    VALUES (NEW.id, v_email)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_admin_after_insert
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.tg_auto_admin_from_allowlist();

CREATE TRIGGER auto_admin_after_confirm
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.tg_auto_admin_from_allowlist();