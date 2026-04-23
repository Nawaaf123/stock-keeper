import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { InventoryItem, Warehouse } from '@/types/inventory';
import { ArrowRight, Check, ChevronsUpDown, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TransferStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  warehouses: Warehouse[];
  onTransfer: (itemId: string, fromWarehouseId: string, toWarehouseId: string, quantity: number) => void;
}

interface TransferRow {
  id: string;
  itemId: string;
  quantity: string;
  pickerOpen: boolean;
}

const newRow = (): TransferRow => ({
  id: crypto.randomUUID(),
  itemId: '',
  quantity: '',
  pickerOpen: false,
});

export function TransferStockDialog({ open, onOpenChange, items, warehouses, onTransfer }: TransferStockDialogProps) {
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [rows, setRows] = useState<TransferRow[]>([newRow()]);

  const getAvailable = (itemId: string) => {
    if (!itemId || !fromWarehouseId) return 0;
    const item = items.find(i => i.id === itemId);
    return item?.stock.find(s => s.warehouseId === fromWarehouseId)?.quantity || 0;
  };

  const updateRow = (id: string, patch: Partial<TransferRow>) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows(prev => [...prev, newRow()]);
  const removeRow = (id: string) => setRows(prev => (prev.length === 1 ? prev : prev.filter(r => r.id !== id)));

  const reset = () => {
    setFromWarehouseId('');
    setToWarehouseId('');
    setRows([newRow()]);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromWarehouseId || !toWarehouseId) {
      toast({ title: 'Error', description: 'Select source and destination warehouses', variant: 'destructive' });
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast({ title: 'Error', description: 'Source and destination warehouse must be different', variant: 'destructive' });
      return;
    }

    const validRows: { itemId: string; qty: number }[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      const qty = parseInt(row.quantity);
      if (!row.itemId || !qty) {
        toast({ title: 'Error', description: 'Fill product and quantity for every row', variant: 'destructive' });
        return;
      }
      if (seen.has(row.itemId)) {
        toast({ title: 'Error', description: 'Each product can only be added once', variant: 'destructive' });
        return;
      }
      if (qty <= 0) {
        toast({ title: 'Error', description: 'Quantity must be greater than 0', variant: 'destructive' });
        return;
      }
      const available = getAvailable(row.itemId);
      if (qty > available) {
        const item = items.find(i => i.id === row.itemId);
        toast({ title: 'Error', description: `Only ${available} cases of ${item?.name ?? 'item'} available`, variant: 'destructive' });
        return;
      }
      seen.add(row.itemId);
      validRows.push({ itemId: row.itemId, qty });
    }

    validRows.forEach(r => onTransfer(r.itemId, fromWarehouseId, toWarehouseId, r.qty));
    toast({ title: 'Success', description: `Transferred ${validRows.length} product${validRows.length > 1 ? 's' : ''} successfully` });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : handleClose())}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transfer Stock Between Warehouses</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <Label>From Warehouse</Label>
              <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(wh => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="w-5 h-5 text-muted-foreground mt-6" />

            <div className="flex-1 space-y-2">
              <Label>To Warehouse</Label>
              <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(wh => (
                    <SelectItem key={wh.id} value={wh.id} disabled={wh.id === fromWarehouseId}>
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Products to Transfer</Label>
              <Button type="button" size="sm" variant="outline" onClick={addRow} className="gap-1">
                <Plus className="w-3.5 h-3.5" />
                Add Product
              </Button>
            </div>

            <div className="space-y-2">
              {rows.map((row, idx) => {
                const selected = items.find(i => i.id === row.itemId);
                const available = getAvailable(row.itemId);
                return (
                  <div key={row.id} className="flex items-start gap-2 p-2 border rounded-md bg-muted/30">
                    <div className="flex-1 min-w-0 space-y-1">
                      <Popover
                        open={row.pickerOpen}
                        onOpenChange={(o) => updateRow(row.id, { pickerOpen: o })}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal h-9"
                          >
                            <span className="truncate">
                              {selected ? `${selected.name} (${selected.sku})` : 'Search product...'}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover" align="start">
                          <Command>
                            <CommandInput placeholder="Search by name or SKU..." />
                            <CommandList>
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {items.map((item) => {
                                  const stock = fromWarehouseId
                                    ? item.stock.find(s => s.warehouseId === fromWarehouseId)?.quantity || 0
                                    : null;
                                  return (
                                    <CommandItem
                                      key={item.id}
                                      value={`${item.name} ${item.sku}`}
                                      onSelect={() => {
                                        updateRow(row.id, { itemId: item.id, pickerOpen: false });
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          row.itemId === item.id ? 'opacity-100' : 'opacity-0'
                                        )}
                                      />
                                      <span className="truncate flex-1">{item.name} ({item.sku})</span>
                                      {stock !== null && (
                                        <span className="text-xs text-muted-foreground ml-2">{stock}</span>
                                      )}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {row.itemId && fromWarehouseId && (
                        <p className="text-xs text-muted-foreground px-1">
                          Available: {available} cases
                        </p>
                      )}
                    </div>

                    <div className="w-28">
                      <Input
                        type="number"
                        min="1"
                        max={available || undefined}
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                        placeholder="Qty"
                        className="h-9"
                      />
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="h-9 w-9 shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Transfer Stock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
