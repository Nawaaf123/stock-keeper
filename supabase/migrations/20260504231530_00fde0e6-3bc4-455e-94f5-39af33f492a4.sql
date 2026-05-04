-- 1) De-duplicate any existing duplicate (item_id, warehouse_id) rows by summing into the oldest row
WITH dups AS (
  SELECT
    item_id,
    warehouse_id,
    (array_agg(id ORDER BY updated_at))[1] AS keep_id,
    SUM(quantity)::int AS total_qty
  FROM public.warehouse_stock
  GROUP BY item_id, warehouse_id
  HAVING COUNT(*) > 1
)
UPDATE public.warehouse_stock ws
SET quantity = d.total_qty
FROM dups d
WHERE ws.id = d.keep_id;

DELETE FROM public.warehouse_stock ws
USING (
  SELECT
    item_id,
    warehouse_id,
    (array_agg(id ORDER BY updated_at))[1] AS keep_id
  FROM public.warehouse_stock
  GROUP BY item_id, warehouse_id
  HAVING COUNT(*) > 1
) d
WHERE ws.item_id = d.item_id
  AND ws.warehouse_id = d.warehouse_id
  AND ws.id <> d.keep_id;

-- 2) Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS warehouse_stock_item_warehouse_uniq
  ON public.warehouse_stock (item_id, warehouse_id);

-- 3) Atomic delta RPC
CREATE OR REPLACE FUNCTION public.apply_stock_deltas(_changes jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT
      (elem->>'item_id')::uuid      AS item_id,
      (elem->>'warehouse_id')::uuid AS warehouse_id,
      (elem->>'delta')::int         AS delta
    FROM jsonb_array_elements(_changes) AS elem
  LOOP
    IF rec.delta = 0 THEN CONTINUE; END IF;

    INSERT INTO public.warehouse_stock AS ws (item_id, warehouse_id, quantity, updated_at)
    VALUES (rec.item_id, rec.warehouse_id, GREATEST(0, rec.delta), now())
    ON CONFLICT (item_id, warehouse_id) DO UPDATE
      SET quantity   = GREATEST(0, ws.quantity + rec.delta),
          updated_at = now();
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_stock_deltas(jsonb) TO anon, authenticated, service_role;