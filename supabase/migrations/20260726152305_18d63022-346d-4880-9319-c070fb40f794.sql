-- 1) Replace overly-permissive leads INSERT policy
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
CREATE POLICY "Anyone can submit a lead"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(btrim(name))  BETWEEN 1 AND 200
    AND length(btrim(phone)) BETWEEN 1 AND 50
    AND (email       IS NULL OR length(email)       <= 320)
    AND (damage_type IS NULL OR length(damage_type) <= 200)
    AND (message     IS NULL OR length(message)     <= 5000)
    AND (page_url    IS NULL OR length(page_url)    <= 2048)
    AND (form_name   IS NULL OR length(form_name)   <= 200)
  );

-- 2) Convert is_admin to SECURITY INVOKER
--    Give authenticated users read access to *only their own* admin row so
--    the invoker-mode function can evaluate.
GRANT SELECT ON public.admins TO authenticated;

DROP POLICY IF EXISTS "admins_self_select" ON public.admins;
CREATE POLICY "admins_self_select"
  ON public.admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
$$;