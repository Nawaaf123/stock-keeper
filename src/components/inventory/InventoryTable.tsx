import { ChevronUp, ChevronDown, Edit2, Trash2 } from 'lucide-react';
import { InventoryItem, SortField, SortDirection } from '@/types/inventory';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface InventoryTableProps {
  items: InventoryItem[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

function SortIcon({ field, currentField, direction }: { field: SortField; currentField: SortField; direction: SortDirection }) {
  if (field !== currentField) return null;
  return direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
}

export function InventoryTable({ items, sortField, sortDirection, onSort, onEdit, onDelete }: InventoryTableProps) {
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
                  Product Name
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
                  Quantity
                  <SortIcon field="quantity" currentField={sortField} direction={sortDirection} />
                </div>
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
              <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Location</th>
              <th
                className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => onSort('lastUpdated')}
              >
                <div className="flex items-center gap-2">
                  Last Updated
                  <SortIcon field="lastUpdated" currentField={sortField} direction={sortDirection} />
                </div>
              </th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
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
                        item.quantity < item.minStock ? 'text-destructive' : 'text-foreground'
                      )}
                    >
                      {item.quantity}
                    </span>
                    {item.quantity < item.minStock && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
                        Low
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-foreground">{formatCurrency(item.price)}</td>
                <td className="px-6 py-4 text-muted-foreground">{item.location}</td>
                <td className="px-6 py-4 text-muted-foreground">{formatDate(item.lastUpdated)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(item)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(item.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
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
