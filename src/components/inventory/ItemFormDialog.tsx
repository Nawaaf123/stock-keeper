import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InventoryItem } from '@/types/inventory';
import { warehouses } from '@/data/mockData';

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
  onSubmit: (item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'stock'> & { initialStock?: { warehouseId: string; quantity: number }[] }) => void;
  onUpdate: (id: string, updates: Partial<Omit<InventoryItem, 'stock'>>) => void;
}

const initialFormState = {
  name: '',
  sku: '',
  category: '',
  subCategory: '',
  minStock: 0,
  price: 0,
};

export function ItemFormDialog({ open, onOpenChange, item, onSubmit, onUpdate }: ItemFormDialogProps) {
  const [formData, setFormData] = useState(initialFormState);
  const [initialStock, setInitialStock] = useState<Record<string, number>>({});

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        sku: item.sku,
        category: item.category,
        subCategory: item.subCategory || '',
        minStock: item.minStock,
        price: item.price,
      });
    } else {
      setFormData(initialFormState);
      setInitialStock({});
    }
  }, [item, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      onUpdate(item.id, formData);
    } else {
      const stockData = Object.entries(initialStock)
        .filter(([_, qty]) => qty > 0)
        .map(([warehouseId, quantity]) => ({ warehouseId, quantity }));
      onSubmit({ ...formData, initialStock: stockData });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add New Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Electronics"
                required
              />
            </div>
            <div>
              <Label htmlFor="subCategory">Sub Category</Label>
              <Input
                id="subCategory"
                value={formData.subCategory}
                onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                placeholder="e.g. Accessories"
              />
            </div>
            <div>
              <Label htmlFor="minStock">Min Stock Level</Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          {!item && (
            <div className="space-y-3 pt-4 border-t border-border">
              <Label className="text-sm font-medium">Initial Stock (Optional)</Label>
              <div className="grid grid-cols-2 gap-3">
                {warehouses.map((wh) => (
                  <div key={wh.id} className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground min-w-20">{wh.name}</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={initialStock[wh.id] || ''}
                      onChange={(e) => setInitialStock({ ...initialStock, [wh.id]: parseInt(e.target.value) || 0 })}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{item ? 'Save Changes' : 'Add Item'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
