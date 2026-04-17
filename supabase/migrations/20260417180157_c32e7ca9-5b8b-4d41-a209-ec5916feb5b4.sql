
ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS bol_document_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('bol-documents', 'bol-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view BOL documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bol-documents');

CREATE POLICY "Authenticated can upload BOL documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bol-documents');

CREATE POLICY "Authenticated can update BOL documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'bol-documents');

CREATE POLICY "Authenticated can delete BOL documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'bol-documents');
