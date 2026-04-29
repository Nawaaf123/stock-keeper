import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { InventoryItem, SortField, SortDirection, WarehouseStock, InventoryTransaction, Order, OrderItem, Wholesaler, Warehouse, Payment } from '@/types/inventory';
import { supabase } from '@/integrations/supabase/client';
import { getTotalQuantity } from '@/data/mockData';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehousesList, setWarehousesList] = useState<Warehouse[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(true);

  // Keep latest warehouses/items in refs so fetchers can join client-side without re-creating callbacks
  const warehousesRef = useRef<Warehouse[]>([]);
  const itemsRef = useRef<InventoryItem[]>([]);
  warehousesRef.current = warehousesList;
  itemsRef.current = items;

  // ─── Fetchers (lean: no nested joins; resolve names client-side) ───
  const fetchWarehouses = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('warehouses')
      .select('id,name,location,color,sort_order')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (data) setWarehousesList(data.map((w: any) => ({
      id: w.id, name: w.name, location: w.location, color: w.color, sortOrder: w.sort_order ?? 0,
    })));
  }, []);

  const fetchItems = useCallback(async () => {
    const [itemsRes, stockRes] = await Promise.all([
      supabase.from('inventory_items').select('id,name,sku,category,sub_category,min_stock,price,updated_at'),
      supabase.from('warehouse_stock').select('item_id,warehouse_id,quantity'),
    ]);
    const itemsData = itemsRes.data;
    const stockData = stockRes.data;
    if (!itemsData || !stockData) return;

    const whName = new Map(warehousesRef.current.map(w => [w.id, w.name]));
    // Group stock by item_id once
    const stockByItem = new Map<string, WarehouseStock[]>();
    for (const s of stockData) {
      const arr = stockByItem.get(s.item_id) || [];
      arr.push({
        warehouseId: s.warehouse_id,
        warehouseName: whName.get(s.warehouse_id) || '',
        quantity: s.quantity,
      });
      stockByItem.set(s.item_id, arr);
    }
    setItems(itemsData.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      subCategory: item.sub_category,
      minStock: item.min_stock,
      price: Number(item.price),
      lastUpdated: new Date(item.updated_at),
      stock: stockByItem.get(item.id) || [],
    })));
  }, []);

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase
      .from('inventory_transactions')
      .select('id,item_id,warehouse_id,quantity,bol_number,bol_document_url,created_at,type')
      .order('created_at', { ascending: false })
      .limit(500);
    if (!data) return;
    const whName = new Map(warehousesRef.current.map(w => [w.id, w.name]));
    const itemMap = new Map(itemsRef.current.map(i => [i.id, i]));
    setTransactions(data.map(t => ({
      id: t.id,
      itemId: t.item_id,
      itemName: itemMap.get(t.item_id)?.name || '',
      itemSku: itemMap.get(t.item_id)?.sku || '',
      warehouseId: t.warehouse_id,
      warehouseName: whName.get(t.warehouse_id) || '',
      quantity: t.quantity,
      bolNumber: t.bol_number,
      bolDocumentUrl: (t as any).bol_document_url ?? null,
      date: new Date(t.created_at),
      type: t.type as 'receive' | 'adjust',
    })));
  }, []);

  const fetchOrders = useCallback(async () => {
    const [ordersRes, oiRes] = await Promise.all([
      supabase.from('orders').select('id,shop_name,status,created_at,shipping_fee').order('created_at', { ascending: false }),
      supabase.from('order_items').select('order_id,item_id,warehouse_id,quantity,unit_price'),
    ]);
    const ordersData = ordersRes.data;
    const orderItemsData = oiRes.data;
    if (!ordersData || !orderItemsData) return;

    const whName = new Map(warehousesRef.current.map(w => [w.id, w.name]));
    const itemMap = new Map(itemsRef.current.map(i => [i.id, i]));
    const itemsByOrder = new Map<string, OrderItem[]>();
    for (const oi of orderItemsData) {
      const arr = itemsByOrder.get(oi.order_id) || [];
      const it = itemMap.get(oi.item_id);
      arr.push({
        itemId: oi.item_id,
        itemName: it?.name || '',
        itemSku: it?.sku || '',
        warehouseId: oi.warehouse_id,
        warehouseName: whName.get(oi.warehouse_id) || '',
        quantity: oi.quantity,
        unitPrice: Number((oi as any).unit_price ?? 0),
      });
      itemsByOrder.set(oi.order_id, arr);
    }
    setOrders(ordersData.map((o: any) => ({
      id: o.id,
      shopName: o.shop_name,
      date: new Date(o.created_at),
      status: o.status as 'pending' | 'completed' | 'cancelled',
      shippingFee: Number(o.shipping_fee ?? 0),
      items: itemsByOrder.get(o.id) || [],
    })));
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

  const fetchPayments = useCallback(async () => {
    const { data } = await (supabase as any).from('payments').select('*').order('payment_date', { ascending: false });
    if (data) {
      setPayments(data.map((p: any) => ({
        id: p.id,
        orderId: p.order_id,
        amount: Number(p.amount),
        paymentDate: new Date(p.payment_date),
        method: p.method,
        note: p.note,
      })));
    }
  }, []);

  // Initial load — warehouses first, then everything else can join against them
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await fetchWarehouses();
      await Promise.all([fetchItems(), fetchWholesalers(), fetchPayments()]);
      // Transactions/orders need items resolved for names; run after items
      await Promise.all([fetchTransactions(), fetchOrders()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchWarehouses, fetchItems, fetchTransactions, fetchOrders, fetchWholesalers, fetchPayments]);

  // ─── Realtime: debounced, coalesced refetches ───
  useEffect(() => {
    const debounce = (fn: () => void, ms = 400) => {
      let t: ReturnType<typeof setTimeout> | null = null;
      return () => {
        if (t) clearTimeout(t);
        t = setTimeout(fn, ms);
      };
    };

    const refreshItems = debounce(() => { fetchItems(); }, 300);
    const refreshTx = debounce(() => { fetchTransactions(); }, 300);
    const refreshOrders = debounce(() => { fetchOrders(); }, 300);
    const refreshWholesalers = debounce(() => { fetchWholesalers(); }, 300);
    const refreshWarehouses = debounce(() => { fetchWarehouses().then(fetchItems); }, 300);
    const refreshPayments = debounce(() => { fetchPayments(); }, 300);

    const refreshAll = () => {
      fetchItems();
      fetchTransactions();
      fetchOrders();
      fetchWholesalers();
      fetchPayments();
      fetchWarehouses();
    };

    const channel = supabase
      .channel(`inventory-realtime-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, refreshItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouse_stock' }, refreshItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_transactions' }, refreshTx)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refreshOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, refreshOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wholesalers' }, refreshWholesalers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouses' }, refreshWarehouses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, refreshPayments)
      .subscribe((status) => {
        // When (re)subscribed, sync immediately to catch anything missed while disconnected
        if (status === 'SUBSCRIBED') refreshAll();
      });

    // Safety net: refetch when the tab becomes visible / window regains focus / network reconnects
    const onVisible = () => { if (document.visibilityState === 'visible') refreshAll(); };
    const onFocus = () => refreshAll();
    const onOnline = () => refreshAll();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);

    // Background poll every 15s as a last-resort safety net for missed realtime events
    const pollId = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshAll();
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.clearInterval(pollId);
    };
  }, [fetchItems, fetchTransactions, fetchOrders, fetchWholesalers, fetchWarehouses, fetchPayments]);

  // ─── Filtering & Sorting ───
  const filteredAndSortedItems = useMemo(() => {
    let result = items;

    if (searchQuery || categoryFilter !== 'all' || subCategoryFilter !== 'all' || warehouseFilter !== 'all') {
      const query = searchQuery.toLowerCase();
      result = items.filter((item) => {
        if (searchQuery && !(item.name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query))) return false;
        if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
        if (subCategoryFilter !== 'all' && item.subCategory !== subCategoryFilter) return false;
        if (warehouseFilter !== 'all' && !item.stock.some((s) => s.warehouseId === warehouseFilter && s.quantity > 0)) return false;
        return true;
      });
    }

    const sorted = [...result];
    if (subCategoryFilter !== 'all') {
      sorted.sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' }));
    } else {
      sorted.sort((a, b) => {
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
    return sorted;
  }, [items, searchQuery, categoryFilter, subCategoryFilter, warehouseFilter, sortField, sortDirection]);

  // ─── Stats ───
  const stats = useMemo(() => {
    let totalItems = 0;
    let totalValue = 0;
    const categories = new Set<string>();
    const lowStockItems: InventoryItem[] = [];
    const whTotals = new Map<string, { qty: number; val: number }>();

    for (const item of items) {
      let itemTotal = 0;
      for (const s of item.stock) {
        itemTotal += s.quantity;
        const cur = whTotals.get(s.warehouseId) || { qty: 0, val: 0 };
        cur.qty += s.quantity;
        cur.val += s.quantity * item.price;
        whTotals.set(s.warehouseId, cur);
      }
      totalItems += itemTotal;
      totalValue += itemTotal * item.price;
      categories.add(item.category);
      if (itemTotal < item.minStock) lowStockItems.push(item);
    }

    const warehouseStats = warehousesList.map((wh) => {
      const t = whTotals.get(wh.id) || { qty: 0, val: 0 };
      return { ...wh, totalItems: t.qty, totalValue: t.val };
    });

    return { totalItems, lowStockItems, totalValue, uniqueCategories: categories.size, warehouseStats };
  }, [items, warehousesList]);

  // ─── Mutations (rely on realtime for refresh; only refetch when realtime can't catch up) ───
  const addItem = async (item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'stock'> & { initialStock?: { warehouseId: string; quantity: number }[] }) => {
    const { data: newItem, error } = await supabase
      .from('inventory_items')
      .insert({ name: item.name, sku: item.sku, category: item.category, sub_category: item.subCategory, min_stock: item.minStock, price: item.price })
      .select()
      .single();
    if (error || !newItem) throw error || new Error('Failed to add item');

    const stockRows = warehousesList.map(wh => ({
      item_id: newItem.id,
      warehouse_id: wh.id,
      quantity: item.initialStock?.find(s => s.warehouseId === wh.id)?.quantity || 0,
    }));
    if (stockRows.length > 0) await supabase.from('warehouse_stock').insert(stockRows);
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
  };

  const receiveStock = async (itemId: string, warehouseId: string, quantity: number, bolNumber: string, bolDocumentUrl?: string | null) => {
    await supabase.from('inventory_transactions').insert({
      item_id: itemId,
      warehouse_id: warehouseId,
      quantity,
      bol_number: bolNumber,
      bol_document_url: bolDocumentUrl ?? null,
      type: 'receive',
    } as any);

    const { data: existing } = await supabase
      .from('warehouse_stock')
      .select('id, quantity')
      .eq('item_id', itemId)
      .eq('warehouse_id', warehouseId)
      .maybeSingle();

    if (existing) {
      await supabase.from('warehouse_stock').update({ quantity: existing.quantity + quantity }).eq('id', existing.id);
    } else {
      await supabase.from('warehouse_stock').insert({ item_id: itemId, warehouse_id: warehouseId, quantity });
    }
  };

  const updateStock = async (itemId: string, warehouseId: string, newQuantity: number) => {
    const qty = Math.max(0, newQuantity);
    // Optimistic local update
    setItems(prev => prev.map(it => {
      if (it.id !== itemId) return it;
      const exists = it.stock.some(s => s.warehouseId === warehouseId);
      const stock = exists
        ? it.stock.map(s => s.warehouseId === warehouseId ? { ...s, quantity: qty } : s)
        : [...it.stock, { warehouseId, warehouseName: warehousesRef.current.find(w => w.id === warehouseId)?.name || '', quantity: qty }];
      return { ...it, stock };
    }));

    const { data: existing } = await supabase
      .from('warehouse_stock')
      .select('id')
      .eq('item_id', itemId)
      .eq('warehouse_id', warehouseId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('warehouse_stock').update({ quantity: qty }).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('warehouse_stock').insert({ item_id: itemId, warehouse_id: warehouseId, quantity: qty });
      if (error) throw error;
    }
  };

  const deleteItem = async (id: string) => {
    await supabase.from('inventory_items').delete().eq('id', id);
  };

  const transferStock = async (itemId: string, fromWarehouseId: string, toWarehouseId: string, quantity: number) => {
    const [fromRes, toRes] = await Promise.all([
      supabase.from('warehouse_stock').select('id, quantity').eq('item_id', itemId).eq('warehouse_id', fromWarehouseId).maybeSingle(),
      supabase.from('warehouse_stock').select('id, quantity').eq('item_id', itemId).eq('warehouse_id', toWarehouseId).maybeSingle(),
    ]);
    const ops: Promise<any>[] = [];
    if (fromRes.data) ops.push(Promise.resolve(supabase.from('warehouse_stock').update({ quantity: Math.max(0, fromRes.data.quantity - quantity) }).eq('id', fromRes.data.id)));
    if (toRes.data) ops.push(Promise.resolve(supabase.from('warehouse_stock').update({ quantity: toRes.data.quantity + quantity }).eq('id', toRes.data.id)));
    else ops.push(Promise.resolve(supabase.from('warehouse_stock').insert({ item_id: itemId, warehouse_id: toWarehouseId, quantity })));
    await Promise.all(ops);
  };

  const createOrder = async (shopName: string, orderItems: { itemId: string; warehouseId: string; quantity: number; unitPrice: number }[]) => {
    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert({ shop_name: shopName, status: 'completed' })
      .select()
      .single();
    if (error || !newOrder) return;

    const oiRows = orderItems.map(entry => ({
      order_id: newOrder.id,
      item_id: entry.itemId,
      warehouse_id: entry.warehouseId,
      quantity: entry.quantity,
      unit_price: entry.unitPrice,
    }));
    await supabase.from('order_items').insert(oiRows);

    // Fetch all impacted stock rows in parallel
    const stockResults = await Promise.all(orderItems.map(entry =>
      supabase.from('warehouse_stock').select('id, quantity').eq('item_id', entry.itemId).eq('warehouse_id', entry.warehouseId).maybeSingle()
    ));
    await Promise.all(stockResults.map((res, i) => {
      const entry = orderItems[i];
      if (res.data) return supabase.from('warehouse_stock').update({ quantity: Math.max(0, res.data.quantity - entry.quantity) }).eq('id', res.data.id);
      return Promise.resolve();
    }));

    return newOrder.id as string;
  };

  const adjustStockBy = async (itemId: string, warehouseId: string, delta: number) => {
    const { data: existing } = await supabase
      .from('warehouse_stock')
      .select('id, quantity')
      .eq('item_id', itemId)
      .eq('warehouse_id', warehouseId)
      .maybeSingle();
    if (existing) {
      return supabase.from('warehouse_stock').update({ quantity: Math.max(0, existing.quantity + delta) }).eq('id', existing.id);
    } else if (delta > 0) {
      return supabase.from('warehouse_stock').insert({ item_id: itemId, warehouse_id: warehouseId, quantity: delta });
    }
  };

  // Aggregate multiple stock changes by (item, warehouse) and apply each row ONCE.
  // Avoids race conditions where parallel SELECT→UPDATE on the same row drops deltas
  // or (in some sequences) double-applies them.
  const applyStockDeltas = async (
    changes: { itemId: string; warehouseId: string; delta: number }[]
  ) => {
    const key = (i: string, w: string) => `${i}::${w}`;
    const merged = new Map<string, { itemId: string; warehouseId: string; delta: number }>();
    for (const c of changes) {
      const k = key(c.itemId, c.warehouseId);
      const cur = merged.get(k);
      if (cur) cur.delta += c.delta;
      else merged.set(k, { ...c });
    }
    // Run sequentially per row to prevent read/modify/write races.
    for (const d of merged.values()) {
      if (d.delta === 0) continue;
      await adjustStockBy(d.itemId, d.warehouseId, d.delta);
    }
  };

  // ─── Receivings (grouped by BOL number) ───
  const deleteReceiving = async (bolNumber: string) => {
    const lines = transactions.filter(t => t.bolNumber === bolNumber);
    if (lines.length === 0) return;
    // Reverse stock — aggregate per (item, warehouse) to avoid duplicate/race adjustments
    await applyStockDeltas(lines.map(l => ({ itemId: l.itemId, warehouseId: l.warehouseId, delta: -l.quantity })));
    await supabase.from('inventory_transactions').delete().eq('bol_number', bolNumber);
  };

  const updateReceiving = async (
    bolNumber: string,
    newBolNumber: string,
    newLines: { itemId: string; warehouseId: string; quantity: number }[],
  ) => {
    const oldLines = transactions.filter(t => t.bolNumber === bolNumber);
    const bolDocumentUrl = oldLines[0]?.bolDocumentUrl ?? null;

    const key = (i: string, w: string) => `${i}::${w}`;
    const deltas = new Map<string, { itemId: string; warehouseId: string; delta: number }>();
    for (const old of oldLines) {
      const k = key(old.itemId, old.warehouseId);
      const cur = deltas.get(k);
      if (cur) cur.delta -= old.quantity;
      else deltas.set(k, { itemId: old.itemId, warehouseId: old.warehouseId, delta: -old.quantity });
    }
    for (const ni of newLines) {
      const k = key(ni.itemId, ni.warehouseId);
      const cur = deltas.get(k);
      if (cur) cur.delta += ni.quantity;
      else deltas.set(k, { itemId: ni.itemId, warehouseId: ni.warehouseId, delta: ni.quantity });
    }

    await applyStockDeltas(Array.from(deltas.values()));

    // Replace transaction rows for this BOL
    await supabase.from('inventory_transactions').delete().eq('bol_number', bolNumber);
    if (newLines.length > 0) {
      await supabase.from('inventory_transactions').insert(
        newLines.map(ni => ({
          item_id: ni.itemId,
          warehouse_id: ni.warehouseId,
          quantity: ni.quantity,
          bol_number: newBolNumber.trim() || bolNumber,
          bol_document_url: bolDocumentUrl,
          type: 'receive',
        } as any))
      );
    }
  };

  const deleteOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    // Restore stock — aggregate per (item, warehouse) and apply sequentially to
    // avoid parallel SELECT→UPDATE races that can drop or double-apply deltas
    // when the same product+warehouse appears on multiple order lines.
    await applyStockDeltas(order.items.map(line => ({
      itemId: line.itemId, warehouseId: line.warehouseId, delta: line.quantity,
    })));
    await (supabase as any).from('payments').delete().eq('order_id', orderId);
    await supabase.from('order_items').delete().eq('order_id', orderId);
    await supabase.from('orders').delete().eq('id', orderId);
  };

  const updateOrder = async (
    orderId: string,
    shopName: string,
    newItems: { itemId: string; warehouseId: string; quantity: number; unitPrice: number }[]
  ) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Compute net stock delta per (item, warehouse). Positive delta = stock should INCREASE
    // (e.g. removing/reducing an order line returns stock); negative = stock decreases.
    const key = (i: string, w: string) => `${i}::${w}`;
    const deltas = new Map<string, { itemId: string; warehouseId: string; delta: number }>();
    for (const old of order.items) {
      const k = key(old.itemId, old.warehouseId);
      // Old line being removed → stock returns (+)
      deltas.set(k, { itemId: old.itemId, warehouseId: old.warehouseId, delta: old.quantity });
    }
    for (const ni of newItems) {
      const k = key(ni.itemId, ni.warehouseId);
      const cur = deltas.get(k);
      // New line consumes stock (−)
      if (cur) cur.delta -= ni.quantity;
      else deltas.set(k, { itemId: ni.itemId, warehouseId: ni.warehouseId, delta: -ni.quantity });
    }

    // Resolve current quantities locally — no per-row SELECT round-trip
    const itemsNow = itemsRef.current;
    const stockUpdates: { itemId: string; warehouseId: string; newQty: number }[] = [];
    for (const d of deltas.values()) {
      if (d.delta === 0) continue;
      const item = itemsNow.find(i => i.id === d.itemId);
      const current = item?.stock.find(s => s.warehouseId === d.warehouseId)?.quantity || 0;
      stockUpdates.push({ itemId: d.itemId, warehouseId: d.warehouseId, newQty: Math.max(0, current + d.delta) });
    }

    // Optimistic local update so the UI reflects new stock immediately
    if (stockUpdates.length > 0) {
      setItems(prev => prev.map(it => {
        const updates = stockUpdates.filter(u => u.itemId === it.id);
        if (updates.length === 0) return it;
        const stockMap = new Map(it.stock.map(s => [s.warehouseId, s]));
        for (const u of updates) {
          const existing = stockMap.get(u.warehouseId);
          if (existing) stockMap.set(u.warehouseId, { ...existing, quantity: u.newQty });
          else {
            const wh = warehousesRef.current.find(w => w.id === u.warehouseId);
            stockMap.set(u.warehouseId, { warehouseId: u.warehouseId, warehouseName: wh?.name || '', quantity: u.newQty });
          }
        }
        return { ...it, stock: Array.from(stockMap.values()) };
      }));
    }

    // Optimistic order update so the dialog closes against fresh local state
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      shopName,
      items: newItems.map(ni => {
        const item = itemsNow.find(i => i.id === ni.itemId);
        const wh = warehousesRef.current.find(w => w.id === ni.warehouseId);
        return {
          itemId: ni.itemId,
          itemName: item?.name || '',
          itemSku: item?.sku || '',
          warehouseId: ni.warehouseId,
          warehouseName: wh?.name || '',
          quantity: ni.quantity,
          unitPrice: ni.unitPrice,
        };
      }),
    } : o));

    // Fire all DB writes in parallel — single round trip per table
    const ops: PromiseLike<any>[] = [];

    // Bulk update warehouse_stock rows
    for (const u of stockUpdates) {
      ops.push(
        (supabase as any)
          .from('warehouse_stock')
          .update({ quantity: u.newQty })
          .eq('item_id', u.itemId)
          .eq('warehouse_id', u.warehouseId)
      );
    }

    // Replace order_items (delete + insert) and update order shop name in parallel
    ops.push(
      supabase.from('order_items').delete().eq('order_id', orderId).then(() => {
        if (newItems.length === 0) return;
        return supabase.from('order_items').insert(
          newItems.map(ni => ({
            order_id: orderId,
            item_id: ni.itemId,
            warehouse_id: ni.warehouseId,
            quantity: ni.quantity,
            unit_price: ni.unitPrice,
          }))
        );
      })
    );
    ops.push(supabase.from('orders').update({ shop_name: shopName }).eq('id', orderId));

    await Promise.all(ops);
  };

  const addWholesaler = async (wholesaler: Omit<Wholesaler, 'id'>) => {
    await supabase.from('wholesalers').insert({
      name: wholesaler.name,
      contact_person: wholesaler.contactPerson,
      phone: wholesaler.phone,
      email: wholesaler.email,
      address: wholesaler.address,
    });
  };

  const updateWholesaler = async (id: string, updates: Partial<Omit<Wholesaler, 'id'>>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.contactPerson !== undefined) dbUpdates.contact_person = updates.contactPerson;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    await supabase.from('wholesalers').update(dbUpdates).eq('id', id);
  };

  const deleteWholesaler = async (id: string) => {
    await supabase.from('wholesalers').delete().eq('id', id);
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
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
    await supabase.from('warehouses').update(dbUpdates).eq('id', id);
  };

  const reorderWarehouse = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...warehousesRef.current].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(w => w.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    // Optimistic local swap
    setWarehousesList(prev => prev.map(w => {
      if (w.id === a.id) return { ...w, sortOrder: b.sortOrder };
      if (w.id === b.id) return { ...w, sortOrder: a.sortOrder };
      return w;
    }));
    await Promise.all([
      (supabase as any).from('warehouses').update({ sort_order: b.sortOrder }).eq('id', a.id),
      (supabase as any).from('warehouses').update({ sort_order: a.sortOrder }).eq('id', b.id),
    ]);
  };

  const addPayment = async (orderId: string, amount: number, method: string, note: string, paymentDate?: Date) => {
    await (supabase as any).from('payments').insert({
      order_id: orderId,
      amount,
      method,
      note,
      payment_date: (paymentDate ?? new Date()).toISOString(),
    });
  };

  const deletePayment = async (id: string) => {
    await (supabase as any).from('payments').delete().eq('id', id);
  };

  return {
    items: filteredAndSortedItems,
    allItems: items,
    stats,
    transactions,
    orders,
    wholesalers,
    payments,
    addPayment,
    deletePayment,
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
    deleteOrder,
    updateOrder,
    addWholesaler,
    updateWholesaler,
    deleteWholesaler,
    updateWarehouse,
    reorderWarehouse,
    updateReceiving,
    deleteReceiving,
  };
}
