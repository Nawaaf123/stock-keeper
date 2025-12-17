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
  items?: InventoryItem[];
  onReceive: (itemId: string, warehouseId: string, quantity: number, bolNumber: string) => void;
}

export function ReceiveStockDialog({ open, onOpenChange, item, items = [], onReceive }: ReceiveStockDialogProps) {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [bolNumber, setBolNumber] = useState('');

  // Use passed item or find from items list
  const activeItem = item || items.find((i) => i.id === selectedItemId) || null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeItem && warehouseId && quantity > 0 && bolNumber.trim()) {
      onReceive(activeItem.id, warehouseId, quantity, bolNumber.trim());
      onOpenChange(false);
      setSelectedItemId('');
      setWarehouseId('');
      setQuantity(0);
      setBolNumber('');
    }
  };

  const selectedWarehouse = warehouses.find((wh) => wh.id === warehouseId);
  const currentStock = activeItem?.stock.find((s) => s.warehouseId === warehouseId)?.quantity || 0;

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
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {!item && items.length > 0 && (
            <div>
              <Label htmlFor="item">Select Product</Label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose product" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
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
          )}

          {activeItem && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="font-semibold text-foreground">{activeItem.name}</p>
              <p className="text-sm text-muted-foreground">SKU: {activeItem.sku}</p>
            </div>
          )}

          <div>
            <Label htmlFor="warehouse">Select Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose warehouse" />
              </SelectTrigger>
              <SelectContent>
              {warehouses.map((wh) => {
                  const stock = activeItem?.stock.find((s) => s.warehouseId === wh.id);
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
            <Button type="submit" disabled={!activeItem || !warehouseId || quantity <= 0 || !bolNumber.trim()}>
              Receive Stock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
