ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS category_id integer NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS posts_category_id_idx ON public.posts (category_id);