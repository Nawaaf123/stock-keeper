export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minStock: number;
  price: number;
  location: string;
  lastUpdated: Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export type SortField = 'name' | 'quantity' | 'price' | 'lastUpdated';
export type SortDirection = 'asc' | 'desc';
