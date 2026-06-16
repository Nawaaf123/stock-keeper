import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { InventoryItem, Warehouse, Order, Wholesaler } from '@/types/inventory';
import { Plus, Trash2, Pencil, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OrderLine {
  lineId: string;
  itemId: string;
  warehouseId: string;
  quantity: number;
  unitPrice: number;
}

const createOrderLine = (entry: Omit<OrderLine, 'lineId'>): OrderLine => ({
  lineId: crypto.randomUUID(),
  ...entry,
});

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  items: InventoryItem[];
  warehouses: Warehouse[];
  wholesalers: Wholesaler[];
  onUpdateOrder: (
    orderId: string,
    shopName: string,
    items: Omit<OrderLine, 'lineId'>[],
    shippingFee: number,
  ) => Promise<void> | void;
}

export function EditOrderDialog({ open, onOpenChange, order, items, warehouses, wholesalers, onUpdateOrder }: EditOrderDialogProps) {
  const [shopName, setShopName] = useState('');
  const [shopPickerOpen, setShopPickerOpen] = useState(false);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');
  const [skuInput, setSkuInput] = useState('');
  const [qtyInput, setQtyInput] = useState('1');
  const [shippingFee, setShippingFee] = useState<string>('');
  const [openProductIdx, setOpenProductIdx] = useState<number | null>(null);
  const [openWarehouseIdx, setOpenWarehouseIdx] = useState<number | null>(null);
  const [openProductPickerLineId, setOpenProductPickerLineId] = useState<string | null>(null);
  const skuRef = useRef<HTMLInputElement>(null);
  const linesScrollRef = useRef<HTMLDivElement>(null);

  const itemsById = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

  useEffect(() => {
    if (linesScrollRef.current) {
      linesScrollRef.current.scrollTop = linesScrollRef.current.scrollHeight;
    }
  }, [lines.length]);

  useEffect(() => {
    if (order) {
      setShopName(order.shopName);
      setLines(order.items.map(i => createOrderLine({
        itemId: i.itemId,
        warehouseId: i.warehouseId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })));
      setCategoryFilter('all');
      setSubCategoryFilter('all');
      setSkuInput('');
      setQtyInput('1');
      setShippingFee(order.shippingFee ? String(order.shippingFee) : '');
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
    const item = itemsById.get(itemId);
    const current = item?.stock.find(s => s.warehouseId === warehouseId)?.quantity || 0;
    return current + (originalQty.get(`${itemId}::${warehouseId}`) || 0);
  };

  const updateLine = (idx: number, field: keyof OrderLine, value: string | number) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: value };
    if (field === 'itemId') {
      const item = itemsById.get(value as string);
      if (item) {
        const bensenvilleId = 'cfb94d6e-6114-45b4-b1a0-9eb3c2d926e8';
        const bensenvilleStock = item.stock.find(s => s.warehouseId === bensenvilleId);
        const best = [...item.stock].sort((a, b) => b.quantity - a.quantity)[0];
        next[idx].unitPrice = item.price;
        next[idx].warehouseId = bensenvilleStock && bensenvilleStock.quantity > 0
          ? bensenvilleId
          : (best?.warehouseId || '');
      }
    }
    setLines(next);
  };

  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const addLine = () => {
    const line = createOrderLine({ itemId: '', warehouseId: '', quantity: 1, unitPrice: 0 });
    setLines(prev => [...prev, line]);
    setOpenProductPickerLineId(line.lineId);
    return line;
  };

  const addProductToLines = (itemId: string, popoverRowIndex: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const bensenvilleId = 'cfb94d6e-6114-45b4-b1a0-9eb3c2d926e8';
    const bensenvilleStock = item.stock.find(s => s.warehouseId === bensenvilleId);
    const best = [...item.stock].sort((a, b) => b.quantity - a.quantity)[0];
    const warehouseId = bensenvilleStock && bensenvilleStock.quantity > 0
      ? bensenvilleId
      : (best && best.quantity > 0 ? best.warehouseId : '');
    setLines(prev => {
      if (prev.some(e => e.itemId === itemId)) return prev;
      const newLine = createOrderLine({ itemId, warehouseId, quantity: 1, unitPrice: item.price });
      const updated = [...prev];
      const insertAt = Math.min(Math.max(popoverRowIndex, 0), updated.length);
      updated.splice(insertAt, 0, newLine);
      return updated;
    });
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
      setLines([...lines, createOrderLine({ itemId: item.id, warehouseId: best.warehouseId, quantity: qty, unitPrice: item.price })]);
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
    try {
      await onUpdateOrder(order.id, shopName.trim(), valid, Number(shippingFee) || 0);
      toast.success('Order updated and inventory adjusted');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update order');
    }
  };

  const totalUnits = lines.reduce((s, l) => s + (l.itemId && l.warehouseId ? l.quantity : 0), 0);
  const subtotal = lines.reduce((s, l) => s + (l.itemId && l.warehouseId ? l.quantity * (Number(l.unitPrice) || 0) : 0), 0);
  const shipping = Number(shippingFee) || 0;
  const totalValue = subtotal + shipping;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-5xl h-[90vh] max-h-[90vh] sm:h-[90vh] sm:max-h-[90vh] !grid-cols-1 !gap-0 !overflow-hidden sm:!overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil className="w-4 h-4" /> Edit Order
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-3 flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          {/* Shop + Category + Subcategory in one row */}
          <div className="grid grid-cols-[1fr_150px_150px] gap-2">
            <Popover open={shopPickerOpen} onOpenChange={setShopPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className="h-9 justify-between font-normal"
                >
                  <span className="truncate">{shopName || 'Select shop / wholesaler'}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[280px]" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search wholesaler or type custom name..."
                    value={shopName}
                    onValueChange={setShopName}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <button
                        type="button"
                        className="text-sm underline"
                        onClick={() => setShopPickerOpen(false)}
                      >
                        Use "{shopName}" as custom name
                      </button>
                    </CommandEmpty>
                    <CommandGroup>
                      {wholesalers.map((w) => (
                        <CommandItem
                          key={w.id}
                          value={w.name}
                          onSelect={() => { setShopName(w.name); setShopPickerOpen(false); }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', shopName === w.name ? 'opacity-100' : 'opacity-0')} />
                          {w.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              <div className="border rounded-md overflow-hidden flex-1 min-h-0">
                <div ref={linesScrollRef} className="max-h-full overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs sticky top-0 z-10">
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
                        const selectedItem = entry.itemId ? itemsById.get(entry.itemId) : undefined;
                        const available = getAvailableStock(entry.itemId, entry.warehouseId);
                        const exceeds = entry.quantity > available;
                        const isProductOpen = openProductIdx === idx;
                        const isWhOpen = openWarehouseIdx === idx;
                        const productList = isProductOpen
                          ? (entry.itemId && !filteredItems.find(i => i.id === entry.itemId) && selectedItem
                              ? [...filteredItems, selectedItem]
                              : filteredItems)
                          : [];
                        return (
                          <tr key={entry.lineId} className="border-t">
                            <td className="px-1 py-1">
                              {entry.itemId ? (
                                <Select
                                  value={entry.itemId}
                                  onValueChange={(v) => updateLine(idx, 'itemId', v)}
                                  open={isProductOpen}
                                  onOpenChange={(o) => setOpenProductIdx(o ? idx : null)}
                                >
                                  <SelectTrigger className="h-8 border-0 shadow-none focus:ring-1">
                                    <SelectValue placeholder="Select product">
                                      {selectedItem ? `${selectedItem.sku} – ${selectedItem.name}` : 'Select product'}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {productList.map(item => (
                                      <SelectItem key={item.id} value={item.id}>{item.sku} – {item.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Popover
                                  open={openProductPickerLineId === entry.lineId}
                                  onOpenChange={(isOpen) => setOpenProductPickerLineId(isOpen ? entry.lineId : null)}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-full justify-between font-normal text-muted-foreground px-2"
                                    >
                                      Select product(s)
                                      <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="p-0 w-[420px]"
                                    align="start"
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                  >
                                    <Command>
                                      <CommandInput placeholder="Search product by SKU or name..." />
                                      <CommandList
                                        className="max-h-[320px] overflow-y-auto overscroll-contain"
                                        onWheel={(e) => e.stopPropagation()}
                                      >
                                        <CommandEmpty>No product found.</CommandEmpty>
                                        <CommandGroup>
                                          {filteredItems.map((item) => {
                                            const added = lines.some(e => e.itemId === item.id);
                                            const totalStock = item.stock.reduce((s, st) => s + st.quantity, 0);
                                            return (
                                              <CommandItem
                                                key={item.id}
                                                value={`${item.sku} ${item.name}`}
                                                disabled={totalStock === 0}
                                                onSelect={() => {
                                                  if (added || totalStock === 0) return;
                                                  addProductToLines(item.id, idx);
                                                  setOpenProductPickerLineId(entry.lineId);
                                                }}
                                              >
                                                <Check className={cn('mr-2 h-4 w-4', added ? 'opacity-100' : 'opacity-0')} />
                                                <span className="flex-1 truncate">{item.sku} – {item.name}</span>
                                                <span className="text-xs text-muted-foreground ml-2">{totalStock}</span>
                                              </CommandItem>
                                            );
                                          })}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </td>
                            <td className="px-1 py-1">
                              <Select
                                value={entry.warehouseId}
                                onValueChange={(v) => updateLine(idx, 'warehouseId', v)}
                                disabled={!entry.itemId}
                                open={isWhOpen}
                                onOpenChange={(o) => setOpenWarehouseIdx(o ? idx : null)}
                              >
                                <SelectTrigger className="h-8 border-0 shadow-none focus:ring-1">
                                  <SelectValue placeholder="—">
                                    {warehouses.find(w => w.id === entry.warehouseId)?.name || '—'}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {isWhOpen && warehouses.map(wh => {
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
                                data-qty-index={idx}
                                value={entry.quantity === 0 ? '' : entry.quantity}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateLine(idx, 'quantity', v === '' ? 0 : parseInt(v) || 0);
                                }}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                                    e.preventDefault();
                                    const dir = e.key === 'ArrowUp' ? -1 : 1;
                                    const next = document.querySelector<HTMLInputElement>(
                                      `input[data-qty-index="${idx + dir}"]`
                                    );
                                    if (next) { next.focus(); next.select(); }
                                  }
                                }}
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
                    <tfoot className="bg-muted/30 text-sm sticky bottom-0">
                      <tr className="border-t">
                        <td colSpan={2} className="px-2 py-1.5 text-muted-foreground text-xs">
                          {totalUnits} cases · {lines.length} line{lines.length !== 1 ? 's' : ''}
                        </td>
                        <td colSpan={3} className="px-2 py-1.5 text-right tabular-nums">
                          Subtotal: ${subtotal.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      <tr className="border-t">
                        <td colSpan={2} className="px-2 py-1.5 text-muted-foreground text-xs">
                          Shipping fee
                        </td>
                        <td colSpan={3} className="px-2 py-1 text-right">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            value={shippingFee}
                            onChange={(e) => setShippingFee(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="h-7 text-right border-0 shadow-none focus-visible:ring-1 no-spinner px-1 ml-auto w-28 inline-block"
                          />
                        </td>
                        <td></td>
                      </tr>
                      <tr className="border-t">
                        <td colSpan={2}></td>
                        <td colSpan={3} className="px-2 py-1.5 text-right font-semibold tabular-nums">
                          Total: ${totalValue.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={addLine} className="w-full h-8 text-xs flex-shrink-0">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add line
              </Button>
            </div>
          ) : (
            <div className="border border-dashed rounded-md py-6 text-center text-sm text-muted-foreground">
              No lines. <button type="button" className="underline text-foreground" onClick={addLine}>Add a line</button>
            </div>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 z-10 gap-2 px-6 py-4 border-t bg-background flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!isValid()}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
