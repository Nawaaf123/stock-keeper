-- Add soft-cancel support to orders for permanent audit trail
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_reason text;

-- Index for filtering active vs cancelled orders quickly
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at ON public.orders (cancelled_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON public.inventory_transactions (type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_created ON public.inventory_transactions (item_id, created_at);