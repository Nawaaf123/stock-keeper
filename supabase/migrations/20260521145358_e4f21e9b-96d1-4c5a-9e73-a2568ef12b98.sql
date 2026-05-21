
-- 1. Bulletproof audit table: one row per change to warehouse_stock
CREATE TABLE IF NOT EXISTS public.stock_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  old_quantity integer NOT NULL DEFAULT 0,
  new_quantity integer NOT NULL DEFAULT 0,
  delta integer NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_audit_item ON public.stock_audit_log(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_changed_at ON public.stock_audit_log(changed_at DESC);

ALTER TABLE public.stock_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read"   ON public.stock_audit_log FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.stock_audit_log FOR INSERT WITH CHECK (true);

-- 2. Trigger function: log every quantity change
CREATE OR REPLACE FUNCTION public.log_stock_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.quantity <> 0 THEN
      INSERT INTO public.stock_audit_log(item_id, warehouse_id, old_quantity, new_quantity, delta)
      VALUES (NEW.item_id, NEW.warehouse_id, 0, NEW.quantity, NEW.quantity);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.quantity IS DISTINCT FROM OLD.quantity THEN
      INSERT INTO public.stock_audit_log(item_id, warehouse_id, old_quantity, new_quantity, delta)
      VALUES (NEW.item_id, NEW.warehouse_id, OLD.quantity, NEW.quantity, NEW.quantity - OLD.quantity);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.quantity <> 0 THEN
      INSERT INTO public.stock_audit_log(item_id, warehouse_id, old_quantity, new_quantity, delta)
      VALUES (OLD.item_id, OLD.warehouse_id, OLD.quantity, 0, -OLD.quantity);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 3. Attach trigger to warehouse_stock
DROP TRIGGER IF EXISTS trg_log_stock_change ON public.warehouse_stock;
CREATE TRIGGER trg_log_stock_change
AFTER INSERT OR UPDATE OR DELETE ON public.warehouse_stock
FOR EACH ROW EXECUTE FUNCTION public.log_stock_change();
