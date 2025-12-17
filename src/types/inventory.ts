export interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: WarehouseStock[];
  minStock: number;
  price: number;
  lastUpdated: Date;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export type SortField = 'name' | 'quantity' | 'price' | 'lastUpdated';
export type SortDirection = 'asc' | 'desc';
