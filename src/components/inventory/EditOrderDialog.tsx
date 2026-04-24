import { useState, useEffect, useMemo } from 'react';
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

  useEffect(() => {
    if (order) {
      setShopName(order.shopName);
      setLines(order.items.map(i => ({
        itemId: i.itemId,
        warehouseId: i.warehouseId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })));
    }
  }, [order]);

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
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil className="w-4 h-4" /> Edit Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="Shop / customer name"
            className="h-9"
          />

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
                    return (
                      <tr key={idx} className="border-t">
                        <td className="px-1 py-1">
                          <Select value={entry.itemId} onValueChange={(v) => updateLine(idx, 'itemId', v)}>
                            <SelectTrigger className="h-8 border-0 shadow-none focus:ring-1">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map(item => (
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
                            value={entry.quantity}
                            onChange={(e) => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                            className={`h-8 text-right border-0 shadow-none focus-visible:ring-1 ${exceeds ? 'text-destructive' : ''}`}
                            disabled={!entry.warehouseId}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={entry.unitPrice}
                            onChange={(e) => updateLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="h-8 text-right border-0 shadow-none focus-visible:ring-1"
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

          <Button variant="ghost" size="sm" onClick={addLine} className="w-full h-8 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add line
          </Button>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!isValid()}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
