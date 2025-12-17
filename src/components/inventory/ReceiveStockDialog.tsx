import { useState } from 'react';
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
import { InventoryItem } from '@/types/inventory';
import { warehouses } from '@/data/mockData';
import { Package } from 'lucide-react';

interface ReceiveStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onReceive: (itemId: string, warehouseId: string, quantity: number) => void;
}

export function ReceiveStockDialog({ open, onOpenChange, item, onReceive }: ReceiveStockDialogProps) {
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (item && warehouseId && quantity > 0) {
      onReceive(item.id, warehouseId, quantity);
      onOpenChange(false);
      setWarehouseId('');
      setQuantity(0);
    }
  };

  const selectedWarehouse = warehouses.find((wh) => wh.id === warehouseId);
  const currentStock = item?.stock.find((s) => s.warehouseId === warehouseId)?.quantity || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Receive Stock
          </DialogTitle>
          <DialogDescription>
            Add incoming inventory to a specific warehouse
          </DialogDescription>
        </DialogHeader>
        
        {item && (
          <div className="bg-muted/50 rounded-lg p-4 mt-2">
            <p className="font-semibold text-foreground">{item.name}</p>
            <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="warehouse">Select Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((wh) => {
                  const stock = item?.stock.find((s) => s.warehouseId === wh.id);
                  return (
                    <SelectItem key={wh.id} value={wh.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{wh.name}</span>
                        <span className="text-muted-foreground text-xs">
                          Current: {stock?.quantity || 0}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedWarehouse && (
            <div className="bg-accent/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                Current stock at <span className="font-medium text-foreground">{selectedWarehouse.name}</span>: 
                <span className="font-semibold text-foreground ml-1">{currentStock} units</span>
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="quantity">Quantity to Add</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity || ''}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              placeholder="Enter quantity"
              required
            />
          </div>

          {selectedWarehouse && quantity > 0 && (
            <div className="bg-success/10 rounded-lg p-3 text-sm border border-success/20">
              <p className="text-success font-medium">
                New stock at {selectedWarehouse.name}: {currentStock + quantity} units
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!warehouseId || quantity <= 0}>
              Receive Stock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
