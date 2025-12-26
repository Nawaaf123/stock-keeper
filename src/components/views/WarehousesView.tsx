import { useState } from 'react';
import { warehouses } from '@/data/mockData';
import { InventoryItem } from '@/types/inventory';
import { MapPin, Package, DollarSign, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransferStockDialog } from '@/components/inventory/TransferStockDialog';

interface WarehousesViewProps {
  stats: {
    warehouseStats: { id: string; name: string; location: string; color: string; totalItems: number; totalValue: number }[];
  };
  items: InventoryItem[];
  onTransferStock: (itemId: string, fromWarehouseId: string, toWarehouseId: string, quantity: number) => void;
}

export function WarehousesView({ stats, items, onTransferStock }: WarehousesViewProps) {
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getWarehouseProducts = (warehouseId: string) => {
    return items
      .map((item) => {
        const stock = item.stock.find((s) => s.warehouseId === warehouseId);
        return { ...item, warehouseQty: stock?.quantity || 0 };
      })
      .filter((item) => item.warehouseQty > 0)
      .sort((a, b) => b.warehouseQty - a.warehouseQty)
      .slice(0, 5);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Warehouses</h1>
          <p className="text-muted-foreground mt-1">
            View inventory distribution across all locations
          </p>
        </div>
        <Button onClick={() => setTransferDialogOpen(true)}>
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          Transfer Stock
        </Button>
      </div>

      <TransferStockDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        items={items}
        onTransfer={onTransferStock}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {warehouses.map((wh) => {
          const whStats = stats.warehouseStats.find((s) => s.id === wh.id);
          const topProducts = getWarehouseProducts(wh.id);

          return (
            <div
              key={wh.id}
              className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in"
            >
              <div
                className="p-6 text-white"
                style={{ backgroundColor: wh.color }}
              >
                <h2 className="text-xl font-bold">{wh.name}</h2>
                <div className="flex items-center gap-1 mt-1 opacity-90">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{wh.location}</span>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Units</p>
                      <p className="text-lg font-bold">{whStats?.totalItems.toLocaleString() || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Value</p>
                      <p className="text-lg font-bold">{formatCurrency(whStats?.totalValue || 0)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Top Products</h3>
                  {topProducts.length > 0 ? (
                    <div className="space-y-2">
                      {topProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between py-2 border-b border-border last:border-0"
                        >
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                          <span className="font-semibold text-primary">{product.warehouseQty}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No products in this warehouse
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
