import { useMemo, useState } from 'react';
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, eachDayOfInterval } from 'date-fns';
import * as XLSX from 'xlsx';
import { CalendarIcon, Download, BarChart3, TrendingUp, Package, DollarSign, Users, Warehouse, AlertTriangle, Tags } from 'lucide-react';
import { Order, InventoryItem, InventoryTransaction, Warehouse as WarehouseType } from '@/types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getTotalQuantity } from '@/data/mockData';

interface ReportsViewProps {
  orders: Order[];
  items: InventoryItem[];
  transactions: InventoryTransaction[];
  warehouses: WarehouseType[];
}

type RangeKey = 'day' | 'week' | 'month' | 'custom';

export function ReportsView({ orders, items, transactions, warehouses }: ReportsViewProps) {
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

  const filteredTx = useMemo(() => {
    if (!from || !to) return [];
    return transactions.filter(t => t.date >= from && t.date <= to);
  }, [transactions, from, to]);

  // Top products
  const productStats = useMemo(() => {
    const map = new Map<string, { sku: string; name: string; category: string; qty: number; revenue: number; orderCount: number }>();
    filteredOrders.forEach(order => {
      order.items.forEach(line => {
        const item = items.find(i => i.id === line.itemId);
        const existing = map.get(line.itemId) ?? { sku: line.itemSku, name: line.itemName, category: item?.category ?? '-', qty: 0, revenue: 0, orderCount: 0 };
        existing.qty += line.quantity;
        existing.revenue += line.quantity * line.unitPrice;
        existing.orderCount += 1;
        map.set(line.itemId, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [filteredOrders, items]);

  // Top wholesalers (by shop name)
  const wholesalerStats = useMemo(() => {
    const map = new Map<string, { shop: string; orders: number; units: number; revenue: number }>();
    filteredOrders.forEach(o => {
      const existing = map.get(o.shopName) ?? { shop: o.shopName, orders: 0, units: 0, revenue: 0 };
      existing.orders += 1;
      o.items.forEach(line => {
        existing.units += line.quantity;
        existing.revenue += line.quantity * line.unitPrice;
      });
      map.set(o.shopName, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  // Sales by category
  const categoryStats = useMemo(() => {
    const map = new Map<string, { category: string; units: number; revenue: number; products: Set<string> }>();
    filteredOrders.forEach(o => o.items.forEach(line => {
      const item = items.find(i => i.id === line.itemId);
      const cat = item?.category ?? 'Uncategorized';
      const existing = map.get(cat) ?? { category: cat, units: 0, revenue: 0, products: new Set() };
      existing.units += line.quantity;
      existing.revenue += line.quantity * line.unitPrice;
      existing.products.add(line.itemId);
      map.set(cat, existing);
    }));
    return Array.from(map.values())
      .map(c => ({ category: c.category, units: c.units, revenue: c.revenue, products: c.products.size }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, items]);

  // Daily trend
  const dailyTrend = useMemo(() => {
    if (!from || !to) return [];
    const days = eachDayOfInterval({ start: from, end: to });
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const dayOrders = filteredOrders.filter(o => o.date >= dayStart && o.date <= dayEnd);
      let units = 0, revenue = 0;
      dayOrders.forEach(o => o.items.forEach(line => {
        units += line.quantity;
        revenue += line.quantity * line.unitPrice;
      }));
      return { date: day, orders: dayOrders.length, units, revenue };
    });
  }, [filteredOrders, from, to]);

  const maxRevenue = Math.max(1, ...dailyTrend.map(d => d.revenue));

  // Warehouse activity
  const warehouseStats = useMemo(() => {
    return warehouses.map(w => {
      const received = filteredTx.filter(t => t.warehouseId === w.id && t.type === 'receive').reduce((s, t) => s + t.quantity, 0);
      let shipped = 0, revenue = 0;
      filteredOrders.forEach(o => o.items.forEach(line => {
        if (line.warehouseId === w.id) {
          shipped += line.quantity;
          revenue += line.quantity * line.unitPrice;
        }
      }));
      return { warehouse: w.name, received, shipped, net: received - shipped, revenue };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [warehouses, filteredTx, filteredOrders]);

  // Low stock (current state, not range-based)
  const lowStock = useMemo(() => {
    return items
      .map(item => ({ sku: item.sku, name: item.name, category: item.category, current: getTotalQuantity(item), min: item.minStock }))
      .filter(i => i.current <= i.min)
      .sort((a, b) => (a.current - a.min) - (b.current - b.min));
  }, [items]);

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
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Sales Report'],
      ['Range', rangeLabel],
      ['Generated', format(new Date(), 'dd MMM yyyy HH:mm')],
      [],
      ['Total Orders', totals.orderCount],
      ['Total Units Sold', totals.units],
      ['Total Revenue', totals.revenue],
      ['Distinct Products', totals.productCount],
    ]), 'Summary');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Rank', 'SKU', 'Product', 'Category', 'Units Sold', 'Orders', 'Revenue'],
      ...productStats.map((p, i) => [i + 1, p.sku, p.name, p.category, p.qty, p.orderCount, p.revenue]),
    ]), 'Top Products');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Rank', 'Shop', 'Orders', 'Units', 'Revenue'],
      ...wholesalerStats.map((w, i) => [i + 1, w.shop, w.orders, w.units, w.revenue]),
    ]), 'Top Wholesalers');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Category', 'Distinct Products', 'Units', 'Revenue'],
      ...categoryStats.map(c => [c.category, c.products, c.units, c.revenue]),
    ]), 'By Category');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Date', 'Orders', 'Units', 'Revenue'],
      ...dailyTrend.map(d => [format(d.date, 'yyyy-MM-dd'), d.orders, d.units, d.revenue]),
    ]), 'Daily Trend');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Warehouse', 'Received', 'Shipped', 'Net Change', 'Revenue'],
      ...warehouseStats.map(w => [w.warehouse, w.received, w.shipped, w.net, w.revenue]),
    ]), 'Warehouses');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['SKU', 'Product', 'Category', 'Current Stock', 'Min Stock', 'Shortfall'],
      ...lowStock.map(i => [i.sku, i.name, i.category, i.current, i.min, i.min - i.current]),
    ]), 'Low Stock');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Order ID', 'Shop', 'Date', 'SKU', 'Product', 'Warehouse', 'Quantity', 'Unit Price', 'Line Total'],
      ...filteredOrders.flatMap(o => o.items.map(line => [
        o.id, o.shopName, format(o.date, 'yyyy-MM-dd'),
        line.itemSku, line.itemName, line.warehouseName,
        line.quantity, line.unitPrice, line.quantity * line.unitPrice,
      ])),
    ]), 'Orders Detail');

    XLSX.writeFile(wb, `sales-report-${format(from ?? new Date(), 'yyyyMMdd')}-${format(to ?? new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Sales analytics across products, wholesalers, categories, and warehouses</p>
        </div>
        <Button onClick={handleExport}>
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

      <Tabs defaultValue="products">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
          <TabsTrigger value="products"><Package className="w-4 h-4 mr-1" />Products</TabsTrigger>
          <TabsTrigger value="wholesalers"><Users className="w-4 h-4 mr-1" />Wholesalers</TabsTrigger>
          <TabsTrigger value="categories"><Tags className="w-4 h-4 mr-1" />Categories</TabsTrigger>
          <TabsTrigger value="trend"><TrendingUp className="w-4 h-4 mr-1" />Daily</TabsTrigger>
          <TabsTrigger value="warehouses"><Warehouse className="w-4 h-4 mr-1" />Warehouses</TabsTrigger>
          <TabsTrigger value="lowstock"><AlertTriangle className="w-4 h-4 mr-1" />Low Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ReportTable
            title="Top Selling Products"
            headers={['#', 'SKU', 'Product', 'Category', 'Orders', 'Units', 'Revenue']}
            aligns={['left', 'left', 'left', 'left', 'center', 'center', 'right']}
            rows={productStats.map((p, i) => [i + 1, <span className="font-mono text-xs">{p.sku}</span>, <span className="font-medium">{p.name}</span>, <span className="text-muted-foreground text-sm">{p.category}</span>, p.orderCount, <span className="font-semibold">{p.qty}</span>, <span className="font-semibold">${p.revenue.toFixed(2)}</span>])}
            emptyText="No sales in this range"
          />
        </TabsContent>

        <TabsContent value="wholesalers">
          <ReportTable
            title="Top Wholesalers"
            headers={['#', 'Shop', 'Orders', 'Units', 'Revenue']}
            aligns={['left', 'left', 'center', 'center', 'right']}
            rows={wholesalerStats.map((w, i) => [i + 1, <span className="font-medium">{w.shop}</span>, w.orders, <span className="font-semibold">{w.units}</span>, <span className="font-semibold">${w.revenue.toFixed(2)}</span>])}
            emptyText="No wholesalers with orders in this range"
          />
        </TabsContent>

        <TabsContent value="categories">
          <ReportTable
            title="Sales by Category"
            headers={['Category', 'Distinct Products', 'Units', 'Revenue']}
            aligns={['left', 'center', 'center', 'right']}
            rows={categoryStats.map(c => [<span className="font-medium">{c.category}</span>, c.products, <span className="font-semibold">{c.units}</span>, <span className="font-semibold">${c.revenue.toFixed(2)}</span>])}
            emptyText="No category sales in this range"
          />
        </TabsContent>

        <TabsContent value="trend">
          <Card>
            <CardHeader className="pb-3"><CardTitle>Daily Sales Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {dailyTrend.map(d => (
                  <div key={d.date.toISOString()} className="flex items-center gap-3 text-sm">
                    <div className="w-24 text-muted-foreground">{format(d.date, 'EEE dd MMM')}</div>
                    <div className="flex-1 bg-muted rounded h-6 relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-primary/70 transition-all" style={{ width: `${(d.revenue / maxRevenue) * 100}%` }} />
                    </div>
                    <div className="w-16 text-right text-muted-foreground">{d.orders} ord</div>
                    <div className="w-20 text-right font-semibold">${d.revenue.toFixed(0)}</div>
                  </div>
                ))}
                {dailyTrend.length === 0 && <div className="text-center py-8 text-muted-foreground">Select a range</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warehouses">
          <ReportTable
            title="Warehouse Activity"
            headers={['Warehouse', 'Received', 'Shipped', 'Net Change', 'Revenue']}
            aligns={['left', 'center', 'center', 'center', 'right']}
            rows={warehouseStats.map(w => [
              <span className="font-medium">{w.warehouse}</span>,
              <span className="text-green-600 font-semibold">+{w.received}</span>,
              <span className="text-orange-600 font-semibold">-{w.shipped}</span>,
              <span className={w.net >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>{w.net >= 0 ? '+' : ''}{w.net}</span>,
              <span className="font-semibold">${w.revenue.toFixed(2)}</span>,
            ])}
            emptyText="No warehouse activity in this range"
          />
        </TabsContent>

        <TabsContent value="lowstock">
          <ReportTable
            title="Low Stock Alert (current)"
            headers={['SKU', 'Product', 'Category', 'Current', 'Min', 'Status']}
            aligns={['left', 'left', 'left', 'center', 'center', 'center']}
            rows={lowStock.map(i => [
              <span className="font-mono text-xs">{i.sku}</span>,
              <span className="font-medium">{i.name}</span>,
              <span className="text-muted-foreground text-sm">{i.category}</span>,
              <span className={i.current === 0 ? "text-red-600 font-bold" : "text-orange-600 font-semibold"}>{i.current}</span>,
              i.min,
              <Badge variant={i.current === 0 ? "destructive" : "outline"} className={i.current > 0 ? "bg-orange-50 text-orange-700 border-orange-200" : ""}>
                {i.current === 0 ? 'Out of stock' : 'Low'}
              </Badge>,
            ])}
            emptyText="All products are above their minimum stock levels"
          />
        </TabsContent>
      </Tabs>
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

function ReportTable({ title, headers, aligns, rows, emptyText }: { title: string; headers: string[]; aligns: ('left' | 'center' | 'right')[]; rows: React.ReactNode[][]; emptyText: string }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {headers.map((h, i) => (
                  <TableHead key={i} className={cn('font-semibold', aligns[i] === 'center' && 'text-center', aligns[i] === 'right' && 'text-right')}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i} className="hover:bg-muted/30">
                  {row.map((cell, j) => (
                    <TableCell key={j} className={cn(aligns[j] === 'center' && 'text-center', aligns[j] === 'right' && 'text-right')}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={headers.length} className="text-center py-8 text-muted-foreground">{emptyText}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
