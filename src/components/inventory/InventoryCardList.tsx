import { Edit2, Trash2, Plus, Eye, Package } from 'lucide-react';
import { InventoryItem, Warehouse } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTotalQuantity } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface InventoryCardListProps {
  items: InventoryItem[];
  warehouses: Warehouse[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onReceiveStock: (item: InventoryItem) => void;
  onViewDetails: (item: InventoryItem) => void;
}

export function InventoryCardList({
  items,
  warehouses,
  onEdit,
  onDelete,
  onReceiveStock,
  onViewDetails,
}: InventoryCardListProps) {
  if (items.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
        No items found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const total = getTotalQuantity(item);
        const isLow = total < item.minStock;
        return (
          <div
            key={item.id}
            className="bg-card rounded-lg border border-border p-3 active:bg-muted/40 transition-colors"
            onClick={() => onViewDetails(item)}
            role="button"
          >
            {/* Top row: name + total */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground truncate">{item.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  <code>{item.sku}</code>
                </div>
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <div className={cn(
                  'flex items-center gap-1 font-bold text-lg leading-none',
                  isLow ? 'text-destructive' : 'text-foreground'
                )}>
                  <Package className="w-4 h-4" />
                  {total}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">total</div>
              </div>
            </div>

            {/* Per-warehouse chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {warehouses.map((wh) => {
                const stock = item.stock.find((s) => s.warehouseId === wh.id);
                const qty = stock?.quantity || 0;
                return (
                  <Badge
                    key={wh.id}
                    variant="outline"
                    className={cn(
                      'text-xs font-normal px-2 py-0.5 gap-1',
                      qty === 0 && 'opacity-50'
                    )}
                  >
                    <span className="text-muted-foreground truncate max-w-[80px]">{wh.name}</span>
                    <span className="font-semibold tabular-nums text-foreground">{qty}</span>
                  </Badge>
                );
              })}
            </div>

            {/* Action row */}
            <div className="flex items-center gap-1 -mb-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-9"
                onClick={(e) => { e.stopPropagation(); onViewDetails(item); }}
              >
                <Eye className="w-4 h-4 mr-1" /> View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-9 text-primary"
                onClick={(e) => { e.stopPropagation(); onReceiveStock(item); }}
              >
                <Plus className="w-4 h-4 mr-1" /> Receive
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                aria-label="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                aria-label="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
