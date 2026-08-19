-- 1. Lock down all public-facing tables to signed-in users only
DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'categories','sub_categories','inventory_items','inventory_transactions',
    'order_items','orders','payments','stock_audit_log','warehouse_stock',
    'warehouses','wholesalers'
  ]
  LOOP
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;

    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

CREATE POLICY "Authenticated full access" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.sub_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.inventory_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.inventory_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.warehouse_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.warehouses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.wholesalers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Audit log stays append-only and read-only for signed-in staff
REVOKE UPDATE, DELETE ON public.stock_audit_log FROM authenticated;
CREATE POLICY "Authenticated can read audit log" ON public.stock_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can append audit log" ON public.stock_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- 2. SECURITY DEFINER trigger function must not be callable through the API
REVOKE ALL ON FUNCTION public.log_stock_change() FROM anon, authenticated, public;

-- 3. BOL documents: uploader-scoped writes, signed-in-only reads
DROP POLICY IF EXISTS "Public can view BOL documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload BOL documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update BOL documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete BOL documents" ON storage.objects;

CREATE POLICY "Signed-in can view BOL documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bol-documents');

CREATE POLICY "Signed-in can upload own BOL documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bol-documents' AND owner = auth.uid());

CREATE POLICY "Uploader can update own BOL documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bol-documents' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'bol-documents' AND owner = auth.uid());

CREATE POLICY "Uploader can delete own BOL documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bol-documents' AND owner = auth.uid());