import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchAndFilter } from '@/components/inventory/SearchAndFilter';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { ItemFormDialog } from '@/components/inventory/ItemFormDialog';
import { ReceiveStockDialog } from '@/components/inventory/ReceiveStockDialog';
import { ProductDetailDialog } from '@/components/inventory/ProductDetailDialog';
import { InventoryItem, SortField, SortDirection } from '@/types/inventory';
import { toast } from 'sonner';

interface InventoryViewProps {
  items: InventoryItem[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  warehouseFilter: string;
  onWarehouseChange: (value: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onAddItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'stock'> & { initialStock?: { warehouseId: string; quantity: number }[] }) => void;
  onUpdateItem: (id: string, updates: Partial<Omit<InventoryItem, 'stock'>>) => void;
  onReceiveStock: (itemId: string, warehouseId: string, quantity: number, bolNumber: string) => void;
  onUpdateStock: (itemId: string, warehouseId: string, newQuantity: number) => void;
  onDeleteItem: (id: string) => void;
}

export function InventoryView({
  items,
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  warehouseFilter,
  onWarehouseChange,
  sortField,
  sortDirection,
  onSort,
  onAddItem,
  onUpdateItem,
  onReceiveStock,
  onUpdateStock,
  onDeleteItem,
}: InventoryViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receivingItem, setReceivingItem] = useState<InventoryItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    onDeleteItem(id);
    toast.success('Item deleted successfully');
  };

  const handleReceiveStock = (item: InventoryItem) => {
    setReceivingItem(item);
    setReceiveDialogOpen(true);
  };

  const handleViewDetails = (item: InventoryItem) => {
    setDetailItem(item);
    setDetailDialogOpen(true);
  };

  const handleSubmit = (data: Omit<InventoryItem, 'id' | 'lastUpdated' | 'stock'> & { initialStock?: { warehouseId: string; quantity: number }[] }) => {
    onAddItem(data);
    toast.success('Item added successfully');
    setEditingItem(null);
  };

  const handleUpdate = (id: string, updates: Partial<Omit<InventoryItem, 'stock'>>) => {
    onUpdateItem(id, updates);
    toast.success('Item updated successfully');
    setEditingItem(null);
  };

  const handleReceive = (itemId: string, warehouseId: string, quantity: number, bolNumber: string) => {
    onReceiveStock(itemId, warehouseId, quantity, bolNumber);
    toast.success(`Added ${quantity} units to inventory (BOL: ${bolNumber})`);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage products across all warehouses
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      <SearchAndFilter
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        categoryFilter={categoryFilter}
        onCategoryChange={onCategoryChange}
        warehouseFilter={warehouseFilter}
        onWarehouseChange={onWarehouseChange}
      />

      <InventoryTable
        items={items}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={onSort}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReceiveStock={handleReceiveStock}
        onViewDetails={handleViewDetails}
      />

      <ItemFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        item={editingItem}
        onSubmit={handleSubmit}
        onUpdate={handleUpdate}
      />

      <ReceiveStockDialog
        open={receiveDialogOpen}
        onOpenChange={setReceiveDialogOpen}
        item={receivingItem}
        onReceive={handleReceive}
      />

      <ProductDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        item={detailItem}
        onUpdateStock={onUpdateStock}
      />
    </div>
  );
}
