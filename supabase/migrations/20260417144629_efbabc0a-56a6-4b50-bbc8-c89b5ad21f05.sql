CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  method TEXT NOT NULL DEFAULT 'cash',
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.payments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.payments FOR DELETE USING (true);

CREATE INDEX idx_payments_order_id ON public.payments(order_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;