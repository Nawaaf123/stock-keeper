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
  return direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
}

export function InventoryTable({ items, sortField, sortDirection, onSort, onEdit, onDelete, onReceiveStock, onViewDetails }: InventoryTableProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th
                className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center gap-2">
                  Product
                  <SortIcon field="name" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">SKU</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Category</th>
              <th
                className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => onSort('quantity')}
              >
                <div className="flex items-center gap-2">
                  Total Qty
                  <SortIcon field="quantity" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">
                Warehouse Distribution
              </th>
              <th
                className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => onSort('price')}
              >
                <div className="flex items-center gap-2">
                  Price
                  <SortIcon field="price" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const total = getTotalQuantity(item);
              const isLowStock = total < item.minStock;
              
              return (
                <tr
                  key={item.id}
                  className={cn(
                    'border-b border-border last:border-0 hover:bg-muted/30 transition-colors',
                    'animate-fade-in'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{item.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm bg-muted px-2 py-1 rounded text-muted-foreground">{item.sku}</code>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'font-semibold',
                          isLowStock ? 'text-destructive' : 'text-foreground'
                        )}
                      >
                        {total}
                      </span>
                      {isLowStock && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
                          Low
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      {warehouses.map((wh) => {
                        const stock = item.stock.find((s) => s.warehouseId === wh.id);
                        const qty = stock?.quantity || 0;
                        return (
                          <Tooltip key={wh.id}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'w-10 h-8 rounded flex items-center justify-center text-xs font-medium cursor-default',
                                  qty > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                )}
                              >
                                {qty}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{wh.name}: {qty} units</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-foreground">{formatCurrency(item.price)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onViewDetails(item)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Details</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onReceiveStock(item)}
                            className="h-8 w-8 text-muted-foreground hover:text-success"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Receive Stock</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(item)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit Item</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(item.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete Item</TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No items found matching your criteria
        </div>
      )}
    </div>
  );
}
