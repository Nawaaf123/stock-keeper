import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InventoryItem, Warehouse } from '@/types/inventory';
import { Package, Plus, Trash2 } from 'lucide-react';

interface ProductEntry {
  itemId: string;
  quantity: number;
}

interface ReceiveStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Warehouse[];
  item: InventoryItem | null;
  items?: InventoryItem[];
  onReceive: (itemId: string, warehouseId: string, quantity: number, bolNumber: string, bolDocumentUrl?: string | null) => void;
}

export function ReceiveStockDialog({ open, onOpenChange, warehouses, item, items = [], onReceive }: ReceiveStockDialogProps) {
  const [warehouseId, setWarehouseId] = useState('');
  const [bolNumber, setBolNumber] = useState('');
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([]);
  const [currentItemId, setCurrentItemId] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState(0);
  const productsScrollRef = useRef<HTMLDivElement>(null);

  // If a specific item is passed, use single-item mode
  const isSingleItemMode = !!item;

  useEffect(() => {
    if (productsScrollRef.current) {
      productsScrollRef.current.scrollTop = productsScrollRef.current.scrollHeight;
    }
  }, [productEntries.length]);

  const resetForm = () => {
    setWarehouseId('');
    setBolNumber('');
    setProductEntries([]);
    setCurrentItemId('');
    setCurrentQuantity(0);
  };

  const handleAddProduct = () => {
    if (currentItemId && currentQuantity > 0) {
      const existingIndex = productEntries.findIndex(e => e.itemId === currentItemId);
      if (existingIndex >= 0) {
        const updated = [...productEntries];
        updated[existingIndex].quantity += currentQuantity;
        setProductEntries(updated);
      } else {
        setProductEntries([...productEntries, { itemId: currentItemId, quantity: currentQuantity }]);
      }
      setCurrentItemId('');
      setCurrentQuantity(0);
    }
  };

  const handleRemoveProduct = (index: number) => {
    setProductEntries(productEntries.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSingleItemMode) {
      if (item && warehouseId && currentQuantity > 0 && bolNumber.trim()) {
        onReceive(item.id, warehouseId, currentQuantity, bolNumber.trim(), null);
        onOpenChange(false);
        resetForm();
      }
    } else {
      if (warehouseId && bolNumber.trim() && productEntries.length > 0) {
        productEntries.forEach(entry => {
          onReceive(entry.itemId, warehouseId, entry.quantity, bolNumber.trim(), null);
        });
        onOpenChange(false);
        resetForm();
      }
    }
  };

  const selectedWarehouse = warehouses.find((wh) => wh.id === warehouseId);
  const getItemById = (id: string) => items.find(i => i.id === id);
  const availableItems = items.filter(i => !productEntries.some(e => e.itemId === i.id));

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetForm(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] p-0 sm:p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Receive Stock
          </DialogTitle>
          <DialogDescription>
            {isSingleItemMode ? 'Add incoming inventory to a specific warehouse' : 'Add multiple products from a single BOL'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4" ref={productsScrollRef}>
            <div>
              <Label htmlFor="bolNumber">BOL Number</Label>
              <Input
                id="bolNumber"
                type="text"
                value={bolNumber}
                onChange={(e) => setBolNumber(e.target.value)}
                placeholder="Enter Bill of Lading number"
                required
              />
            </div>

            <div>
              <Label htmlFor="warehouse">Select Warehouse</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isSingleItemMode ? (
              <>
                {item && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="font-semibold text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                  </div>
                )}
                <div>
                  <Label htmlFor="quantity">Quantity to Add</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={currentQuantity || ''}
                    onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 0)}
                    placeholder="Enter quantity"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                {productEntries.length > 0 && (
                  <div className="space-y-2">
                    <Label>Products to Receive</Label>
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                      {productEntries.map((entry, index) => {
                        const product = getItemById(entry.itemId);
                        return (
                          <div key={index} className="flex items-center justify-between bg-background rounded p-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{product?.name}</p>
                              <p className="text-xs text-muted-foreground">SKU: {product?.sku} • Qty: {entry.quantity}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveProduct(index)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedWarehouse && productEntries.length > 0 && (
                  <div className="bg-primary/10 rounded-lg p-3 text-sm border border-primary/20">
                    <p className="font-medium text-primary">
                      {productEntries.length} product(s) will be added to {selectedWarehouse.name}
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Total cases: {productEntries.reduce((sum, e) => sum + e.quantity, 0)}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {!isSingleItemMode && (
            <div className="border-t bg-background px-4 sm:px-6 py-3 shrink-0">
              <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
                <Label className="text-muted-foreground text-xs">Add Product</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Select value={currentItemId} onValueChange={setCurrentItemId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableItems.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">{i.sku}</span>
                              <span>{i.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    value={currentQuantity || ''}
                    onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 0)}
                    placeholder="Qty"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={handleAddProduct}
                  disabled={!currentItemId || currentQuantity <= 0}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Product
                </Button>
              </div>
            </div>
          )}

          <div className="border-t bg-background flex justify-end gap-3 px-4 sm:px-6 py-3 shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !warehouseId ||
                !bolNumber.trim() ||
                (isSingleItemMode ? currentQuantity <= 0 : productEntries.length === 0)
              }
            >
              Receive Stock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
