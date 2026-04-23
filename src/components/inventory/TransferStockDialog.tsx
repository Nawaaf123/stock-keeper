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
import { ArrowRight, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TransferStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  warehouses: Warehouse[];
  onTransfer: (itemId: string, fromWarehouseId: string, toWarehouseId: string, quantity: number) => void;
}

export function TransferStockDialog({ open, onOpenChange, items, warehouses, onTransfer }: TransferStockDialogProps) {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  const selectedItem = items.find(i => i.id === selectedItemId);
  const availableStock = selectedItem?.stock.find(s => s.warehouseId === fromWarehouseId)?.quantity || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const qty = parseInt(quantity);
    
    if (!selectedItemId || !fromWarehouseId || !toWarehouseId || !qty) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    if (fromWarehouseId === toWarehouseId) {
      toast({ title: 'Error', description: 'Source and destination warehouse must be different', variant: 'destructive' });
      return;
    }

    if (qty > availableStock) {
      toast({ title: 'Error', description: `Only ${availableStock} cases available in source warehouse`, variant: 'destructive' });
      return;
    }

    if (qty <= 0) {
      toast({ title: 'Error', description: 'Quantity must be greater than 0', variant: 'destructive' });
      return;
    }

    onTransfer(selectedItemId, fromWarehouseId, toWarehouseId, qty);
    toast({ title: 'Success', description: `Transferred ${qty} cases successfully` });
    
    // Reset form
    setSelectedItemId('');
    setFromWarehouseId('');
    setToWarehouseId('');
    setQuantity('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedItemId('');
    setFromWarehouseId('');
    setToWarehouseId('');
    setQuantity('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Stock Between Warehouses</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Product</Label>
            <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={productPickerOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {selectedItem ? `${selectedItem.name} (${selectedItem.sku})` : 'Search and select a product...'}
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
                      {items.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={`${item.name} ${item.sku}`}
                          onSelect={() => {
                            setSelectedItemId(item.id);
                            setProductPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedItemId === item.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <span className="truncate">{item.name} ({item.sku})</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <Label>From Warehouse</Label>
              <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(wh => {
                    const stock = selectedItem?.stock.find(s => s.warehouseId === wh.id)?.quantity || 0;
                    return (
                      <SelectItem key={wh.id} value={wh.id} disabled={stock === 0}>
                        {wh.name} ({stock})
                      </SelectItem>
                    );
                  })}
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
            <Label>Quantity to Transfer</Label>
            <Input
              type="number"
              min="1"
              max={availableStock}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`Max: ${availableStock}`}
            />
            {fromWarehouseId && (
              <p className="text-xs text-muted-foreground">
                Available: {availableStock} cases
              </p>
            )}
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
