ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE public.warehouses SET sort_order = 1 WHERE name = 'Bensenville';
UPDATE public.warehouses SET sort_order = 2 WHERE name = 'Glendale';
UPDATE public.warehouses SET sort_order = 3 WHERE name = 'Addison';
UPDATE public.warehouses SET sort_order = 4 WHERE name = 'York';

CREATE INDEX IF NOT EXISTS warehouses_sort_order_idx ON public.warehouses(sort_order);