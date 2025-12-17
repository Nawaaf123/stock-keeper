import { ChevronUp, ChevronDown, Edit2, Trash2, Plus, Eye } from 'lucide-react';
import { InventoryItem, SortField, SortDirection } from '@/types/inventory';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getTotalQuantity, warehouses } from '@/data/mockData';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InventoryTableProps {
  items: InventoryItem[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onReceiveStock: (item: InventoryItem) => void;
  onViewDetails: (item: InventoryItem) => void;
}

function SortIcon({ field, currentField, direction }: { field: SortField; currentField: SortField; direction: SortDirection }) {
  if (field !== currentField) return null;
  return direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
}

export function InventoryTable({ items, sortField, sortDirection, onSort, onEdit, onDelete, onReceiveStock, onViewDetails }: InventoryTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th
                className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center gap-1">
                  Product
                  <SortIcon field="name" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">SKU</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Cat.</th>
              <th
                className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => onSort('quantity')}
              >
                <div className="flex items-center justify-center gap-1">
                  Qty
                  <SortIcon field="quantity" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  {warehouses.map(wh => (
                    <span key={wh.id} className="w-7 text-center" title={wh.name}>
                      {wh.name.replace('Warehouse ', '')}
                    </span>
                  ))}
                </div>
              </th>
              <th
                className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => onSort('price')}
              >
                <div className="flex items-center justify-end gap-1">
                  Price
                  <SortIcon field="price" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const total = getTotalQuantity(item);
              const isLowStock = total < item.minStock;
              
              return (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-3 py-1.5">
                    <span className="font-medium text-foreground">{item.name}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    <code className="text-xs text-muted-foreground">{item.sku}</code>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="text-xs text-muted-foreground">{item.category}</span>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <span
                      className={cn(
                        'font-semibold text-sm',
                        isLowStock ? 'text-destructive' : 'text-foreground'
                      )}
                    >
                      {total}
                    </span>
                    {isLowStock && (
                      <span className="ml-1 text-[10px] text-destructive">!</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-center gap-2">
                      {warehouses.map((wh) => {
                        const stock = item.stock.find((s) => s.warehouseId === wh.id);
                        const qty = stock?.quantity || 0;
                        return (
                          <Tooltip key={wh.id}>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  'w-7 text-center text-xs tabular-nums',
                                  qty > 0 ? 'text-foreground' : 'text-muted-foreground/50'
                                )}
                              >
                                {qty}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {wh.name}: {qty}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right text-foreground tabular-nums">{formatCurrency(item.price)}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-end gap-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewDetails(item)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onReceiveStock(item)}
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(item)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(item.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No items found
        </div>
      )}
    </div>
  );
}
