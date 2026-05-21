UPDATE public.warehouse_stock ws
SET quantity = GREATEST(0, ws.quantity - oi.quantity),
    updated_at = now()
FROM public.order_items oi
WHERE oi.order_id = '753d5de7-c986-41f9-8005-7ce878ef29de'
  AND ws.item_id = oi.item_id
  AND ws.warehouse_id = oi.warehouse_id;