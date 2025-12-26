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
      // Get all sales for this item with dates
      const salesByWholesaler: { shop: string; qty: number; date: Date }[] = [];

      orders.forEach(order => {
        order.items.forEach(orderItem => {
          if (orderItem.itemId === item.id) {
            salesByWholesaler.push({
              shop: order.shopName,
              qty: orderItem.quantity,
              date: order.date,
            });
          }
        });
      });

      // Sort by date (oldest first) to calculate running balance
      salesByWholesaler.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate total sold and current stock
      const totalSold = salesByWholesaler.reduce((sum, s) => sum + s.qty, 0);
      const currentStock = getTotalQuantity(item);
      const startingStock = currentStock + totalSold;

      // Calculate running remaining after each sale
      let runningStock = startingStock;
      const salesWithRemaining = salesByWholesaler.map(sale => {
        runningStock -= sale.qty;
        return {
          ...sale,
          remainingAfter: runningStock,
        };
      });

      // Reverse to show most recent first
      salesWithRemaining.reverse();

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        totalSold,
        currentStock,
        sales: salesWithRemaining,
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
                  <TableHead className="font-semibold">Wholesaler</TableHead>
                  <TableHead className="font-semibold text-center">Sold</TableHead>
                  <TableHead className="font-semibold text-center">Remaining</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.map((item) => {
                  if (item.sales.length === 0) {
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">-</TableCell>
                        <TableCell className="text-center text-muted-foreground">0</TableCell>
                        <TableCell className="text-center">
                          <span className={item.currentStock < 10 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                            {item.currentStock}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">-</TableCell>
                      </TableRow>
                    );
                  }

                  return item.sales.map((sale, idx) => (
                    <TableRow key={`${item.id}-${idx}`} className="hover:bg-muted/30">
                      {idx === 0 ? (
                        <>
                          <TableCell className="font-mono text-xs" rowSpan={item.sales.length}>
                            {item.sku}
                          </TableCell>
                          <TableCell className="font-medium" rowSpan={item.sales.length}>
                            {item.name}
                          </TableCell>
                        </>
                      ) : null}
                      <TableCell className="text-sm font-medium">{sale.shop}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-orange-600 font-semibold">{sale.qty}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={sale.remainingAfter < 10 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                          {sale.remainingAfter}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(sale.date, 'dd/MM/yy')}
                      </TableCell>
                    </TableRow>
                  ));
                })}
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
