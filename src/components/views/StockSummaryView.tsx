import { useMemo, useState } from 'react';
import { InventoryItem, Order, InventoryTransaction } from '@/types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ClipboardList, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { getTotalQuantity } from '@/data/mockData';
import { format } from 'date-fns';

interface StockSummaryViewProps {
  items: InventoryItem[];
  orders: Order[];
  transactions: InventoryTransaction[];
}

interface StockEntry {
  type: 'receive' | 'sale';
  source: string;
  qty: number;
  date: Date;
  remainingAfter: number;
}

export function StockSummaryView({ items, orders, transactions }: StockSummaryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const summaryData = useMemo(() => {
    return items.map(item => {
      // Collect all stock movements for this item
      const stockEntries: { type: 'receive' | 'sale'; source: string; qty: number; date: Date }[] = [];

      // Add receive transactions
      transactions
        .filter(t => t.itemId === item.id && t.type === 'receive')
        .forEach(t => {
          stockEntries.push({
            type: 'receive',
            source: `BOL: ${t.bolNumber}`,
            qty: t.quantity,
            date: t.date,
          });
        });

      // Add sales from orders
      orders.forEach(order => {
        order.items.forEach(orderItem => {
          if (orderItem.itemId === item.id) {
            stockEntries.push({
              type: 'sale',
              source: order.shopName,
              qty: orderItem.quantity,
              date: order.date,
            });
          }
        });
      });

      // Sort by date (oldest first)
      stockEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate total received and sold
      const totalReceived = stockEntries.filter(e => e.type === 'receive').reduce((sum, e) => sum + e.qty, 0);
      const totalSold = stockEntries.filter(e => e.type === 'sale').reduce((sum, e) => sum + e.qty, 0);
      const currentStock = getTotalQuantity(item);
      
      // Starting stock = current - received + sold (what we had before any transactions)
      const startingStock = currentStock - totalReceived + totalSold;

      // Calculate running remaining after each entry
      let runningStock = startingStock;
      const entriesWithRemaining: StockEntry[] = stockEntries.map(entry => {
        if (entry.type === 'receive') {
          runningStock += entry.qty;
        } else {
          runningStock -= entry.qty;
        }
        return {
          ...entry,
          remainingAfter: runningStock,
        };
      });

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        totalReceived,
        totalSold,
        currentStock,
        entries: entriesWithRemaining,
      };
    }).sort((a, b) => b.totalSold - a.totalSold);
  }, [items, orders, transactions]);

  const filteredSummaryData = useMemo(() => {
    if (!searchQuery.trim()) return summaryData;
    const query = searchQuery.toLowerCase();
    return summaryData.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.sku.toLowerCase().includes(query)
    );
  }, [summaryData, searchQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Stock Summary</h1>
        <p className="text-muted-foreground">Overview of sold quantities and remaining stock per product</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Product Sales & Stock Overview
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">SKU</TableHead>
                  <TableHead className="font-semibold">Product Name</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Source</TableHead>
                  <TableHead className="font-semibold text-center">Qty</TableHead>
                  <TableHead className="font-semibold text-center">Remaining</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummaryData.map((item) => {
                  if (item.entries.length === 0) {
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">-</TableCell>
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

                  return item.entries.map((entry, idx) => (
                    <TableRow key={`${item.id}-${idx}`} className="hover:bg-muted/30">
                      {idx === 0 ? (
                        <>
                          <TableCell className="font-mono text-xs" rowSpan={item.entries.length}>
                            {item.sku}
                          </TableCell>
                          <TableCell className="font-medium" rowSpan={item.entries.length}>
                            {item.name}
                          </TableCell>
                        </>
                      ) : null}
                      <TableCell>
                        {entry.type === 'receive' ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <ArrowUp className="w-3 h-3 mr-1" />
                            Receive
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            <ArrowDown className="w-3 h-3 mr-1" />
                            Sale
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{entry.source}</TableCell>
                      <TableCell className="text-center">
                        <span className={entry.type === 'receive' ? "text-green-600 font-semibold" : "text-orange-600 font-semibold"}>
                          {entry.type === 'receive' ? '+' : '-'}{entry.qty}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={entry.remainingAfter < 10 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                          {entry.remainingAfter}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(entry.date, 'dd/MM/yy')}
                      </TableCell>
                    </TableRow>
                  ));
                })}
                {filteredSummaryData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No products match your search' : 'No products in inventory'}
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
