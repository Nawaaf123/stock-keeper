import { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InventoryItem, Warehouse } from '@/types/inventory';
import { Package, Plus, Trash2, Upload, FileText, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ProductEntry {
  itemId: string;
  quantity: number;
}

interface ReceiveStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Warehouse[];
  item: InventoryItem | null;
  items?: InventoryItem[];
  onReceive: (itemId: string, warehouseId: string, quantity: number, bolNumber: string, bolDocumentUrl?: string | null) => void;
}

export function ReceiveStockDialog({ open, onOpenChange, warehouses, item, items = [], onReceive }: ReceiveStockDialogProps) {
  const [warehouseId, setWarehouseId] = useState('');
  const [bolNumber, setBolNumber] = useState('');
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([]);
  const [singleQuantity, setSingleQuantity] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');

  const [skuInput, setSkuInput] = useState('');
  const [qtyInput, setQtyInput] = useState('1');
  const [bolDocumentUrl, setBolDocumentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skuRef = useRef<HTMLInputElement>(null);
  const linesScrollRef = useRef<HTMLDivElement>(null);

  const isSingleItemMode = !!item;

  useEffect(() => {
    if (linesScrollRef.current) {
      linesScrollRef.current.scrollTop = linesScrollRef.current.scrollHeight;
    }
  }, [productEntries.length]);

  useEffect(() => {
    if (open && !isSingleItemMode) setTimeout(() => skuRef.current?.focus(), 50);
  }, [open, isSingleItemMode]);

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

  const resetForm = () => {
    setWarehouseId('');
    setBolNumber('');
    setProductEntries([]);
    setSingleQuantity(0);
    setCategoryFilter('all');
    setSubCategoryFilter('all');
    setSkuInput('');
    setQtyInput('1');
    setBolDocumentUrl(null);
  };

  const handleClose = () => { resetForm(); onOpenChange(false); };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('bol-documents').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      setBolDocumentUrl(path);
      toast.success('BOL document uploaded');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleQuickAdd = () => {
    const sku = skuInput.trim().toLowerCase();
    if (!sku) return;
    const qty = Math.max(1, parseInt(qtyInput) || 1);

    const found = items.find(i => i.sku.toLowerCase() === sku)
      || items.find(i => i.sku.toLowerCase().startsWith(sku))
      || items.find(i => i.name.toLowerCase().includes(sku));

    if (!found) { toast.error(`No product found for "${skuInput}"`); return; }

    const existingIdx = productEntries.findIndex(e => e.itemId === found.id);
    if (existingIdx >= 0) {
      const updated = [...productEntries];
      updated[existingIdx].quantity += qty;
      setProductEntries(updated);
    } else {
      setProductEntries([...productEntries, { itemId: found.id, quantity: qty }]);
    }

    setSkuInput('');
    setQtyInput('1');
    skuRef.current?.focus();
  };

  const handleItemChange = (index: number, field: keyof ProductEntry, value: string | number) => {
    const updated = [...productEntries];
    updated[index] = { ...updated[index], [field]: value };
    setProductEntries(updated);
  };

  const handleRemove = (index: number) => {
    setProductEntries(productEntries.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (isSingleItemMode) {
      if (item && warehouseId && singleQuantity > 0 && bolNumber.trim()) {
        onReceive(item.id, warehouseId, singleQuantity, bolNumber.trim(), bolDocumentUrl);
        handleClose();
      }
    } else {
      const valid = productEntries.filter(e => e.itemId && e.quantity > 0);
      if (warehouseId && bolNumber.trim() && valid.length > 0) {
        valid.forEach(e => onReceive(e.itemId, warehouseId, e.quantity, bolNumber.trim(), bolDocumentUrl));
        handleClose();
      }
    }
  };

  const isValid = isSingleItemMode
    ? !!warehouseId && !!bolNumber.trim() && singleQuantity > 0
    : !!warehouseId && !!bolNumber.trim() && productEntries.some(e => e.itemId && e.quantity > 0);

  const totalCases = productEntries.reduce((s, e) => s + (e.itemId ? e.quantity : 0), 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(o); }}>
      <DialogContent className="max-w-5xl sm:max-w-5xl h-[90vh] max-h-[90vh] sm:h-[90vh] sm:max-h-[90vh] !grid-cols-1 !gap-0 !overflow-hidden sm:!overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="w-4 h-4 text-primary" /> Receive Stock
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isSingleItemMode ? 'Add incoming inventory to a specific warehouse' : 'Add multiple products from a single BOL'}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-3 flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          {/* BOL + Warehouse + (filters) */}
          <div className={`grid gap-2 ${isSingleItemMode ? 'grid-cols-2' : 'grid-cols-[1fr_1fr_150px_150px]'}`}>
            <Input
              value={bolNumber}
              onChange={(e) => setBolNumber(e.target.value)}
              placeholder="BOL Number"
              className="h-9"
            />
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {warehouses.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isSingleItemMode && (
              <>
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
              </>
            )}
          </div>

          {/* BOL document upload */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
            {bolDocumentUrl ? (
              <div className="flex items-center gap-2 px-2 py-1 border rounded-md bg-muted/30 text-xs">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <button type="button" onClick={() => openBolDocument(bolDocumentUrl)} className="underline">View BOL document</button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => setBolDocumentUrl(null)}
                  type="button"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                {uploading ? 'Uploading…' : 'Attach BOL (PDF/Image)'}
              </Button>
            )}
          </div>

          {isSingleItemMode ? (
            <>
              {item && (
                <div className="bg-muted/50 rounded-md p-3">
                  <p className="font-semibold text-foreground text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground">Quantity to Add</label>
                <Input
                  type="number"
                  min={1}
                  value={singleQuantity || ''}
                  onChange={(e) => setSingleQuantity(parseInt(e.target.value) || 0)}
                  placeholder="Enter quantity"
                  className="h-9 mt-1"
                />
              </div>
            </>
          ) : (
            <>
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

              {productEntries.length > 0 ? (
                <div className="flex-1 min-h-0 flex flex-col gap-3">
                  <div className="border rounded-md overflow-hidden flex-1 min-h-0">
                    <div ref={linesScrollRef} className="max-h-full overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs sticky top-0 z-10">
                          <tr>
                            <th className="text-left px-2 py-1.5 font-medium">Product</th>
                            <th className="text-right px-2 py-1.5 font-medium w-28">Qty</th>
                            <th className="w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {productEntries.map((entry, index) => {
                            const selectedItem = items.find(i => i.id === entry.itemId);
                            const productList = entry.itemId && !filteredItems.find(i => i.id === entry.itemId)
                              ? [...filteredItems, selectedItem!]
                              : filteredItems;
                            return (
                              <tr key={index} className="border-t">
                                <td className="px-1 py-1">
                                  <Select value={entry.itemId} onValueChange={(v) => handleItemChange(index, 'itemId', v)}>
                                    <SelectTrigger className="h-8 border-0 shadow-none focus:ring-1">
                                      <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {productList.map((i) => (
                                        <SelectItem key={i.id} value={i.id}>{i.sku} – {i.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-1 py-1">
                                  <Input
                                    type="number"
                                    min={1}
                                    data-qty-index={index}
                                    value={entry.quantity === 0 ? '' : entry.quantity}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      handleItemChange(index, 'quantity', v === '' ? 0 : parseInt(v) || 0);
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                                        e.preventDefault();
                                        const dir = e.key === 'ArrowUp' ? -1 : 1;
                                        const next = document.querySelector<HTMLInputElement>(
                                          `input[data-qty-index="${index + dir}"]`
                                        );
                                        if (next) { next.focus(); next.select(); }
                                      }
                                    }}
                                    className="h-8 text-right border-0 shadow-none focus-visible:ring-1 no-spinner px-1"
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemove(index)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-muted/30 text-sm sticky bottom-0">
                          <tr className="border-t">
                            <td className="px-2 py-1.5 text-muted-foreground text-xs">
                              {productEntries.length} line{productEntries.length !== 1 ? 's' : ''}
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

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProductEntries([...productEntries, { itemId: '', quantity: 1 }])}
                    className="w-full h-8 text-xs flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add line
                  </Button>
                </div>
              ) : (
                <div className="border border-dashed rounded-md py-6 text-center text-sm text-muted-foreground">
                  Scan a SKU above or <button
                    type="button"
                    className="underline text-foreground"
                    onClick={() => setProductEntries([{ itemId: '', quantity: 1 }])}
                  >add a line manually</button>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 z-10 gap-2 px-6 py-4 border-t bg-background flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!isValid}>Receive Stock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
