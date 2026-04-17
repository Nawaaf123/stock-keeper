import { useMemo, useState } from 'react';
import { InventoryItem, Order, InventoryTransaction } from '@/types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ClipboardList, ArrowUp, ArrowDown, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { getTotalQuantity } from '@/data/mockData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const summaryData = useMemo(() => {
    return items.map(item => {
      const stockEntries: { type: 'receive' | 'sale'; source: string; qty: number; date: Date }[] = [];

      transactions
        .filter(t => t.itemId === item.id && t.type === 'receive')
        .forEach(t => {
          stockEntries.push({ type: 'receive', source: `BOL: ${t.bolNumber}`, qty: t.quantity, date: t.date });
        });

      orders.forEach(order => {
        order.items.forEach(orderItem => {
          if (orderItem.itemId === item.id) {
            stockEntries.push({ type: 'sale', source: order.shopName, qty: orderItem.quantity, date: order.date });
          }
        });
      });

      stockEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

      const totalReceived = stockEntries.filter(e => e.type === 'receive').reduce((sum, e) => sum + e.qty, 0);
      const totalSold = stockEntries.filter(e => e.type === 'sale').reduce((sum, e) => sum + e.qty, 0);
      const currentStock = getTotalQuantity(item);
      const startingStock = currentStock - totalReceived + totalSold;

      let runningStock = startingStock;
      const entriesWithRemaining: StockEntry[] = stockEntries.map(entry => {
        runningStock += entry.type === 'receive' ? entry.qty : -entry.qty;
        return { ...entry, remainingAfter: runningStock };
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
      item.name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query)
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpanded(expanded.size === filteredSummaryData.length ? new Set() : new Set(filteredSummaryData.map(i => i.id)))}
              >
                {expanded.size === filteredSummaryData.length && filteredSummaryData.length > 0 ? 'Collapse all' : 'Expand all'}
              </Button>
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="font-semibold">SKU</TableHead>
                  <TableHead className="font-semibold">Product Name</TableHead>
                  <TableHead className="font-semibold text-center">Received</TableHead>
                  <TableHead className="font-semibold text-center">Sold</TableHead>
                  <TableHead className="font-semibold text-center">Remaining</TableHead>
                  <TableHead className="font-semibold text-center">Movements</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummaryData.map((item) => {
                  const isOpen = expanded.has(item.id);
                  const canExpand = item.entries.length > 0;
                  return (
                    <>
                      <TableRow
                        key={item.id}
                        className={cn("hover:bg-muted/30", canExpand && "cursor-pointer")}
                        onClick={() => canExpand && toggle(item.id)}
                      >
                        <TableCell className="py-2">
                          {canExpand ? (
                            isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs py-2">{item.sku}</TableCell>
                        <TableCell className="font-medium py-2">{item.name}</TableCell>
                        <TableCell className="text-center py-2">
                          <span className="text-green-600 font-semibold">+{item.totalReceived}</span>
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <span className="text-orange-600 font-semibold">-{item.totalSold}</span>
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <span className={item.currentStock < 10 ? "text-red-600 font-semibold" : "text-foreground font-semibold"}>
                            {item.currentStock}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-2 text-sm text-muted-foreground">
                          {item.entries.length}
                        </TableCell>
                      </TableRow>
                      {isOpen && canExpand && (
                        <TableRow key={`${item.id}-detail`} className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={7} className="p-0">
                            <div className="px-8 py-3">
                              <Table>
                                <TableHeader>
                                  <TableRow className="border-b border-border/50">
                                    <TableHead className="h-8 text-xs">Type</TableHead>
                                    <TableHead className="h-8 text-xs">Source</TableHead>
                                    <TableHead className="h-8 text-xs text-center">Qty</TableHead>
                                    <TableHead className="h-8 text-xs text-center">Remaining</TableHead>
                                    <TableHead className="h-8 text-xs">Date</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {item.entries.map((entry, idx) => (
                                    <TableRow key={idx} className="border-b-0 hover:bg-transparent">
                                      <TableCell className="py-1.5">
                                        {entry.type === 'receive' ? (
                                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                            <ArrowUp className="w-3 h-3 mr-1" />Receive
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                                            <ArrowDown className="w-3 h-3 mr-1" />Sale
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-sm py-1.5">{entry.source}</TableCell>
                                      <TableCell className="text-center py-1.5">
                                        <span className={entry.type === 'receive' ? "text-green-600 font-semibold" : "text-orange-600 font-semibold"}>
                                          {entry.type === 'receive' ? '+' : '-'}{entry.qty}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-center py-1.5">
                                        <span className={entry.remainingAfter < 10 ? "text-red-600 font-semibold" : "text-foreground"}>
                                          {entry.remainingAfter}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground py-1.5">
                                        {format(entry.date, 'dd/MM/yy')}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
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
