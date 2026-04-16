import { useState, useMemo, useEffect, useCallback } from 'react';
import { InventoryItem, SortField, SortDirection, WarehouseStock, InventoryTransaction, Order, OrderItem, Wholesaler, Warehouse } from '@/types/inventory';
import { supabase } from '@/integrations/supabase/client';
import { getTotalQuantity } from '@/data/mockData';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehousesList, setWarehousesList] = useState<Warehouse[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(true);

  // ─── Fetch all data from Supabase ───
  const fetchWarehouses = useCallback(async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    if (data) {
      setWarehousesList(data.map(w => ({ id: w.id, name: w.name, location: w.location, color: w.color })));
    }
  }, []);

  const fetchItems = useCallback(async () => {
    const { data: itemsData } = await supabase.from('inventory_items').select('*');
    const { data: stockData } = await supabase.from('warehouse_stock').select('*, warehouses(name)');
    
    if (itemsData && stockData) {
      const mapped: InventoryItem[] = itemsData.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        subCategory: item.sub_category,
        minStock: item.min_stock,
        price: Number(item.price),
        lastUpdated: new Date(item.updated_at),
        stock: stockData
          .filter(s => s.item_id === item.id)
          .map(s => ({
            warehouseId: s.warehouse_id,
            warehouseName: (s.warehouses as any)?.name || '',
            quantity: s.quantity,
          })),
      }));
      setItems(mapped);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase
      .from('inventory_transactions')
      .select('*, inventory_items(name, sku), warehouses(name)')
      .order('created_at', { ascending: false });
    if (data) {
      setTransactions(data.map(t => ({
        id: t.id,
        itemId: t.item_id,
        itemName: (t.inventory_items as any)?.name || '',
        itemSku: (t.inventory_items as any)?.sku || '',
        warehouseId: t.warehouse_id,
        warehouseName: (t.warehouses as any)?.name || '',
        quantity: t.quantity,
        bolNumber: t.bol_number,
        date: new Date(t.created_at),
        type: t.type as 'receive' | 'adjust',
      })));
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const { data: orderItemsData } = await supabase
      .from('order_items')
      .select('*, inventory_items(name, sku), warehouses(name)');
    
    if (ordersData && orderItemsData) {
      setOrders(ordersData.map(o => ({
        id: o.id,
        shopName: o.shop_name,
        date: new Date(o.created_at),
        status: o.status as 'pending' | 'completed' | 'cancelled',
        items: orderItemsData
          .filter(oi => oi.order_id === o.id)
          .map(oi => ({
            itemId: oi.item_id,
            itemName: (oi.inventory_items as any)?.name || '',
            itemSku: (oi.inventory_items as any)?.sku || '',
            warehouseId: oi.warehouse_id,
            warehouseName: (oi.warehouses as any)?.name || '',
            quantity: oi.quantity,
          })),
      })));
    }
  }, []);

  const fetchWholesalers = useCallback(async () => {
    const { data } = await supabase.from('wholesalers').select('*').order('name');
    if (data) {
      setWholesalers(data.map(w => ({
        id: w.id,
        name: w.name,
        contactPerson: w.contact_person,
        phone: w.phone,
        email: w.email,
        address: w.address,
      })));
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchWarehouses(), fetchItems(), fetchTransactions(), fetchOrders(), fetchWholesalers()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchWarehouses, fetchItems, fetchTransactions, fetchOrders, fetchWholesalers]);

  // ─── Realtime: live sync across all connected users/computers ───
  useEffect(() => {
    // Debounce helper to avoid refetch storms when many rows change at once
    const debounce = (fn: () => void, ms = 200) => {
      let t: ReturnType<typeof setTimeout> | null = null;
      return () => {
        if (t) clearTimeout(t);
        t = setTimeout(fn, ms);
      };
    };

    const refreshItems = debounce(() => { fetchItems(); });
    const refreshTx = debounce(() => { fetchTransactions(); });
    const refreshOrders = debounce(() => { fetchOrders(); fetchItems(); });
    const refreshWholesalers = debounce(() => { fetchWholesalers(); });
    const refreshWarehouses = debounce(() => { fetchWarehouses(); fetchItems(); });

    const channel = supabase
      .channel('inventory-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, refreshItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouse_stock' }, refreshItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_transactions' }, refreshTx)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refreshOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, refreshOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wholesalers' }, refreshWholesalers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouses' }, refreshWarehouses)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchItems, fetchTransactions, fetchOrders, fetchWholesalers, fetchWarehouses]);

  // ─── Filtering & Sorting (client-side on fetched data) ───
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) => item.name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query)
      );
    }
    if (categoryFilter !== 'all') {
      result = result.filter((item) => item.category === categoryFilter);
    }
    if (subCategoryFilter !== 'all') {
      result = result.filter((item) => item.subCategory === subCategoryFilter);
    }
    if (warehouseFilter !== 'all') {
      result = result.filter((item) => item.stock.some((s) => s.warehouseId === warehouseFilter && s.quantity > 0));
    }

    // When filtering by sub-category, always sort by SKU ascending (numeric-aware)
    if (subCategoryFilter !== 'all') {
      result.sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' }));
    } else {
      result.sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'name': comparison = a.name.localeCompare(b.name); break;
          case 'quantity': comparison = getTotalQuantity(a) - getTotalQuantity(b); break;
          case 'price': comparison = a.price - b.price; break;
          case 'lastUpdated': comparison = a.lastUpdated.getTime() - b.lastUpdated.getTime(); break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [items, searchQuery, categoryFilter, subCategoryFilter, warehouseFilter, sortField, sortDirection]);

  // ─── Stats ───
  const stats = useMemo(() => {
    const totalItems = items.reduce((sum, item) => sum + getTotalQuantity(item), 0);
    const lowStockItems = items.filter((item) => getTotalQuantity(item) < item.minStock);
    const totalValue = items.reduce((sum, item) => sum + getTotalQuantity(item) * item.price, 0);
    const uniqueCategories = new Set(items.map((item) => item.category)).size;

    const warehouseStats = warehousesList.map((wh) => {
      const warehouseTotal = items.reduce((sum, item) => {
        const stock = item.stock.find((s) => s.warehouseId === wh.id);
        return sum + (stock?.quantity || 0);
      }, 0);
      const warehouseValue = items.reduce((sum, item) => {
        const stock = item.stock.find((s) => s.warehouseId === wh.id);
        return sum + (stock?.quantity || 0) * item.price;
      }, 0);
      return { ...wh, totalItems: warehouseTotal, totalValue: warehouseValue };
    });

    return { totalItems, lowStockItems, totalValue, uniqueCategories, warehouseStats };
  }, [items, warehousesList]);

  // ─── Mutations ───
  const addItem = async (item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'stock'> & { initialStock?: { warehouseId: string; quantity: number }[] }) => {
    const { data: newItem, error } = await supabase
      .from('inventory_items')
      .insert({ name: item.name, sku: item.sku, category: item.category, sub_category: item.subCategory, min_stock: item.minStock, price: item.price })
      .select()
      .single();
    
    if (error || !newItem) {
      console.error('Failed to add item:', error);
      throw error || new Error('Failed to add item');
    }

    // Create warehouse_stock rows for all warehouses
    const stockRows = warehousesList.map(wh => ({
      item_id: newItem.id,
      warehouse_id: wh.id,
      quantity: item.initialStock?.find(s => s.warehouseId === wh.id)?.quantity || 0,
    }));
    await supabase.from('warehouse_stock').insert(stockRows);
    await fetchItems();
  };

  const updateItem = async (id: string, updates: Partial<Omit<InventoryItem, 'stock'>>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.subCategory !== undefined) dbUpdates.sub_category = updates.subCategory;
    if (updates.minStock !== undefined) dbUpdates.min_stock = updates.minStock;
    if (updates.price !== undefined) dbUpdates.price = updates.price;

    await supabase.from('inventory_items').update(dbUpdates).eq('id', id);
    await fetchItems();
  };

  const receiveStock = async (itemId: string, warehouseId: string, quantity: number, bolNumber: string) => {
    // Insert transaction
    await supabase.from('inventory_transactions').insert({
      item_id: itemId,
      warehouse_id: warehouseId,
      quantity,
      bol_number: bolNumber,
      type: 'receive',
    });

    // Update stock quantity
    const { data: existing } = await supabase
      .from('warehouse_stock')
      .select('id, quantity')
      .eq('item_id', itemId)
      .eq('warehouse_id', warehouseId)
      .single();

    if (existing) {
      await supabase.from('warehouse_stock').update({ quantity: existing.quantity + quantity }).eq('id', existing.id);
    } else {
      await supabase.from('warehouse_stock').insert({ item_id: itemId, warehouse_id: warehouseId, quantity });
    }

    await Promise.all([fetchItems(), fetchTransactions()]);
  };

  const updateStock = async (itemId: string, warehouseId: string, newQuantity: number) => {
    await supabase
      .from('warehouse_stock')
      .update({ quantity: Math.max(0, newQuantity) })
      .eq('item_id', itemId)
      .eq('warehouse_id', warehouseId);
    await fetchItems();
  };

  const deleteItem = async (id: string) => {
    await supabase.from('inventory_items').delete().eq('id', id);
    await fetchItems();
  };

  const transferStock = async (itemId: string, fromWarehouseId: string, toWarehouseId: string, quantity: number) => {
    const { data: fromStock } = await supabase
      .from('warehouse_stock')
      .select('id, quantity')
      .eq('item_id', itemId)
      .eq('warehouse_id', fromWarehouseId)
      .single();

    const { data: toStock } = await supabase
      .from('warehouse_stock')
      .select('id, quantity')
      .eq('item_id', itemId)
      .eq('warehouse_id', toWarehouseId)
      .single();

    if (fromStock) {
      await supabase.from('warehouse_stock').update({ quantity: Math.max(0, fromStock.quantity - quantity) }).eq('id', fromStock.id);
    }
    if (toStock) {
      await supabase.from('warehouse_stock').update({ quantity: toStock.quantity + quantity }).eq('id', toStock.id);
    }
    await fetchItems();
  };

  const createOrder = async (shopName: string, orderItems: { itemId: string; warehouseId: string; quantity: number }[]) => {
    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert({ shop_name: shopName, status: 'completed' })
      .select()
      .single();

    if (error || !newOrder) return;

    // Insert order items
    const oiRows = orderItems.map(entry => ({
      order_id: newOrder.id,
      item_id: entry.itemId,
      warehouse_id: entry.warehouseId,
      quantity: entry.quantity,
    }));
    await supabase.from('order_items').insert(oiRows);

    // Reduce stock
    for (const entry of orderItems) {
      const { data: stock } = await supabase
        .from('warehouse_stock')
        .select('id, quantity')
        .eq('item_id', entry.itemId)
        .eq('warehouse_id', entry.warehouseId)
        .single();
      if (stock) {
        await supabase.from('warehouse_stock').update({ quantity: Math.max(0, stock.quantity - entry.quantity) }).eq('id', stock.id);
      }
    }

    await Promise.all([fetchItems(), fetchOrders()]);
  };

  const addWholesaler = async (wholesaler: Omit<Wholesaler, 'id'>) => {
    await supabase.from('wholesalers').insert({
      name: wholesaler.name,
      contact_person: wholesaler.contactPerson,
      phone: wholesaler.phone,
      email: wholesaler.email,
      address: wholesaler.address,
    });
    await fetchWholesalers();
  };

  const updateWholesaler = async (id: string, updates: Partial<Omit<Wholesaler, 'id'>>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.contactPerson !== undefined) dbUpdates.contact_person = updates.contactPerson;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.address !== undefined) dbUpdates.address = updates.address;

    await supabase.from('wholesalers').update(dbUpdates).eq('id', id);
    await fetchWholesalers();
  };

  const deleteWholesaler = async (id: string) => {
    await supabase.from('wholesalers').delete().eq('id', id);
    await fetchWholesalers();
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const updateWarehouse = async (id: string, updates: Partial<Omit<Warehouse, 'id'>>) => {
    await supabase.from('warehouses').update(updates).eq('id', id);
    await Promise.all([fetchWarehouses(), fetchItems()]);
  };

  return {
    items: filteredAndSortedItems,
    allItems: items,
    stats,
    transactions,
    orders,
    wholesalers,
    warehouses: warehousesList,
    loading,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    subCategoryFilter,
    setSubCategoryFilter,
    warehouseFilter,
    setWarehouseFilter,
    sortField,
    sortDirection,
    toggleSort,
    addItem,
    updateItem,
    receiveStock,
    updateStock,
    deleteItem,
    transferStock,
    createOrder,
    addWholesaler,
    updateWholesaler,
    deleteWholesaler,
    updateWarehouse,
  };
}
