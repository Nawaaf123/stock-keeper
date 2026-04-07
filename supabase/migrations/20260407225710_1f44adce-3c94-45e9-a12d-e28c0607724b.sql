
-- Create warehouses table
CREATE TABLE public.warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'hsl(172, 66%, 40%)',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'hsl(172, 66%, 40%)',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory_items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  sub_category TEXT NOT NULL DEFAULT '',
  min_stock INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create warehouse_stock table (junction: item <-> warehouse)
CREATE TABLE public.warehouse_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_id, warehouse_id)
);

-- Create inventory_transactions table
CREATE TABLE public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  bol_number TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('receive', 'adjust')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wholesalers table
CREATE TABLE public.wholesalers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesalers ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required for inventory tool)
CREATE POLICY "Allow public read" ON public.warehouses FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.warehouses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.warehouses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.warehouses FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.categories FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.inventory_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.inventory_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.inventory_items FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.warehouse_stock FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.warehouse_stock FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.warehouse_stock FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.warehouse_stock FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.inventory_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.inventory_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.inventory_transactions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.inventory_transactions FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.orders FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.order_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.order_items FOR DELETE USING (true);

CREATE POLICY "Allow public read" ON public.wholesalers FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.wholesalers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.wholesalers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.wholesalers FOR DELETE USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_warehouse_stock_updated_at BEFORE UPDATE ON public.warehouse_stock FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wholesalers_updated_at BEFORE UPDATE ON public.wholesalers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_warehouse_stock_item ON public.warehouse_stock(item_id);
CREATE INDEX idx_warehouse_stock_warehouse ON public.warehouse_stock(warehouse_id);
CREATE INDEX idx_inventory_transactions_item ON public.inventory_transactions(item_id);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_item ON public.order_items(item_id);
CREATE INDEX idx_inventory_items_sku ON public.inventory_items(sku);
CREATE INDEX idx_inventory_items_category ON public.inventory_items(category);
