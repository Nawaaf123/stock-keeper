CREATE OR REPLACE FUNCTION public.stock_daily_deltas()
RETURNS TABLE(item_id uuid, warehouse_id uuid, day text, delta bigint)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT item_id, warehouse_id,
         to_char((changed_at AT TIME ZONE 'America/Chicago')::date, 'YYYY-MM-DD') AS day,
         SUM(delta)::bigint
  FROM public.stock_audit_log
  GROUP BY 1,2,3
$$;
GRANT EXECUTE ON FUNCTION public.stock_daily_deltas() TO authenticated;