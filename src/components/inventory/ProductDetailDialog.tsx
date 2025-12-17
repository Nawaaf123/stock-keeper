import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InventoryItem } from '@/types/inventory';
import { warehouses, getTotalQuantity } from '@/data/mockData';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onUpdateStock: (itemId: string, warehouseId: string, newQuantity: number) => void;
}

export function ProductDetailDialog({ open, onOpenChange, item, onUpdateStock }: ProductDetailDialogProps) {
  const [editingWarehouse, setEditingWarehouse] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState(0);

  if (!item) return null;

  const total = getTotalQuantity(item);
  const isLowStock = total < item.minStock;

  const handleSaveStock = (warehouseId: string) => {
    onUpdateStock(item.id, warehouseId, editQuantity);
    setEditingWarehouse(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">SKU</p>
              <p className="font-medium">{item.sku}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium">{item.category}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Price</p>
              <p className="font-medium">{formatCurrency(item.price)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Min Stock Level</p>
              <p className="font-medium">{item.minStock}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Warehouse Stock</h3>
              <div className={cn(
                "text-sm font-medium px-3 py-1 rounded-full",
                isLowStock ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
              )}>
                Total: {total} units
              </div>
            </div>

            <div className="space-y-3">
              {warehouses.map((wh) => {
                const stock = item.stock.find((s) => s.warehouseId === wh.id);
                const qty = stock?.quantity || 0;
                const isEditing = editingWarehouse === wh.id;

                return (
                  <div
                    key={wh.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{wh.name}</p>
                      <p className="text-xs text-muted-foreground">{wh.location}</p>
                    </div>
                    
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(parseInt(e.target.value) || 0)}
                          className="w-20 h-8"
                        />
                        <Button size="sm" onClick={() => handleSaveStock(wh.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingWarehouse(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-xl font-bold",
                          qty === 0 ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {qty}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingWarehouse(wh.id);
                            setEditQuantity(qty);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {isLowStock && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Stock is below minimum level ({item.minStock} units required)
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
