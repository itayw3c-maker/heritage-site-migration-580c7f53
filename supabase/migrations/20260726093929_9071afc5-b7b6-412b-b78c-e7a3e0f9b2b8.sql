-- posts table
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wp_id integer UNIQUE,
  post_type text NOT NULL DEFAULT 'post',
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  content_html text DEFAULT '',
  excerpt text,
  featured_image text,
  meta_title text,
  meta_description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published')),
  publish_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (post_type IN ('post','page','success','shorts','movie'))
);

GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;

-- admins table
CREATE TABLE public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;

-- is_admin() SECURITY DEFINER to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER posts_set_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- posts: public can read only live published rows
CREATE POLICY "posts_public_read_published"
ON public.posts FOR SELECT
TO anon, authenticated
USING (
  status = 'published'
  AND (publish_at IS NULL OR publish_at <= now())
);

-- posts: admins full access
CREATE POLICY "posts_admin_select"
ON public.posts FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "posts_admin_insert"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "posts_admin_update"
ON public.posts FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "posts_admin_delete"
ON public.posts FOR DELETE
TO authenticated
USING (public.is_admin());

-- admins: only admins can read
CREATE POLICY "admins_admin_select"
ON public.admins FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "admins_admin_insert"
ON public.admins FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "admins_admin_update"
ON public.admins FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "admins_admin_delete"
ON public.admins FOR DELETE
TO authenticated
USING (public.is_admin());