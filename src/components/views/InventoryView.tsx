import { useState, useRef } from 'react';
import { Plus, PackagePlus, ArrowLeftRight, Pencil, Check, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchAndFilter } from '@/components/inventory/SearchAndFilter';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { ItemFormDialog } from '@/components/inventory/ItemFormDialog';
import { ReceiveStockDialog } from '@/components/inventory/ReceiveStockDialog';
import { ProductDetailDialog } from '@/components/inventory/ProductDetailDialog';
import { TransferStockDialog } from '@/components/inventory/TransferStockDialog';
import { InventoryItem, SortField, SortDirection, Warehouse } from '@/types/inventory';
import { toast } from 'sonner';

interface InventoryViewProps {
  items: InventoryItem[];
  allItems: InventoryItem[];
  warehouses: Warehouse[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  subCategoryFilter: string;
  onSubCategoryChange: (value: string) => void;
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
  onTransferStock: (itemId: string, fromWarehouseId: string, toWarehouseId: string, quantity: number) => void;
  onUpdateWarehouse?: (id: string, updates: Partial<Warehouse>) => void;
}

export function InventoryView({
  items,
  allItems,
  warehouses,
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  subCategoryFilter,
  onSubCategoryChange,
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
  onTransferStock,
  onUpdateWarehouse,
}: InventoryViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receivingItem, setReceivingItem] = useState<InventoryItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [editingWarehouseName, setEditingWarehouseName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          toast.error('CSV file must have a header row and at least one data row');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['name', 'sku', 'category', 'subcategory', 'minstock', 'price'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
          return;
        }

        let importedCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length < headers.length) continue;

          const item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'stock'> = {
            name: values[headers.indexOf('name')] || '',
            sku: values[headers.indexOf('sku')] || '',
            category: values[headers.indexOf('category')] || '',
            subCategory: values[headers.indexOf('subcategory')] || '',
            minStock: parseInt(values[headers.indexOf('minstock')]) || 0,
            price: parseFloat(values[headers.indexOf('price')]) || 0,
          };

          if (item.name && item.sku) {
            onAddItem(item);
            importedCount++;
          }
        }

        toast.success(`Successfully imported ${importedCount} products`);
      } catch (error) {
        toast.error('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleWarehouseEdit = (warehouse: Warehouse) => {
    setEditingWarehouseId(warehouse.id);
    setEditingWarehouseName(warehouse.name);
  };

  const handleWarehouseSave = () => {
    if (editingWarehouseId && onUpdateWarehouse) {
      onUpdateWarehouse(editingWarehouseId, { name: editingWarehouseName });
      toast.success('Warehouse name updated');
    }
    setEditingWarehouseId(null);
    setEditingWarehouseName('');
  };

  const handleWarehouseCancel = () => {
    setEditingWarehouseId(null);
    setEditingWarehouseName('');
  };

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
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <Button variant="outline" onClick={handleImportClick} className="gap-2">
            <Upload className="w-4 h-4" />
            Import Products
          </Button>
          <Button variant="outline" onClick={() => setTransferDialogOpen(true)} className="gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            Transfer Stock
          </Button>
          <Button variant="outline" onClick={() => setReceiveDialogOpen(true)} className="gap-2">
            <PackagePlus className="w-4 h-4" />
            Receive Stock
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Warehouse Name Editor */}
      {onUpdateWarehouse && (
        <div className="bg-card border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Edit Warehouse Names</h3>
          <div className="flex flex-wrap gap-3">
            {warehouses.map((warehouse) => (
              <div key={warehouse.id} className="flex items-center gap-2">
                {editingWarehouseId === warehouse.id ? (
                  <>
                    <Input
                      value={editingWarehouseName}
                      onChange={(e) => setEditingWarehouseName(e.target.value)}
                      className="h-8 w-40"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleWarehouseSave}>
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleWarehouseCancel}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="px-3 py-1.5 bg-muted rounded-md text-sm">{warehouse.name}</span>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleWarehouseEdit(warehouse)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <SearchAndFilter
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        categoryFilter={categoryFilter}
        onCategoryChange={onCategoryChange}
        subCategoryFilter={subCategoryFilter}
        onSubCategoryChange={onSubCategoryChange}
        subCategories={[...new Set(allItems.map(item => item.subCategory).filter(Boolean))]}
        warehouseFilter={warehouseFilter}
        onWarehouseChange={onWarehouseChange}
        warehouses={warehouses}
      />

      <InventoryTable
        items={items}
        warehouses={warehouses}
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
        warehouses={warehouses}
        onSubmit={handleSubmit}
        onUpdate={handleUpdate}
      />

      <ReceiveStockDialog
        open={receiveDialogOpen}
        onOpenChange={(open) => {
          setReceiveDialogOpen(open);
          if (!open) setReceivingItem(null);
        }}
        warehouses={warehouses}
        item={receivingItem}
        items={items}
        onReceive={handleReceive}
      />

      <ProductDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        item={detailItem}
        warehouses={warehouses}
        onUpdateStock={onUpdateStock}
      />

      <TransferStockDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        items={allItems}
        warehouses={warehouses}
        onTransfer={onTransferStock}
      />
    </div>
  );
}
