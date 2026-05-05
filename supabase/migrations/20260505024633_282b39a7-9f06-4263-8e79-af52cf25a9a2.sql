WITH tx_signed AS (
  SELECT item_id, warehouse_id,
    SUM(
      CASE
        WHEN type IN ('receive','transfer_in','opening_balance','manual_adjust') THEN quantity
        WHEN type = 'transfer_out' THEN -quantity
        ELSE 0
      END
    ) AS net_tx,
    MIN(created_at) AS min_tx_at
  FROM public.inventory_transactions
  GROUP BY item_id, warehouse_id
),
order_signed AS (
  SELECT oi.item_id, oi.warehouse_id,
    SUM(oi.quantity) AS net_sold,
    MIN(o.created_at) AS min_order_at
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  GROUP BY oi.item_id, oi.warehouse_id
),
combined AS (
  SELECT
    COALESCE(ws.item_id, t.item_id, os.item_id) AS item_id,
    COALESCE(ws.warehouse_id, t.warehouse_id, os.warehouse_id) AS warehouse_id,
    COALESCE(ws.quantity, 0) AS current_qty,
    COALESCE(t.net_tx, 0) AS net_tx,
    COALESCE(os.net_sold, 0) AS net_sold,
    LEAST(
      COALESCE(t.min_tx_at, now()),
      COALESCE(os.min_order_at, now())
    ) AS earliest_activity
  FROM public.warehouse_stock ws
  FULL OUTER JOIN tx_signed t USING (item_id, warehouse_id)
  FULL OUTER JOIN order_signed os USING (item_id, warehouse_id)
)
INSERT INTO public.inventory_transactions (item_id, warehouse_id, quantity, bol_number, type, created_at)
SELECT
  c.item_id,
  c.warehouse_id,
  (c.current_qty - c.net_tx + c.net_sold) AS opening_qty,
  'Opening balance (backfilled)',
  'opening_balance',
  LEAST(c.earliest_activity, COALESCE(i.created_at, c.earliest_activity)) - interval '1 second'
FROM combined c
JOIN public.inventory_items i ON i.id = c.item_id
WHERE (c.current_qty - c.net_tx + c.net_sold) <> 0
  AND NOT EXISTS (
    SELECT 1 FROM public.inventory_transactions x
    WHERE x.item_id = c.item_id
      AND x.warehouse_id = c.warehouse_id
      AND x.type = 'opening_balance'
  );