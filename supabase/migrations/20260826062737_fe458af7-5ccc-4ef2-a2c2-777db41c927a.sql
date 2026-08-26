CREATE TABLE public.page_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  page_slug TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_page_ratings_slug ON public.page_ratings(page_slug);

GRANT INSERT, SELECT ON public.page_ratings TO anon;
GRANT INSERT, SELECT ON public.page_ratings TO authenticated;
GRANT ALL ON public.page_ratings TO service_role;

ALTER TABLE public.page_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can rate a page" ON public.page_ratings
  FOR INSERT TO anon, authenticated
  WITH CHECK (rating BETWEEN 1 AND 5 AND page_slug IS NOT NULL);

CREATE POLICY "Anyone can read page ratings" ON public.page_ratings
  FOR SELECT TO anon, authenticated
  USING (true);