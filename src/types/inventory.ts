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
  subCategory: string;
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

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  bolNumber: string;
  date: Date;
  type: 'receive' | 'adjust';
}

export interface OrderItem {
  itemId: string;
  itemName: string;
  itemSku: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  shopName: string;
  items: OrderItem[];
  date: Date;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface Wholesaler {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  paymentDate: Date;
  method: string;
  note: string;
}
