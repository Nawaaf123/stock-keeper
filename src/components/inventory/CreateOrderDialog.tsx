import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InventoryItem, Wholesaler } from '@/types/inventory';
import { warehouses } from '@/data/mockData';
import { Plus, Trash2, Store } from 'lucide-react';

interface OrderItemEntry {
  itemId: string;
  warehouseId: string;
  quantity: number;
}

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  wholesalers: Wholesaler[];
  onCreateOrder: (shopName: string, items: { itemId: string; warehouseId: string; quantity: number }[]) => void;
}

export function CreateOrderDialog({ open, onOpenChange, items, wholesalers, onCreateOrder }: CreateOrderDialogProps) {
  const [selectedWholesaler, setSelectedWholesaler] = useState('');
  const [customShopName, setCustomShopName] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItemEntry[]>([{ itemId: '', warehouseId: '', quantity: 1 }]);

  const handleAddItem = () => {
    setOrderItems([...orderItems, { itemId: '', warehouseId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItemEntry, value: string | number) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    setOrderItems(updated);
  };

  const getAvailableStock = (itemId: string, warehouseId: string): number => {
    const item = items.find(i => i.id === itemId);
    if (!item) return 0;
    const stock = item.stock.find(s => s.warehouseId === warehouseId);
    return stock?.quantity || 0;
  };

  const getShopName = (): string => {
    if (selectedWholesaler === 'custom') {
      return customShopName.trim();
    }
    const wholesaler = wholesalers.find(w => w.id === selectedWholesaler);
    return wholesaler?.name || '';
  };

  const isValid = () => {
    const shopName = getShopName();
    if (!shopName) return false;
    return orderItems.every(entry => {
      if (!entry.itemId || !entry.warehouseId || entry.quantity <= 0) return false;
      const available = getAvailableStock(entry.itemId, entry.warehouseId);
      return entry.quantity <= available;
    });
  };

  const handleSubmit = () => {
    if (isValid()) {
      onCreateOrder(getShopName(), orderItems);
      setSelectedWholesaler('');
      setCustomShopName('');
      setOrderItems([{ itemId: '', warehouseId: '', quantity: 1 }]);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setSelectedWholesaler('');
    setCustomShopName('');
    setOrderItems([{ itemId: '', warehouseId: '', quantity: 1 }]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Create Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Shop / Wholesaler</Label>
            <Select value={selectedWholesaler} onValueChange={setSelectedWholesaler}>
              <SelectTrigger>
                <SelectValue placeholder="Select wholesaler or enter custom" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {wholesalers.map((wholesaler) => (
                  <SelectItem key={wholesaler.id} value={wholesaler.id}>
                    {wholesaler.name}
                    {wholesaler.contactPerson && (
                      <span className="text-muted-foreground ml-2">({wholesaler.contactPerson})</span>
                    )}
                  </SelectItem>
                ))}
                <SelectItem value="custom">+ Enter custom name</SelectItem>
              </SelectContent>
            </Select>
            {selectedWholesaler === 'custom' && (
              <Input
                value={customShopName}
                onChange={(e) => setCustomShopName(e.target.value)}
                placeholder="Enter shop or customer name"
                className="mt-2"
              />
            )}
          </div>

          <div className="space-y-3">
            <Label>Order Items</Label>
            {orderItems.map((entry, index) => {
              const selectedItem = items.find(i => i.id === entry.itemId);
              const availableStock = getAvailableStock(entry.itemId, entry.warehouseId);
              
              return (
                <div key={index} className="flex gap-2 items-start p-3 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-2">
                    <Select
                      value={entry.itemId}
                      onValueChange={(value) => handleItemChange(index, 'itemId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.sku} - {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                      <Select
                        value={entry.warehouseId}
                        onValueChange={(value) => handleItemChange(index, 'warehouseId', value)}
                        disabled={!entry.itemId}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((wh) => {
                            const stock = selectedItem?.stock.find(s => s.warehouseId === wh.id);
                            return (
                              <SelectItem key={wh.id} value={wh.id} disabled={!stock || stock.quantity === 0}>
                                {wh.name} ({stock?.quantity || 0} available)
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        min={1}
                        max={availableStock}
                        value={entry.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-24"
                        disabled={!entry.warehouseId}
                      />
                    </div>

                    {entry.itemId && entry.warehouseId && (
                      <p className="text-xs text-muted-foreground">
                        Available: {availableStock} units
                        {entry.quantity > availableStock && (
                          <span className="text-destructive ml-2">Exceeds available stock!</span>
                        )}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(index)}
                    disabled={orderItems.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}

            <Button variant="outline" onClick={handleAddItem} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Another Product
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid()}>
            Create Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
