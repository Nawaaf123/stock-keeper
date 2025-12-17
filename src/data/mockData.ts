import { InventoryItem, Category, Warehouse } from '@/types/inventory';

export const warehouses: Warehouse[] = [
  { id: 'wh-a', name: 'Warehouse A', location: 'New York', color: 'hsl(172, 66%, 40%)' },
  { id: 'wh-b', name: 'Warehouse B', location: 'Los Angeles', color: 'hsl(221, 83%, 53%)' },
  { id: 'wh-c', name: 'Warehouse C', location: 'Chicago', color: 'hsl(262, 83%, 58%)' },
  { id: 'wh-d', name: 'Warehouse D', location: 'Houston', color: 'hsl(38, 92%, 50%)' },
];

export const categories: Category[] = [
  { id: '1', name: 'Electronics', color: 'hsl(172, 66%, 40%)' },
  { id: '2', name: 'Office Supplies', color: 'hsl(221, 83%, 53%)' },
  { id: '3', name: 'Furniture', color: 'hsl(262, 83%, 58%)' },
  { id: '4', name: 'Raw Materials', color: 'hsl(38, 92%, 50%)' },
];

export const initialInventory: InventoryItem[] = [
  {
    id: '1',
    name: 'Wireless Mouse',
    sku: 'WM-001',
    category: 'Electronics',
    stock: [
      { warehouseId: 'wh-a', warehouseName: 'Warehouse A', quantity: 50 },
      { warehouseId: 'wh-b', warehouseName: 'Warehouse B', quantity: 35 },
      { warehouseId: 'wh-c', warehouseName: 'Warehouse C', quantity: 40 },
      { warehouseId: 'wh-d', warehouseName: 'Warehouse D', quantity: 25 },
    ],
    minStock: 50,
    price: 29.99,
    lastUpdated: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'USB-C Hub',
    sku: 'USB-002',
    category: 'Electronics',
    stock: [
      { warehouseId: 'wh-a', warehouseName: 'Warehouse A', quantity: 15 },
      { warehouseId: 'wh-b', warehouseName: 'Warehouse B', quantity: 8 },
      { warehouseId: 'wh-c', warehouseName: 'Warehouse C', quantity: 0 },
      { warehouseId: 'wh-d', warehouseName: 'Warehouse D', quantity: 0 },
    ],
    minStock: 30,
    price: 49.99,
    lastUpdated: new Date('2024-01-14'),
  },
  {
    id: '3',
    name: 'A4 Paper (500 sheets)',
    sku: 'PAP-001',
    category: 'Office Supplies',
    stock: [
      { warehouseId: 'wh-a', warehouseName: 'Warehouse A', quantity: 100 },
      { warehouseId: 'wh-b', warehouseName: 'Warehouse B', quantity: 50 },
      { warehouseId: 'wh-c', warehouseName: 'Warehouse C', quantity: 30 },
      { warehouseId: 'wh-d', warehouseName: 'Warehouse D', quantity: 20 },
    ],
    minStock: 100,
    price: 8.99,
    lastUpdated: new Date('2024-01-13'),
  },
  {
    id: '4',
    name: 'Ergonomic Chair',
    sku: 'FRN-001',
    category: 'Furniture',
    stock: [
      { warehouseId: 'wh-a', warehouseName: 'Warehouse A', quantity: 5 },
      { warehouseId: 'wh-b', warehouseName: 'Warehouse B', quantity: 3 },
      { warehouseId: 'wh-c', warehouseName: 'Warehouse C', quantity: 2 },
      { warehouseId: 'wh-d', warehouseName: 'Warehouse D', quantity: 2 },
    ],
    minStock: 5,
    price: 299.99,
    lastUpdated: new Date('2024-01-12'),
  },
  {
    id: '5',
    name: 'Steel Rods (1m)',
    sku: 'RAW-001',
    category: 'Raw Materials',
    stock: [
      { warehouseId: 'wh-a', warehouseName: 'Warehouse A', quantity: 0 },
      { warehouseId: 'wh-b', warehouseName: 'Warehouse B', quantity: 5 },
      { warehouseId: 'wh-c', warehouseName: 'Warehouse C', quantity: 3 },
      { warehouseId: 'wh-d', warehouseName: 'Warehouse D', quantity: 0 },
    ],
    minStock: 20,
    price: 15.50,
    lastUpdated: new Date('2024-01-11'),
  },
  {
    id: '6',
    name: 'Mechanical Keyboard',
    sku: 'KB-001',
    category: 'Electronics',
    stock: [
      { warehouseId: 'wh-a', warehouseName: 'Warehouse A', quantity: 20 },
      { warehouseId: 'wh-b', warehouseName: 'Warehouse B', quantity: 10 },
      { warehouseId: 'wh-c', warehouseName: 'Warehouse C', quantity: 10 },
      { warehouseId: 'wh-d', warehouseName: 'Warehouse D', quantity: 5 },
    ],
    minStock: 25,
    price: 89.99,
    lastUpdated: new Date('2024-01-10'),
  },
  {
    id: '7',
    name: 'Standing Desk',
    sku: 'FRN-002',
    category: 'Furniture',
    stock: [
      { warehouseId: 'wh-a', warehouseName: 'Warehouse A', quantity: 1 },
      { warehouseId: 'wh-b', warehouseName: 'Warehouse B', quantity: 1 },
      { warehouseId: 'wh-c', warehouseName: 'Warehouse C', quantity: 1 },
      { warehouseId: 'wh-d', warehouseName: 'Warehouse D', quantity: 0 },
    ],
    minStock: 10,
    price: 549.99,
    lastUpdated: new Date('2024-01-09'),
  },
  {
    id: '8',
    name: 'Sticky Notes Pack',
    sku: 'OFF-002',
    category: 'Office Supplies',
    stock: [
      { warehouseId: 'wh-a', warehouseName: 'Warehouse A', quantity: 200 },
      { warehouseId: 'wh-b', warehouseName: 'Warehouse B', quantity: 150 },
      { warehouseId: 'wh-c', warehouseName: 'Warehouse C', quantity: 100 },
      { warehouseId: 'wh-d', warehouseName: 'Warehouse D', quantity: 50 },
    ],
    minStock: 200,
    price: 4.99,
    lastUpdated: new Date('2024-01-08'),
  },
];

export const getTotalQuantity = (item: InventoryItem): number => {
  return item.stock.reduce((sum, s) => sum + s.quantity, 0);
};
