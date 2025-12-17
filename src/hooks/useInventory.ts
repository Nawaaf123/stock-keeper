import { useState, useMemo } from 'react';
import { InventoryItem, SortField, SortDirection } from '@/types/inventory';
import { initialInventory } from '@/data/mockData';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>(initialInventory);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
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
          item.sku.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      result = result.filter((item) => item.category === categoryFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
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
  }, [items, searchQuery, categoryFilter, sortField, sortDirection]);

  const stats = useMemo(() => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockItems = items.filter((item) => item.quantity < item.minStock);
    const totalValue = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const uniqueCategories = new Set(items.map((item) => item.category)).size;

    return { totalItems, lowStockItems, totalValue, uniqueCategories };
  }, [items]);

  const addItem = (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: Date.now().toString(),
      lastUpdated: new Date(),
    };
    setItems((prev) => [...prev, newItem]);
  };

  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates, lastUpdated: new Date() } : item
      )
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
    stats,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    sortField,
    sortDirection,
    toggleSort,
    addItem,
    updateItem,
    deleteItem,
  };
}
