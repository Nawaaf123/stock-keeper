import { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryItem, Wholesaler, Warehouse } from '@/types/inventory';
import { Plus, Trash2, Store, Zap, List, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface OrderItemEntry {
  itemId: string;
  warehouseId: string;
  quantity: number;
  unitPrice: number;
}

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  warehouses: Warehouse[];
  wholesalers: Wholesaler[];
  onCreateOrder: (shopName: string, items: { itemId: string; warehouseId: string; quantity: number; unitPrice: number }[]) => void;
}

export function CreateOrderDialog({ open, onOpenChange, items, warehouses, wholesalers, onCreateOrder }: CreateOrderDialogProps) {
  const [selectedWholesaler, setSelectedWholesaler] = useState('');
  const [customShopName, setCustomShopName] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItemEntry[]>([{ itemId: '', warehouseId: '', quantity: 1, unitPrice: 0 }]);

  // Category / subcategory filters that narrow the product pickers
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');

  // Quick SKU entry state
  const [skuInput, setSkuInput] = useState('');
  const [qtyInput, setQtyInput] = useState('1');
  const skuRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => {
    return Array.from(new Set(items.map(i => i.category).filter(Boolean))).sort();
  }, [items]);

  const subCategories = useMemo(() => {
    const filtered = categoryFilter === 'all'
      ? items
      : items.filter(i => i.category === categoryFilter);
    return Array.from(new Set(filtered.map(i => i.subCategory).filter(Boolean))).sort();
  }, [items, categoryFilter]);

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
      if (subCategoryFilter !== 'all' && i.subCategory !== subCategoryFilter) return false;
      return true;
    });
  }, [items, categoryFilter, subCategoryFilter]);

  // Reset subcategory if it no longer matches the chosen category
  useEffect(() => {
    if (subCategoryFilter !== 'all' && !subCategories.includes(subCategoryFilter)) {
      setSubCategoryFilter('all');
    }
  }, [subCategories, subCategoryFilter]);

  const handleAddItem = () => {
    setOrderItems([...orderItems, { itemId: '', warehouseId: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItemEntry, value: string | number) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-pick the warehouse with most stock + default unit price when product changes
    if (field === 'itemId') {
      const item = items.find(i => i.id === value);
      if (item) {
        const best = [...item.stock].sort((a, b) => b.quantity - a.quantity)[0];
        if (best && best.quantity > 0) {
          updated[index].warehouseId = best.warehouseId;
        } else {
          updated[index].warehouseId = '';
        }
        updated[index].unitPrice = item.price;
      }
    }
    setOrderItems(updated);
  };

  const getAvailableStock = (itemId: string, warehouseId: string): number => {
    const item = items.find(i => i.id === itemId);
    if (!item) return 0;
    const stock = item.stock.find(s => s.warehouseId === warehouseId);
    return stock?.quantity || 0;
  };

  const getShopName = (): string => {
    if (selectedWholesaler === 'custom') return customShopName.trim();
    const wholesaler = wholesalers.find(w => w.id === selectedWholesaler);
    return wholesaler?.name || '';
  };

  // Quick SKU add — type SKU + qty, press Enter
  const handleQuickAdd = () => {
    const sku = skuInput.trim().toLowerCase();
    if (!sku) return;
    const qty = Math.max(1, parseInt(qtyInput) || 1);

    const item = items.find(i => i.sku.toLowerCase() === sku)
      || items.find(i => i.sku.toLowerCase().startsWith(sku))
      || items.find(i => i.name.toLowerCase().includes(sku));

    if (!item) {
      toast.error(`No product found for "${skuInput}"`);
      return;
    }

    const best = [...item.stock].sort((a, b) => b.quantity - a.quantity)[0];
    if (!best || best.quantity === 0) {
      toast.error(`${item.name} has no stock available`);
      return;
    }

    // If this item+warehouse already exists, bump the qty
    const existingIdx = orderItems.findIndex(
      e => e.itemId === item.id && e.warehouseId === best.warehouseId
    );
    if (existingIdx >= 0) {
      const updated = [...orderItems];
      updated[existingIdx].quantity += qty;
      setOrderItems(updated);
    } else {
      const newEntry = { itemId: item.id, warehouseId: best.warehouseId, quantity: qty, unitPrice: item.price };
      // Replace the empty placeholder row if present
      if (orderItems.length === 1 && !orderItems[0].itemId) {
        setOrderItems([newEntry]);
      } else {
        setOrderItems([...orderItems, newEntry]);
      }
    }

    toast.success(`Added ${qty} × ${item.name}`);
    setSkuInput('');
    setQtyInput('1');
    skuRef.current?.focus();
  };

  const isValid = () => {
    const shopName = getShopName();
    if (!shopName) return false;
    const valid = orderItems.filter(e => e.itemId && e.warehouseId && e.quantity > 0);
    if (valid.length === 0) return false;
    return valid.every(entry => entry.quantity <= getAvailableStock(entry.itemId, entry.warehouseId));
  };

  const handleSubmit = () => {
    if (!isValid()) return;
    const valid = orderItems
      .filter(e => e.itemId && e.warehouseId && e.quantity > 0)
      .map(e => ({ ...e, unitPrice: Number(e.unitPrice) || 0 }));
    onCreateOrder(getShopName(), valid);
    resetState();
    onOpenChange(false);
  };

  const resetState = () => {
    setSelectedWholesaler('');
    setCustomShopName('');
    setOrderItems([{ itemId: '', warehouseId: '', quantity: 1, unitPrice: 0 }]);
    setCategoryFilter('all');
    setSubCategoryFilter('all');
    setSkuInput('');
    setQtyInput('1');
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const totalUnits = orderItems.reduce((sum, e) => sum + (e.itemId && e.warehouseId ? e.quantity : 0), 0);
  const totalValue = orderItems.reduce((sum, e) => sum + (e.itemId && e.warehouseId ? e.quantity * (Number(e.unitPrice) || 0) : 0), 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
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

          {/* Category filters — narrow the product pickers */}
          <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-muted/30">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Filter className="w-3 h-3" /> Category
              </Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Filter className="w-3 h-3" /> Sub-category
              </Label>
              <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sub-categories</SelectItem>
                  {subCategories.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="quick" className="flex items-center gap-2">
                <Zap className="w-4 h-4" /> Quick SKU Entry
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <List className="w-4 h-4" /> Pick Products
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-3 mt-3">
              <div className="flex gap-2">
                <Input
                  ref={skuRef}
                  autoFocus
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAdd();
                    }
                  }}
                  placeholder="Type SKU or product name, press Enter"
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={1}
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAdd();
                    }
                  }}
                  className="w-20"
                />
                <Button onClick={handleQuickAdd} type="button">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: warehouse with the most stock is auto-selected. Same product scanned twice just increases the quantity.
              </p>
            </TabsContent>

            <TabsContent value="manual" className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">
                Showing {filteredItems.length} of {items.length} products{categoryFilter !== 'all' && ` in "${categoryFilter}"`}
              </p>
            </TabsContent>
          </Tabs>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Order Lines ({orderItems.filter(e => e.itemId).length})</Label>
              {totalUnits > 0 && (
                <span className="text-sm text-muted-foreground">{totalUnits} units total</span>
              )}
            </div>

            {orderItems.map((entry, index) => {
              const selectedItem = items.find(i => i.id === entry.itemId);
              const availableStock = getAvailableStock(entry.itemId, entry.warehouseId);
              const productListForRow = entry.itemId && !filteredItems.find(i => i.id === entry.itemId)
                ? [...filteredItems, selectedItem!]
                : filteredItems;

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
                        {productListForRow.map((item) => (
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
                        max={availableStock || undefined}
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
