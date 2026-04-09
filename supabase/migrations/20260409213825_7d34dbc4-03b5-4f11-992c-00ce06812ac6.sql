
CREATE TABLE public.sub_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, category_id)
);

ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.sub_categories FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.sub_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.sub_categories FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.sub_categories FOR DELETE USING (true);

CREATE INDEX idx_sub_categories_category_id ON public.sub_categories(category_id);
