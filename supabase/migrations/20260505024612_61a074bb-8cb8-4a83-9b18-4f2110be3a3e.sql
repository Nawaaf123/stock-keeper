ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_type_check;

ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_type_check
  CHECK (type IN ('receive','adjust','transfer_in','transfer_out','opening_balance','manual_adjust'));