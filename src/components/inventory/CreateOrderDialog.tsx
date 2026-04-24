import { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InventoryItem, Wholesaler, Warehouse } from '@/types/inventory';
import { Plus, Trash2, Store } from 'lucide-react';
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
  const [orderItems, setOrderItems] = useState<OrderItemEntry[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');

  const [skuInput, setSkuInput] = useState('');
  const [qtyInput, setQtyInput] = useState('1');
  const skuRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(
    () => Array.from(new Set(items.map(i => i.category).filter(Boolean))).sort(),
    [items]
  );

  const subCategories = useMemo(() => {
    const pool = categoryFilter === 'all' ? items : items.filter(i => i.category === categoryFilter);
    return Array.from(new Set(pool.map(i => i.subCategory).filter(Boolean))).sort();
  }, [items, categoryFilter]);

  const filteredItems = useMemo(() => {
    return items.filter(i =>
      (categoryFilter === 'all' || i.category === categoryFilter) &&
      (subCategoryFilter === 'all' || i.subCategory === subCategoryFilter)
    );
  }, [items, categoryFilter, subCategoryFilter]);

  useEffect(() => {
    if (open) setTimeout(() => skuRef.current?.focus(), 50);
  }, [open]);

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItemEntry, value: string | number) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'itemId') {
      const item = items.find(i => i.id === value);
      if (item) {
        const best = [...item.stock].sort((a, b) => b.quantity - a.quantity)[0];
        updated[index].warehouseId = best && best.quantity > 0 ? best.warehouseId : '';
        updated[index].unitPrice = item.price;
      }
    }
    setOrderItems(updated);
  };

  const getAvailableStock = (itemId: string, warehouseId: string): number => {
    const item = items.find(i => i.id === itemId);
    return item?.stock.find(s => s.warehouseId === warehouseId)?.quantity || 0;
  };

  const getShopName = (): string => {
    if (selectedWholesaler === 'custom') return customShopName.trim();
    return wholesalers.find(w => w.id === selectedWholesaler)?.name || '';
  };

  const handleQuickAdd = () => {
    const sku = skuInput.trim().toLowerCase();
    if (!sku) return;
    const qty = Math.max(1, parseInt(qtyInput) || 1);

    const item = items.find(i => i.sku.toLowerCase() === sku)
      || items.find(i => i.sku.toLowerCase().startsWith(sku))
      || items.find(i => i.name.toLowerCase().includes(sku));

    if (!item) { toast.error(`No product found for "${skuInput}"`); return; }

    const best = [...item.stock].sort((a, b) => b.quantity - a.quantity)[0];
    if (!best || best.quantity === 0) { toast.error(`${item.name} has no stock`); return; }

    const existingIdx = orderItems.findIndex(e => e.itemId === item.id && e.warehouseId === best.warehouseId);
    if (existingIdx >= 0) {
      const updated = [...orderItems];
      updated[existingIdx].quantity += qty;
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, { itemId: item.id, warehouseId: best.warehouseId, quantity: qty, unitPrice: item.price }]);
    }

    setSkuInput('');
    setQtyInput('1');
    skuRef.current?.focus();
  };

  const isValid = () => {
    if (!getShopName()) return false;
    const valid = orderItems.filter(e => e.itemId && e.warehouseId && e.quantity > 0);
    if (valid.length === 0) return false;
    return valid.every(e => e.quantity <= getAvailableStock(e.itemId, e.warehouseId));
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
    setOrderItems([]);
    setCategoryFilter('all');
    setSubCategoryFilter('all');
    setSkuInput('');
    setQtyInput('1');
  };

  const handleClose = () => { resetState(); onOpenChange(false); };

  const totalUnits = orderItems.reduce((s, e) => s + (e.itemId && e.warehouseId ? e.quantity : 0), 0);
  const totalValue = orderItems.reduce((s, e) => s + (e.itemId && e.warehouseId ? e.quantity * (Number(e.unitPrice) || 0) : 0), 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[90vh] sm:max-h-[90vh] overflow-hidden sm:overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Store className="w-4 h-4" /> Create Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 px-6 overflow-y-auto flex-1 min-h-0">
          {/* Shop + Category + Subcategory in one row */}
          <div className="grid grid-cols-[1fr_150px_150px] gap-2">
            <Select value={selectedWholesaler} onValueChange={setSelectedWholesaler}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select shop / wholesaler" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {wholesalers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
                <SelectItem value="custom">+ Custom name</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setSubCategoryFilter('all'); }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter} disabled={subCategories.length === 0}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All sub-categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sub-categories</SelectItem>
                {subCategories.map(sc => <SelectItem key={sc} value={sc}>{sc}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedWholesaler === 'custom' && (
            <Input
              value={customShopName}
              onChange={(e) => setCustomShopName(e.target.value)}
              placeholder="Shop / customer name"
              className="h-9"
            />
          )}

          {/* Quick add SKU bar */}
          <div className="flex gap-2">
            <Input
              ref={skuRef}
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(); } }}
              placeholder="Scan / type SKU or name, press Enter"
              className="flex-1 h-9"
            />
            <Input
              type="number"
              min={1}
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(); } }}
              className="w-16 h-9"
            />
            <Button onClick={handleQuickAdd} type="button" size="sm" className="h-9">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Order lines table */}
          {orderItems.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium">Product</th>
                    <th className="text-left px-2 py-1.5 font-medium w-44">Warehouse</th>
                    <th className="text-right px-2 py-1.5 font-medium w-24">Qty</th>
                    <th className="text-right px-2 py-1.5 font-medium w-28">Price</th>
                    <th className="text-right px-2 py-1.5 font-medium w-28">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((entry, index) => {
                    const selectedItem = items.find(i => i.id === entry.itemId);
                    const availableStock = getAvailableStock(entry.itemId, entry.warehouseId);
                    const productList = entry.itemId && !filteredItems.find(i => i.id === entry.itemId)
                      ? [...filteredItems, selectedItem!]
                      : filteredItems;
                    const exceeds = entry.quantity > availableStock;

                    return (
                      <tr key={index} className="border-t">
                        <td className="px-1 py-1">
                          <Select value={entry.itemId} onValueChange={(v) => handleItemChange(index, 'itemId', v)}>
                            <SelectTrigger className="h-8 border-0 shadow-none focus:ring-1">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {productList.map((item) => (
                                <SelectItem key={item.id} value={item.id}>{item.sku} – {item.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-1 py-1">
                          <Select
                            value={entry.warehouseId}
                            onValueChange={(v) => handleItemChange(index, 'warehouseId', v)}
                            disabled={!entry.itemId}
                          >
                            <SelectTrigger className="h-8 border-0 shadow-none focus:ring-1">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses.map((wh) => {
                                const stock = selectedItem?.stock.find(s => s.warehouseId === wh.id);
                                return (
                                  <SelectItem key={wh.id} value={wh.id} disabled={!stock || stock.quantity === 0}>
                                    {wh.name} ({stock?.quantity || 0})
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            min={1}
                            value={entry.quantity === 0 ? '' : entry.quantity}
                            onChange={(e) => {
                              const v = e.target.value;
                              handleItemChange(index, 'quantity', v === '' ? 0 : parseInt(v) || 0);
                            }}
                            onFocus={(e) => e.target.select()}
                            className={`h-8 text-right border-0 shadow-none focus-visible:ring-1 no-spinner px-1 ${exceeds ? 'text-destructive' : ''}`}
                            disabled={!entry.warehouseId}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={entry.unitPrice === 0 ? '' : entry.unitPrice}
                            onChange={(e) => {
                              const v = e.target.value;
                              handleItemChange(index, 'unitPrice', v === '' ? 0 : parseFloat(v) || 0);
                            }}
                            onFocus={(e) => e.target.select()}
                            className="h-8 text-right border-0 shadow-none focus-visible:ring-1 no-spinner px-1"
                            disabled={!entry.itemId}
                          />
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums">
                          ${(entry.quantity * (Number(entry.unitPrice) || 0)).toFixed(2)}
                        </td>
                        <td className="px-1 py-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveItem(index)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/30 text-sm">
                  <tr className="border-t">
                    <td colSpan={2} className="px-2 py-1.5 text-muted-foreground text-xs">
                      {totalUnits} cases · {orderItems.length} line{orderItems.length !== 1 ? 's' : ''}
                    </td>
                    <td colSpan={3} className="px-2 py-1.5 text-right font-semibold tabular-nums">
                      ${totalValue.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="border border-dashed rounded-md py-6 text-center text-sm text-muted-foreground">
              Scan a SKU above or <button
                type="button"
                className="underline text-foreground"
                onClick={() => setOrderItems([{ itemId: '', warehouseId: '', quantity: 1, unitPrice: 0 }])}
              >add a line manually</button>
            </div>
          )}

          {orderItems.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOrderItems([...orderItems, { itemId: '', warehouseId: '', quantity: 1, unitPrice: 0 }])}
              className="w-full h-8 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add line
            </Button>
          )}
        </div>

        <DialogFooter className="gap-2 px-6 py-4 border-t bg-background flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!isValid()}>Create Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
