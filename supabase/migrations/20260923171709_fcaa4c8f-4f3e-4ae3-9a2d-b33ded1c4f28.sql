CREATE TABLE public.stock_change_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  delta integer NOT NULL,
  label text NOT NULL,
  original_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_change_notes TO authenticated;
GRANT ALL ON public.stock_change_notes TO service_role;
ALTER TABLE public.stock_change_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read notes" ON public.stock_change_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can add notes" ON public.stock_change_notes FOR INSERT TO authenticated WITH CHECK (true);