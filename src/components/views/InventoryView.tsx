import { useState, useRef } from 'react';
import { Plus, PackagePlus, ArrowLeftRight, Pencil, Check, X, Upload, Zap, Download } from 'lucide-react';
import { downloadInventorySheet } from '@/lib/inventorySheet';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SearchAndFilter } from '@/components/inventory/SearchAndFilter';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { InventoryCardList } from '@/components/inventory/InventoryCardList';
import { ItemFormDialog } from '@/components/inventory/ItemFormDialog';

import { ReceiveStockDialog } from '@/components/inventory/ReceiveStockDialog';
import { ProductDetailDialog } from '@/components/inventory/ProductDetailDialog';
import { TransferStockDialog } from '@/components/inventory/TransferStockDialog';
import { InventoryItem, SortField, SortDirection, Warehouse } from '@/types/inventory';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const [quickEdit, setQuickEdit] = useState(false);
  const isMobile = useIsMobile();

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

        if (rows.length === 0) {
          toast.error('File must have a header row and at least one data row');
          return;
        }

        const firstRowKeys = Object.keys(rows[0]).map(k => k.toLowerCase());
        const requiredHeaders = ['name', 'sku', 'category', 'subcategory', 'minstock', 'price'];
        const missingHeaders = requiredHeaders.filter(h => !firstRowKeys.includes(h));

        if (missingHeaders.length > 0) {
          toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
          return;
        }

        const getVal = (row: Record<string, unknown>, key: string) => {
          const found = Object.keys(row).find(k => k.toLowerCase() === key);
          return found ? String(row[found] ?? '') : '';
        };

        let importedCount = 0;
        for (const row of rows) {
          const item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'stock'> = {
            name: getVal(row, 'name'),
            sku: getVal(row, 'sku'),
            category: getVal(row, 'category'),
            subCategory: getVal(row, 'subcategory'),
            minStock: parseInt(getVal(row, 'minstock')) || 0,
            price: parseFloat(getVal(row, 'price')) || 0,
          };

          if (item.name && item.sku) {
            onAddItem(item);
            importedCount++;
          }
        }

        toast.success(`Successfully imported ${importedCount} products`);
      } catch (error) {
        toast.error('Failed to parse file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
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

  const handleSubmit = async (data: Omit<InventoryItem, 'id' | 'lastUpdated' | 'stock'> & { initialStock?: { warehouseId: string; quantity: number }[] }) => {
    try {
      await onAddItem(data);
      toast.success('Item added successfully');
      setEditingItem(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add item');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Omit<InventoryItem, 'stock'>>) => {
    try {
      await onUpdateItem(id, updates);
      toast.success('Item updated successfully');
      setEditingItem(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update item');
    }
  };

  const handleReceive = (itemId: string, warehouseId: string, quantity: number, bolNumber: string) => {
    onReceiveStock(itemId, warehouseId, quantity, bolNumber);
    toast.success(`Added ${quantity} cases to inventory (BOL: ${bolNumber})`);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage products across all warehouses
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.xlsx,.xls"
            className="hidden"
          />
          <Button variant="outline" onClick={handleImportClick} className="gap-2 min-w-0">
            <Upload className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Import</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 min-w-0">
                <Download className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Download PDF</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover">
              <DropdownMenuLabel>Inventory PDF</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await downloadInventorySheet(allItems);
                    toast.success('Inventory PDF downloaded');
                  } catch (err: any) {
                    toast.error(err?.message || 'Failed to generate PDF');
                  }
                }}
              >
                All warehouses (totals)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                By warehouse
              </DropdownMenuLabel>
              {warehouses.map((w) => (
                <DropdownMenuItem
                  key={w.id}
                  onClick={async () => {
                    try {
                      await downloadInventorySheet(allItems, { id: w.id, name: w.name });
                      toast.success(`Inventory PDF (${w.name}) downloaded`);
                    } catch (err: any) {
                      toast.error(err?.message || 'Failed to generate PDF');
                    }
                  }}
                >
                  {w.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setTransferDialogOpen(true)} className="gap-2 min-w-0">
            <ArrowLeftRight className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Transfer</span>
          </Button>
          <Button variant="outline" onClick={() => setReceiveDialogOpen(true)} className="gap-2 min-w-0">
            <PackagePlus className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Receive</span>
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 min-w-0">
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Add Item</span>
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
        onCategoryChange={(value) => {
          onCategoryChange(value);
          if (subCategoryFilter !== 'all') onSubCategoryChange('all');
        }}
        subCategoryFilter={subCategoryFilter}
        onSubCategoryChange={onSubCategoryChange}
        categories={[...new Set(allItems.map(item => item.category).filter(Boolean))]}
        subCategories={[...new Set(
          allItems
            .filter(item => categoryFilter === 'all' || item.category === categoryFilter)
            .map(item => item.subCategory)
            .filter(Boolean)
        )]}
        warehouseFilter={warehouseFilter}
        onWarehouseChange={onWarehouseChange}
        warehouses={warehouses}
      />

      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-card">
          <Zap className={`h-4 w-4 ${quickEdit ? 'text-primary' : 'text-muted-foreground'}`} />
          <Label htmlFor="quick-edit-inv" className="text-sm cursor-pointer">
            Quick stock edit
          </Label>
          <Switch id="quick-edit-inv" checked={quickEdit} onCheckedChange={setQuickEdit} />
        </div>
        {quickEdit && (
          <p className="text-xs text-muted-foreground hidden sm:block">
            Click any warehouse quantity to edit. Enter saves, Esc cancels.
          </p>
        )}
      </div>

      {quickEdit && (
        <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-md px-3 py-2 sm:hidden">
          Click any warehouse quantity to edit. Sets stock directly — use Receive later for proper BOL tracking.
        </div>
      )}

      {isMobile ? (
        <InventoryCardList
          items={items}
          warehouses={warehouses}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReceiveStock={handleReceiveStock}
          onViewDetails={handleViewDetails}
        />
      ) : (
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
          quickEdit={quickEdit}
          onUpdateStock={onUpdateStock}
        />
      )}

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
