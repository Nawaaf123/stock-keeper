import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchAndFilter } from '@/components/inventory/SearchAndFilter';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { ItemFormDialog } from '@/components/inventory/ItemFormDialog';
import { InventoryItem, SortField, SortDirection } from '@/types/inventory';
import { toast } from 'sonner';

interface InventoryViewProps {
  items: InventoryItem[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onAddItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
  onUpdateItem: (id: string, updates: Partial<InventoryItem>) => void;
  onDeleteItem: (id: string) => void;
}

export function InventoryView({
  items,
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  sortField,
  sortDirection,
  onSort,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: InventoryViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    onDeleteItem(id);
    toast.success('Item deleted successfully');
  };

  const handleSubmit = (data: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    if (editingItem) {
      onUpdateItem(editingItem.id, data);
      toast.success('Item updated successfully');
    } else {
      onAddItem(data);
      toast.success('Item added successfully');
    }
    setEditingItem(null);
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
            Manage your products and stock levels
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
      />

      <InventoryTable
        items={items}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={onSort}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ItemFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        item={editingItem}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
