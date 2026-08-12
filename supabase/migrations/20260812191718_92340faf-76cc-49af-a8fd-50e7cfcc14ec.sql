insert into public.sub_categories (name, category_id)
select 'SWITCH-15000 (CN)', c.id from public.categories c where c.name = 'SWITCH-15000'
and not exists (select 1 from public.sub_categories s where s.name='SWITCH-15000 (CN)' and s.category_id=c.id);

insert into public.inventory_items (name, sku, category, sub_category, min_stock, price)
select i.name, i.sku || '-CN', i.category, 'SWITCH-15000 (CN)', i.min_stock, i.price
from public.inventory_items i
where i.sub_category = 'SWITCH-15000'
and not exists (select 1 from public.inventory_items x where x.sku = i.sku || '-CN');