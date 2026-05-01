import { useMemo, useState } from 'react';
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { History, Search, Download, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Order, Payment } from '@/types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PaymentHistoryViewProps {
  orders: Order[];
  payments: Payment[];
  onDeletePayment: (id: string) => Promise<void>;
}

type DateRange = 'all' | 'today' | 'week' | 'month' | 'custom';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

export function PaymentHistoryView({ orders, payments, onDeletePayment }: PaymentHistoryViewProps) {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const orderMap = useMemo(() => {
    const m = new Map<string, Order>();
    orders.forEach(o => m.set(o.id, o));
    return m;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let from: Date | null = null;
    let to: Date | null = null;
    const now = new Date();
    if (dateRange === 'today') from = startOfDay(now);
    else if (dateRange === 'week') from = startOfWeek(now, { weekStartsOn: 1 });
    else if (dateRange === 'month') from = startOfMonth(now);
    else if (dateRange === 'custom') {
      from = customFrom ? startOfDay(customFrom) : null;
      to = customTo ? new Date(customTo.getTime() + 24 * 60 * 60 * 1000 - 1) : null;
    }

    return payments
      .filter(p => {
        const o = orderMap.get(p.orderId);
        const shopName = o?.shopName ?? '';
        if (q && !shopName.toLowerCase().includes(q) && !p.note.toLowerCase().includes(q)) return false;
        if (methodFilter !== 'all' && p.method !== methodFilter) return false;
        if (from && p.paymentDate < from) return false;
        if (to && p.paymentDate > to) return false;
        return true;
      })
      .sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());
  }, [payments, search, methodFilter, dateRange, customFrom, customTo, orderMap]);

  const totalAmount = useMemo(() => filtered.reduce((s, p) => s + p.amount, 0), [filtered]);

  const methods = useMemo(() => {
    const set = new Set<string>();
    payments.forEach(p => set.add(p.method));
    return Array.from(set).sort();
  }, [payments]);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Date', 'Wholesaler', 'Invoice', 'Amount', 'Method', 'Note'],
        ...filtered.map(p => {
          const o = orderMap.get(p.orderId);
          return [
            format(p.paymentDate, 'yyyy-MM-dd HH:mm'),
            o?.shopName ?? '-',
            `INV-${p.orderId.slice(0, 8).toUpperCase()}`,
            p.amount,
            p.method,
            p.note,
          ];
        }),
      ]),
      'Payment History',
    );
    XLSX.writeFile(wb, `payment-history-${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handleClear = () => {
    setSearch('');
    setMethodFilter('all');
    setDateRange('all');
    setCustomFrom(undefined);
    setCustomTo(undefined);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await onDeletePayment(deleteId);
      toast.success('Payment deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete payment');
    } finally {
      setDeleteId(null);
    }
  };

  const hasActive = !!search || methodFilter !== 'all' || dateRange !== 'all';

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            Payment History
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            All recorded payments across wholesalers
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto" disabled={filtered.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search-payments">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-payments"
                placeholder="Wholesaler or note..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {methods.map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={v => setDateRange(v as DateRange)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {dateRange === 'custom' ? (
            <div className="space-y-2">
              <Label>From / To</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start font-normal', !customFrom && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customFrom ? format(customFrom, 'MMM d') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start font-normal', !customTo && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customTo ? format(customTo, 'MMM d') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : (
            <div className="flex items-end">
              {hasActive && (
                <Button variant="ghost" onClick={handleClear} className="w-full">Clear filters</Button>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">
            {filtered.length} payment{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
          <div className="text-sm font-semibold">
            Total: <span className="text-primary">{fmt(totalAmount)}</span>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No payments match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Wholesaler</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => {
                    const o = orderMap.get(p.orderId);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(p.paymentDate, 'MMM d, yyyy')}
                          <div className="text-xs text-muted-foreground">{format(p.paymentDate, 'HH:mm')}</div>
                        </TableCell>
                        <TableCell className="font-medium">{o?.shopName ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">INV-{p.orderId.slice(0, 8).toUpperCase()}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(p.amount)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">{p.method}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[280px] truncate" title={p.note}>
                          {p.note || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(p.id)}
                            className="text-destructive hover:text-destructive"
                            title="Delete payment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this payment record. The associated invoice balance will be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
