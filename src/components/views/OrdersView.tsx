import { useState } from 'react';
import { Order, InventoryItem } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateOrderDialog } from '@/components/inventory/CreateOrderDialog';
import { Plus, Store, Package, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface OrdersViewProps {
  orders: Order[];
  items: InventoryItem[];
  onCreateOrder: (shopName: string, items: { itemId: string; warehouseId: string; quantity: number }[]) => void;
}

export function OrdersView({ orders, items, onCreateOrder }: OrdersViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const groupedOrders = orders.reduce((acc, order) => {
    const dateKey = format(order.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">Manage outgoing orders and shipments</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Order
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Orders Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first order to start tracking outgoing shipments
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Order
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
                </h2>
                <Badge variant="secondary">{groupedOrders[dateKey].length} orders</Badge>
              </div>

              <div className="space-y-3">
                {groupedOrders[dateKey].map((order) => (
                  <Card key={order.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Store className="w-4 h-4 text-primary" />
                          {order.shopName}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(order.date, 'h:mm a')}
                          </span>
                          <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm py-1 border-b last:border-0">
                            <span>
                              <span className="font-mono text-xs text-muted-foreground mr-2">
                                {item.itemSku}
                              </span>
                              {item.itemName}
                            </span>
                            <span className="text-muted-foreground">
                              {item.quantity} from {item.warehouseName}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t flex justify-between text-sm font-medium">
                        <span>Total Items</span>
                        <span>{order.items.reduce((sum, i) => sum + i.quantity, 0)} units</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        items={items}
        onCreateOrder={onCreateOrder}
      />
    </div>
  );
}
