import { useState, useMemo } from 'react';
import { InventoryItem, SortField, SortDirection, WarehouseStock } from '@/types/inventory';
import { initialInventory, getTotalQuantity, warehouses } from '@/data/mockData';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>(initialInventory);
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
    const warehouseStats = warehouses.map((wh) => {
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
  }, [items]);

  const addItem = (item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'stock'> & { initialStock?: { warehouseId: string; quantity: number }[] }) => {
    const stock: WarehouseStock[] = warehouses.map((wh) => {
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

  const receiveStock = (itemId: string, warehouseId: string, quantity: number) => {
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

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return {
    items: filteredAndSortedItems,
    allItems: items,
    stats,
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
  };
}
