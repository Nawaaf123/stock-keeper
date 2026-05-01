import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InventoryItem, Warehouse, InventoryTransaction } from '@/types/inventory';
import { Plus, Trash2, Pencil, Upload, FileText, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ReceivingLine {
  itemId: string;
  warehouseId: string;
  quantity: number;
}

export interface ReceivingGroup {
  bolNumber: string;
  date: Date;
  lines: InventoryTransaction[];
}

interface EditReceivingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiving: ReceivingGroup | null;
  items: InventoryItem[];
  warehouses: Warehouse[];
  onUpdate: (
    bolNumber: string,
    newBolNumber: string,
    lines: ReceivingLine[],
    bolDocumentUrl?: string | null,
  ) => Promise<void> | void;
}

export function EditReceivingDialog({ open, onOpenChange, receiving, items, warehouses, onUpdate }: EditReceivingDialogProps) {
  const [bolNumber, setBolNumber] = useState('');
  const [lines, setLines] = useState<ReceivingLine[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');
  const [skuInput, setSkuInput] = useState('');
  const [qtyInput, setQtyInput] = useState('1');
  const [bolDocumentUrl, setBolDocumentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const skuRef = useRef<HTMLInputElement>(null);
  const linesScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (linesScrollRef.current) {
      linesScrollRef.current.scrollTop = linesScrollRef.current.scrollHeight;
    }
  }, [lines.length]);

  useEffect(() => {
    if (receiving) {
      setBolNumber(receiving.bolNumber);
      setLines(receiving.lines.map(l => ({
        itemId: l.itemId,
        warehouseId: l.warehouseId,
        quantity: l.quantity,
      })));
      setCategoryFilter('all');
      setSubCategoryFilter('all');
      setSkuInput('');
      setQtyInput('1');
    }
  }, [receiving]);

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

  const updateLine = (idx: number, field: keyof ReceivingLine, value: string | number) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: value };
    setLines(next);
  };

  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const addLine = () => setLines([...lines, { itemId: '', warehouseId: '', quantity: 1 }]);

  const handleQuickAdd = () => {
    const sku = skuInput.trim().toLowerCase();
    if (!sku) return;
    const qty = Math.max(1, parseInt(qtyInput) || 1);

    const item = items.find(i => i.sku.toLowerCase() === sku)
      || items.find(i => i.sku.toLowerCase().startsWith(sku))
      || items.find(i => i.name.toLowerCase().includes(sku));

    if (!item) { toast.error(`No product found for "${skuInput}"`); return; }

    // Default warehouse = first existing line's warehouse, else first warehouse
    const defaultWh = lines[0]?.warehouseId || warehouses[0]?.id || '';

    const existingIdx = lines.findIndex(l => l.itemId === item.id && l.warehouseId === defaultWh);
    if (existingIdx >= 0) {
      const updated = [...lines];
      updated[existingIdx].quantity += qty;
      setLines(updated);
    } else {
      setLines([...lines, { itemId: item.id, warehouseId: defaultWh, quantity: qty }]);
    }

    setSkuInput('');
    setQtyInput('1');
    skuRef.current?.focus();
  };

  const isValid = () => {
    if (!bolNumber.trim()) return false;
    const valid = lines.filter(l => l.itemId && l.warehouseId && l.quantity > 0);
    return valid.length > 0;
  };

  const handleSave = async () => {
    if (!receiving) return;
    if (!isValid()) { toast.error('Check BOL number, products, warehouses, and quantities'); return; }
    const valid = lines.filter(l => l.itemId && l.warehouseId && l.quantity > 0);
    await onUpdate(receiving.bolNumber, bolNumber.trim(), valid);
    toast.success('Receiving updated and inventory adjusted');
    onOpenChange(false);
  };

  const totalCases = lines.reduce((s, l) => s + (l.itemId && l.warehouseId ? l.quantity : 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-5xl h-[90vh] max-h-[90vh] sm:h-[90vh] sm:max-h-[90vh] !grid-cols-1 !gap-0 !overflow-hidden sm:!overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil className="w-4 h-4" /> Edit Receiving
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-3 flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          <div className="grid grid-cols-[1fr_150px_150px] gap-2">
            <Input
              value={bolNumber}
              onChange={(e) => setBolNumber(e.target.value)}
              placeholder="BOL Number"
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
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((entry, idx) => {
                        const selectedItem = items.find(i => i.id === entry.itemId);
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
                              >
                                <SelectTrigger className="h-8 border-0 shadow-none focus:ring-1">
                                  <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                  {warehouses.map(wh => (
                                    <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                                  ))}
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
                                className="h-8 text-right border-0 shadow-none focus-visible:ring-1 no-spinner px-1"
                              />
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
                          {lines.length} line{lines.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
                          {totalCases} cases
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
