import { useMemo, useState } from 'react';
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay } from 'date-fns';
import * as XLSX from 'xlsx';
import { CalendarIcon, Download, BarChart3, TrendingUp, Package, DollarSign } from 'lucide-react';
import { Order, InventoryItem } from '@/types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ReportsViewProps {
  orders: Order[];
  items: InventoryItem[];
}

type RangeKey = 'day' | 'week' | 'month' | 'custom';

export function ReportsView({ orders, items }: ReportsViewProps) {
  const [range, setRange] = useState<RangeKey>('month');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (range === 'day') return { from: startOfDay(now), to: endOfDay(now) };
    if (range === 'week') return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
    if (range === 'month') return { from: startOfMonth(now), to: endOfDay(now) };
    return {
      from: customFrom ? startOfDay(customFrom) : undefined,
      to: customTo ? endOfDay(customTo) : undefined,
    };
  }, [range, customFrom, customTo]);

  const filteredOrders = useMemo(() => {
    if (!from || !to) return [];
    return orders.filter(o => o.date >= from && o.date <= to);
  }, [orders, from, to]);

  const productStats = useMemo(() => {
    const map = new Map<string, { sku: string; name: string; category: string; qty: number; revenue: number; orderCount: number }>();
    filteredOrders.forEach(order => {
      order.items.forEach(line => {
        const item = items.find(i => i.id === line.itemId);
        const existing = map.get(line.itemId) ?? {
          sku: line.itemSku,
          name: line.itemName,
          category: item?.category ?? '-',
          qty: 0,
          revenue: 0,
          orderCount: 0,
        };
        existing.qty += line.quantity;
        existing.revenue += line.quantity * line.unitPrice;
        existing.orderCount += 1;
        map.set(line.itemId, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [filteredOrders, items]);

  const totals = useMemo(() => ({
    units: productStats.reduce((s, p) => s + p.qty, 0),
    revenue: productStats.reduce((s, p) => s + p.revenue, 0),
    orderCount: filteredOrders.length,
    productCount: productStats.length,
  }), [productStats, filteredOrders]);

  const rangeLabel = useMemo(() => {
    if (!from || !to) return 'Select a date range';
    return `${format(from, 'dd MMM yyyy')} – ${format(to, 'dd MMM yyyy')}`;
  }, [from, to]);

  const handleExport = () => {
    const summary = [
      ['Sales Report'],
      ['Range', rangeLabel],
      ['Generated', format(new Date(), 'dd MMM yyyy HH:mm')],
      [],
      ['Total Orders', totals.orderCount],
      ['Total Units Sold', totals.units],
      ['Total Revenue', totals.revenue],
      ['Distinct Products', totals.productCount],
      [],
      ['Rank', 'SKU', 'Product', 'Category', 'Units Sold', 'Orders', 'Revenue'],
      ...productStats.map((p, idx) => [idx + 1, p.sku, p.name, p.category, p.qty, p.orderCount, p.revenue]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(summary);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Top Products');

    const ordersSheet = [
      ['Order ID', 'Shop', 'Date', 'SKU', 'Product', 'Warehouse', 'Quantity', 'Unit Price', 'Line Total'],
      ...filteredOrders.flatMap(o =>
        o.items.map(line => [
          o.id, o.shopName, format(o.date, 'yyyy-MM-dd'),
          line.itemSku, line.itemName, line.warehouseName,
          line.quantity, line.unitPrice, line.quantity * line.unitPrice,
        ])
      ),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ordersSheet), 'Orders Detail');

    XLSX.writeFile(wb, `sales-report-${format(from ?? new Date(), 'yyyyMMdd')}-${format(to ?? new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Top-selling products by period</p>
        </div>
        <Button onClick={handleExport} disabled={productStats.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
              <TabsList>
                <TabsTrigger value="day">Today</TabsTrigger>
                <TabsTrigger value="week">This Week</TabsTrigger>
                <TabsTrigger value="month">This Month</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>
            </Tabs>

            {range === 'custom' && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {customFrom ? format(customFrom, 'dd MMM yyyy') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">–</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {customTo ? format(customTo, 'dd MMM yyyy') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="text-sm text-muted-foreground lg:ml-auto">{rangeLabel}</div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile icon={BarChart3} label="Orders" value={totals.orderCount.toString()} />
            <StatTile icon={Package} label="Units Sold" value={totals.units.toLocaleString()} />
            <StatTile icon={DollarSign} label="Revenue" value={`$${totals.revenue.toFixed(2)}`} />
            <StatTile icon={TrendingUp} label="Products" value={totals.productCount.toString()} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead className="text-center">Units Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productStats.map((p, idx) => (
                  <TableRow key={p.sku} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.category}</TableCell>
                    <TableCell className="text-center">{p.orderCount}</TableCell>
                    <TableCell className="text-center font-semibold">{p.qty}</TableCell>
                    <TableCell className="text-right font-semibold">${p.revenue.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {productStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No sales in this range
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

function StatTile({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
