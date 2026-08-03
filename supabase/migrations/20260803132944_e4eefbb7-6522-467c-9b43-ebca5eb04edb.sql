ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS h1 text,
  ADD COLUMN IF NOT EXISTS faq_json jsonb,
  ADD COLUMN IF NOT EXISTS schema_jsonld jsonb,
  ADD COLUMN IF NOT EXISTS cta text;

CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_key ON public.posts (slug);
CREATE INDEX IF NOT EXISTS posts_published_idx ON public.posts (status, publish_at DESC);