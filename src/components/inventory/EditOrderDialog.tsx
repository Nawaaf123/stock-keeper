import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InventoryItem, Warehouse, Order } from '@/types/inventory';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface OrderLine {
  itemId: string;
  warehouseId: string;
  quantity: number;
  unitPrice: number;
}

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  items: InventoryItem[];
  warehouses: Warehouse[];
  onUpdateOrder: (
    orderId: string,
    shopName: string,
    items: OrderLine[],
  ) => Promise<void> | void;
}

export function EditOrderDialog({ open, onOpenChange, order, items, warehouses, onUpdateOrder }: EditOrderDialogProps) {
  const [shopName, setShopName] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');
  const [skuInput, setSkuInput] = useState('');
  const [qtyInput, setQtyInput] = useState('1');
  const skuRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (order) {
      setShopName(order.shopName);
      setLines(order.items.map(i => ({
        itemId: i.itemId,
        warehouseId: i.warehouseId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })));
      setCategoryFilter('all');
      setSubCategoryFilter('all');
      setSkuInput('');
      setQtyInput('1');
    }
  }, [order]);

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

  // Available stock = current stock + qty already on this order line (since editing returns it)
  const originalQty = useMemo(() => {
    const m = new Map<string, number>();
    order?.items.forEach(i => m.set(`${i.itemId}::${i.warehouseId}`, (m.get(`${i.itemId}::${i.warehouseId}`) || 0) + i.quantity));
    return m;
  }, [order]);

  const getAvailableStock = (itemId: string, warehouseId: string) => {
    const item = items.find(i => i.id === itemId);
    const current = item?.stock.find(s => s.warehouseId === warehouseId)?.quantity || 0;
    return current + (originalQty.get(`${itemId}::${warehouseId}`) || 0);
  };

  const updateLine = (idx: number, field: keyof OrderLine, value: string | number) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: value };
    if (field === 'itemId') {
      const item = items.find(i => i.id === value);
      if (item) {
        next[idx].unitPrice = item.price;
        const best = [...item.stock].sort((a, b) => b.quantity - a.quantity)[0];
        next[idx].warehouseId = best?.warehouseId || '';
      }
    }
    setLines(next);
  };

  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const addLine = () => setLines([...lines, { itemId: '', warehouseId: '', quantity: 1, unitPrice: 0 }]);

  const handleQuickAdd = () => {
    const sku = skuInput.trim().toLowerCase();
    if (!sku) return;
    const qty = Math.max(1, parseInt(qtyInput) || 1);

    const item = items.find(i => i.sku.toLowerCase() === sku)
      || items.find(i => i.sku.toLowerCase().startsWith(sku))
      || items.find(i => i.name.toLowerCase().includes(sku));

    if (!item) { toast.error(`No product found for "${skuInput}"`); return; }

    const best = [...item.stock].sort((a, b) => b.quantity - a.quantity)[0];
    const onLines = lines
      .filter(l => l.itemId === item.id)
      .reduce((s, l) => s + (l.warehouseId === best?.warehouseId ? l.quantity : 0), 0);
    const avail = (best?.quantity || 0) + (originalQty.get(`${item.id}::${best?.warehouseId}`) || 0) - onLines;
    if (!best || avail <= 0) { toast.error(`${item.name} has no stock`); return; }

    const existingIdx = lines.findIndex(e => e.itemId === item.id && e.warehouseId === best.warehouseId);
    if (existingIdx >= 0) {
      const updated = [...lines];
      updated[existingIdx].quantity += qty;
      setLines(updated);
    } else {
      setLines([...lines, { itemId: item.id, warehouseId: best.warehouseId, quantity: qty, unitPrice: item.price }]);
    }

    setSkuInput('');
    setQtyInput('1');
    skuRef.current?.focus();
  };

  const isValid = () => {
    if (!shopName.trim()) return false;
    const valid = lines.filter(l => l.itemId && l.warehouseId && l.quantity > 0);
    if (valid.length === 0) return false;
    return valid.every(l => l.quantity <= getAvailableStock(l.itemId, l.warehouseId));
  };

  const handleSave = async () => {
    if (!order) return;
    if (!isValid()) { toast.error('Check shop name, products, and quantities'); return; }
    const valid = lines
      .filter(l => l.itemId && l.warehouseId && l.quantity > 0)
      .map(l => ({ ...l, unitPrice: Number(l.unitPrice) || 0 }));
    await onUpdateOrder(order.id, shopName.trim(), valid);
    toast.success('Order updated and inventory adjusted');
    onOpenChange(false);
  };

  const totalUnits = lines.reduce((s, l) => s + (l.itemId && l.warehouseId ? l.quantity : 0), 0);
  const totalValue = lines.reduce((s, l) => s + (l.itemId && l.warehouseId ? l.quantity * (Number(l.unitPrice) || 0) : 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[90vh] sm:max-h-[90vh] overflow-hidden sm:overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil className="w-4 h-4" /> Edit Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 px-6 overflow-y-auto flex-1 min-h-0">
          {/* Shop + Category + Subcategory in one row */}
          <div className="grid grid-cols-[1fr_150px_150px] gap-2">
            <Input
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Shop / customer name"
              className="h-9"
            />
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
              className="w-16 h-9 no-spinner"
            />
            <Button onClick={handleQuickAdd} type="button" size="sm" className="h-9">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {lines.length > 0 ? (
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
                  {lines.map((entry, idx) => {
                    const selectedItem = items.find(i => i.id === entry.itemId);
                    const available = getAvailableStock(entry.itemId, entry.warehouseId);
                    const exceeds = entry.quantity > available;
                    const productList = entry.itemId && !filteredItems.find(i => i.id === entry.itemId) && selectedItem
                      ? [...filteredItems, selectedItem]
                      : filteredItems;
                    return (
                      <tr key={idx} className="border-t">
                        <td className="px-1 py-1">
                          <Select value={entry.itemId} onValueChange={(v) => updateLine(idx, 'itemId', v)}>
                            <SelectTrigger className="h-8 border-0 shadow-none focus:ring-1">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {productList.map(item => (
                                <SelectItem key={item.id} value={item.id}>{item.sku} – {item.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-1 py-1">
                          <Select
                            value={entry.warehouseId}
                            onValueChange={(v) => updateLine(idx, 'warehouseId', v)}
                            disabled={!entry.itemId}
                          >
                            <SelectTrigger className="h-8 border-0 shadow-none focus:ring-1">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {warehouses.map(wh => {
                                const stock = selectedItem?.stock.find(s => s.warehouseId === wh.id);
                                const onThisLine = entry.itemId && entry.warehouseId === wh.id
                                  ? (originalQty.get(`${entry.itemId}::${wh.id}`) || 0) : 0;
                                const avail = (stock?.quantity || 0) + onThisLine;
                                return (
                                  <SelectItem key={wh.id} value={wh.id} disabled={avail === 0}>
                                    {wh.name} ({avail})
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
                              updateLine(idx, 'quantity', v === '' ? 0 : parseInt(v) || 0);
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
                              updateLine(idx, 'unitPrice', v === '' ? 0 : parseFloat(v) || 0);
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
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(idx)}>
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
                      {totalUnits} cases · {lines.length} line{lines.length !== 1 ? 's' : ''}
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
              No lines. <button type="button" className="underline text-foreground" onClick={addLine}>Add a line</button>
            </div>
          )}

          {lines.length > 0 && (
            <Button variant="ghost" size="sm" onClick={addLine} className="w-full h-8 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add line
            </Button>
          )}
        </div>

        <DialogFooter className="gap-2 px-6 py-4 border-t bg-background flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!isValid()}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
