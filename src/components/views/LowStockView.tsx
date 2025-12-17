import { AlertTriangle } from 'lucide-react';
import { InventoryItem } from '@/types/inventory';
import { getTotalQuantity, warehouses } from '@/data/mockData';

interface LowStockViewProps {
  items: InventoryItem[];
}

export function LowStockView({ items }: LowStockViewProps) {
  const lowStockItems = items.filter((item) => getTotalQuantity(item) < item.minStock);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Low Stock Alerts</h1>
        <p className="text-muted-foreground mt-1">
          Items that need to be restocked
        </p>
      </div>

      {lowStockItems.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 mx-auto flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">All stocked up!</h3>
          <p className="text-muted-foreground mt-2">
            No items are currently below their minimum stock level.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {lowStockItems.map((item) => {
            const total = getTotalQuantity(item);
            const needed = item.minStock - total;
            
            return (
              <div
                key={item.id}
                className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow animate-fade-in"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.category} • SKU: {item.sku}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-destructive">{total}</span>
                      <span className="text-muted-foreground">/ {item.minStock} min</span>
                    </div>
                    <p className="text-sm text-destructive font-medium">
                      Need {needed} more units
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Stock by Warehouse</p>
                  <div className="flex gap-2">
                    {warehouses.map((wh) => {
                      const stock = item.stock.find((s) => s.warehouseId === wh.id);
                      const qty = stock?.quantity || 0;
                      return (
                        <div
                          key={wh.id}
                          className="flex-1 bg-muted/50 rounded-lg p-3 text-center"
                        >
                          <p className="text-xs text-muted-foreground">{wh.name}</p>
                          <p className="font-bold text-foreground">{qty}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
