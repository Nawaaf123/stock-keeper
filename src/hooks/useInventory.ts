import { useState, useMemo } from 'react';
import { InventoryItem, SortField, SortDirection, WarehouseStock, InventoryTransaction, Order, OrderItem, Wholesaler, Warehouse } from '@/types/inventory';
import { initialInventory, getTotalQuantity, warehouses as initialWarehouses } from '@/data/mockData';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>(initialInventory);
  const [warehousesList, setWarehousesList] = useState<Warehouse[]>(initialWarehouses);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      result = result.filter((item) => item.category === categoryFilter);
    }

    // Filter by warehouse (show items that have stock in that warehouse)
    if (warehouseFilter !== 'all') {
      result = result.filter((item) =>
        item.stock.some((s) => s.warehouseId === warehouseFilter && s.quantity > 0)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'quantity':
          comparison = getTotalQuantity(a) - getTotalQuantity(b);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'lastUpdated':
          comparison = a.lastUpdated.getTime() - b.lastUpdated.getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [items, searchQuery, categoryFilter, warehouseFilter, sortField, sortDirection]);

  const stats = useMemo(() => {
    const totalItems = items.reduce((sum, item) => sum + getTotalQuantity(item), 0);
    const lowStockItems = items.filter((item) => getTotalQuantity(item) < item.minStock);
    const totalValue = items.reduce((sum, item) => sum + getTotalQuantity(item) * item.price, 0);
    const uniqueCategories = new Set(items.map((item) => item.category)).size;

    // Per warehouse stats
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

  const addItem = (item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'stock'> & { initialStock?: { warehouseId: string; quantity: number }[] }) => {
    const stock: WarehouseStock[] = warehousesList.map((wh) => {
      const initialQty = item.initialStock?.find((s) => s.warehouseId === wh.id)?.quantity || 0;
      return { warehouseId: wh.id, warehouseName: wh.name, quantity: initialQty };
    });

    const newItem: InventoryItem = {
      ...item,
      id: Date.now().toString(),
      stock,
      lastUpdated: new Date(),
    };
    setItems((prev) => [...prev, newItem]);
  };

  const updateItem = (id: string, updates: Partial<Omit<InventoryItem, 'stock'>>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates, lastUpdated: new Date() } : item
      )
    );
  };

  const receiveStock = (itemId: string, warehouseId: string, quantity: number, bolNumber: string) => {
    const item = items.find(i => i.id === itemId);
    const warehouse = warehousesList.find(w => w.id === warehouseId);
    
    if (item && warehouse) {
      // Add transaction record
      const transaction: InventoryTransaction = {
        id: Date.now().toString(),
        itemId,
        itemName: item.name,
        itemSku: item.sku,
        warehouseId,
        warehouseName: warehouse.name,
        quantity,
        bolNumber,
        date: new Date(),
        type: 'receive',
      };
      setTransactions(prev => [transaction, ...prev]);
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updatedStock = item.stock.map((s) =>
          s.warehouseId === warehouseId
            ? { ...s, quantity: s.quantity + quantity }
            : s
        );
        return { ...item, stock: updatedStock, lastUpdated: new Date() };
      })
    );
  };

  const updateStock = (itemId: string, warehouseId: string, newQuantity: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updatedStock = item.stock.map((s) =>
          s.warehouseId === warehouseId
            ? { ...s, quantity: Math.max(0, newQuantity) }
            : s
        );
        return { ...item, stock: updatedStock, lastUpdated: new Date() };
      })
    );
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const transferStock = (itemId: string, fromWarehouseId: string, toWarehouseId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updatedStock = item.stock.map((s) => {
          if (s.warehouseId === fromWarehouseId) {
            return { ...s, quantity: Math.max(0, s.quantity - quantity) };
          }
          if (s.warehouseId === toWarehouseId) {
            return { ...s, quantity: s.quantity + quantity };
          }
          return s;
        });
        return { ...item, stock: updatedStock, lastUpdated: new Date() };
      })
    );
  };

  const createOrder = (shopName: string, orderItems: { itemId: string; warehouseId: string; quantity: number }[]) => {
    const orderItemsWithDetails: OrderItem[] = orderItems.map(entry => {
      const item = items.find(i => i.id === entry.itemId);
      const warehouse = warehousesList.find(w => w.id === entry.warehouseId);
      return {
        itemId: entry.itemId,
        itemName: item?.name || '',
        itemSku: item?.sku || '',
        warehouseId: entry.warehouseId,
        warehouseName: warehouse?.name || '',
        quantity: entry.quantity,
      };
    });

    const newOrder: Order = {
      id: Date.now().toString(),
      shopName,
      items: orderItemsWithDetails,
      date: new Date(),
      status: 'completed',
    };

    setOrders(prev => [newOrder, ...prev]);

    // Reduce stock for each item
    setItems(prev => {
      return prev.map(item => {
        const orderEntry = orderItems.find(e => e.itemId === item.id);
        if (!orderEntry) return item;
        
        const updatedStock = item.stock.map(s => 
          s.warehouseId === orderEntry.warehouseId
            ? { ...s, quantity: Math.max(0, s.quantity - orderEntry.quantity) }
            : s
        );
        return { ...item, stock: updatedStock, lastUpdated: new Date() };
      });
    });
  };

  const addWholesaler = (wholesaler: Omit<Wholesaler, 'id'>) => {
    const newWholesaler: Wholesaler = {
      ...wholesaler,
      id: Date.now().toString(),
    };
    setWholesalers(prev => [...prev, newWholesaler]);
  };

  const updateWholesaler = (id: string, updates: Partial<Omit<Wholesaler, 'id'>>) => {
    setWholesalers(prev =>
      prev.map(w => (w.id === id ? { ...w, ...updates } : w))
    );
  };

  const deleteWholesaler = (id: string) => {
    setWholesalers(prev => prev.filter(w => w.id !== id));
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const updateWarehouse = (id: string, updates: Partial<Omit<Warehouse, 'id'>>) => {
    setWarehousesList(prev =>
      prev.map(wh => (wh.id === id ? { ...wh, ...updates } : wh))
    );
    // Also update warehouse names in items stock
    if (updates.name) {
      setItems(prev =>
        prev.map(item => ({
          ...item,
          stock: item.stock.map(s =>
            s.warehouseId === id ? { ...s, warehouseName: updates.name! } : s
          ),
        }))
      );
    }
  };

  return {
    items: filteredAndSortedItems,
    allItems: items,
    stats,
    transactions,
    orders,
    wholesalers,
    warehouses: warehousesList,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
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
