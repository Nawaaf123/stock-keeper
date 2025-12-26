import { useMemo } from 'react';
import { InventoryItem, Order } from '@/types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ClipboardList } from 'lucide-react';
import { getTotalQuantity } from '@/data/mockData';
import { format } from 'date-fns';

interface StockSummaryViewProps {
  items: InventoryItem[];
  orders: Order[];
}

export function StockSummaryView({ items, orders }: StockSummaryViewProps) {
  const summaryData = useMemo(() => {
    return items.map(item => {
      // Calculate total sold from orders
      let totalSold = 0;
      const buyers = new Map<string, { qty: number; lastDate: Date }>();

      orders.forEach(order => {
        order.items.forEach(orderItem => {
          if (orderItem.itemId === item.id) {
            totalSold += orderItem.quantity;
            const existing = buyers.get(order.shopName);
            if (existing) {
              existing.qty += orderItem.quantity;
              if (order.date > existing.lastDate) {
                existing.lastDate = order.date;
              }
            } else {
              buyers.set(order.shopName, { qty: orderItem.quantity, lastDate: order.date });
            }
          }
        });
      });

      const currentStock = getTotalQuantity(item);

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        totalSold,
        currentStock,
        buyers: Array.from(buyers.entries())
          .sort((a, b) => b[1].lastDate.getTime() - a[1].lastDate.getTime())
          .map(([shop, data]) => ({ shop, qty: data.qty, lastDate: data.lastDate })),
      };
    }).sort((a, b) => b.totalSold - a.totalSold);
  }, [items, orders]);

  const totalsSold = summaryData.reduce((sum, item) => sum + item.totalSold, 0);
  const totalsStock = summaryData.reduce((sum, item) => sum + item.currentStock, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Stock Summary</h1>
        <p className="text-muted-foreground">Overview of sold quantities and remaining stock per product</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-sm text-muted-foreground">Total Products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{totalsSold}</div>
            <p className="text-sm text-muted-foreground">Total Units Sold</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{totalsStock}</div>
            <p className="text-sm text-muted-foreground">Total Stock Remaining</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Product Sales & Stock Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">SKU</TableHead>
                  <TableHead className="font-semibold">Product Name</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold text-center">Sold</TableHead>
                  <TableHead className="font-semibold text-center">In Stock</TableHead>
                  <TableHead className="font-semibold">Sold To (Shop: Qty)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={item.totalSold > 0 ? "text-orange-600 font-semibold" : "text-muted-foreground"}>
                        {item.totalSold}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={item.currentStock < 10 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                        {item.currentStock}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      {item.buyers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.buyers.map((buyer, idx) => (
                            <span key={idx} className="text-xs bg-muted px-2 py-0.5 rounded">
                              {buyer.shop}: {buyer.qty} ({format(buyer.lastDate, 'dd/MM')})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No sales yet</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {summaryData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No products in inventory
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
