ALTER TABLE public.inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_type_check;
ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_type_check
  CHECK (type = ANY (ARRAY['receive','adjust','transfer_in','transfer_out','opening_balance','manual_adjust','order_cancelled']));

-- Backfill missing cancellation entries for orders already cancelled
INSERT INTO public.inventory_transactions (item_id, warehouse_id, quantity, bol_number, type, created_at)
SELECT oi.item_id, oi.warehouse_id, oi.quantity,
       'Order cancelled — ' || o.shop_name,
       'order_cancelled',
       COALESCE(o.cancelled_at, now())
FROM public.orders o
JOIN public.order_items oi ON oi.order_id = o.id
WHERE o.status = 'cancelled'
  AND NOT EXISTS (
    SELECT 1 FROM public.inventory_transactions t
    WHERE t.type = 'order_cancelled'
      AND t.item_id = oi.item_id
      AND t.warehouse_id = oi.warehouse_id
      AND t.bol_number = 'Order cancelled — ' || o.shop_name
      AND t.created_at = COALESCE(o.cancelled_at, t.created_at)
  );