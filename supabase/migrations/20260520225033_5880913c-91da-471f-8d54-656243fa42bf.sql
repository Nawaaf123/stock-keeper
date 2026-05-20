
WITH neg AS (
  SELECT item_id, warehouse_id, SUM(quantity) AS neg_sum
  FROM public.inventory_transactions
  WHERE type='opening_balance' AND quantity < 0
  GROUP BY item_id, warehouse_id
),
adj AS (
  SELECT item_id, warehouse_id, SUM(quantity) AS adj_sum
  FROM public.inventory_transactions
  WHERE type='manual_adjust'
  GROUP BY item_id, warehouse_id
),
pairs AS (
  SELECT n.item_id, n.warehouse_id
  FROM neg n
  JOIN adj a ON a.item_id=n.item_id AND a.warehouse_id=n.warehouse_id
  WHERE n.neg_sum + a.adj_sum = 0
)
DELETE FROM public.inventory_transactions t
USING pairs p
WHERE t.item_id = p.item_id
  AND t.warehouse_id = p.warehouse_id
  AND (
    (t.type='opening_balance' AND t.quantity < 0)
    OR t.type='manual_adjust'
  );
