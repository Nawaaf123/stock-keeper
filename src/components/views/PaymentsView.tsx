import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  CreditCard,
  Search,
  Plus,
  Trash2,
  Download,
  ChevronDown,
  ChevronRight,
  Check,
  Store,
  FileDown,
  DollarSign,
  Wallet,
  AlertCircle,
  FileText,
  History,
  Filter,
  Calendar,
  ChevronsUpDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Order, Payment, Wholesaler } from '@/types/inventory';
import { downloadInvoice } from '@/lib/invoice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PaymentsViewProps {
  orders: Order[];
  payments: Payment[];
  wholesalers: Wholesaler[];
  onAddPayment: (orderId: string, amount: number, method: string, note: string, paymentDate?: Date) => Promise<void>;
  onDeletePayment: (id: string) => Promise<void>;
}

type StatusFilter = 'all' | 'unpaid' | 'partial' | 'paid';
type SortBy = 'balance_desc' | 'balance_asc' | 'name_asc' | 'name_desc';
type OrderRow = {
  order: Order;
  total: number;
  paid: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
};

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

export function PaymentsView({ orders, payments, wholesalers, onAddPayment, onDeletePayment }: PaymentsViewProps) {
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [shopFilter, setShopFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('balance_desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [shopComboOpen, setShopComboOpen] = useState(false);

  // Expanded groups
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Single-invoice payment dialog
  const [recordDialog, setRecordDialog] = useState<{ orderId: string; suggested: number; shopName: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [checkNumber, setCheckNumber] = useState('');
  const [note, setNote] = useState('');

  // Distribute payment dialog (whole wholesaler)
  const [distributeDialog, setDistributeDialog] = useState<{ shopName: string; rows: OrderRow[]; totalPending: number } | null>(null);
  const [distAmount, setDistAmount] = useState('');
  const [distMethod, setDistMethod] = useState('cash');
  const [distCheckNumber, setDistCheckNumber] = useState('');
  const [distNote, setDistNote] = useState('');
  const [distSubmitting, setDistSubmitting] = useState(false);

  // Compute per-order rows
  const orderRows: OrderRow[] = useMemo(() => {
    return orders.map(o => {
      const total = o.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const paid = payments.filter(p => p.orderId === o.id).reduce((s, p) => s + p.amount, 0);
      const balance = total - paid;
      const status: 'paid' | 'partial' | 'unpaid' = balance <= 0.01 ? 'paid' : paid > 0.01 ? 'partial' : 'unpaid';
      return { order: o, total, paid, balance, status };
    });
  }, [orders, payments]);

  // Group by wholesaler (shopName)
  const wholesalerGroups = useMemo(() => {
    const map = new Map<string, OrderRow[]>();
    orderRows.forEach(r => {
      const key = r.order.shopName || '—';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).map(([name, rows]) => {
      const total = rows.reduce((s, r) => s + r.total, 0);
      const paid = rows.reduce((s, r) => s + r.paid, 0);
      const balance = total - paid;
      const unpaidCount = rows.filter(r => r.status !== 'paid').length;
      const sortedRows = [...rows].sort((a, b) => b.order.date.getTime() - a.order.date.getTime());
      return { name, rows: sortedRows, total, paid, balance, unpaidCount };
    });
  }, [orderRows]);

  const wholesalerNames = useMemo(() => wholesalerGroups.map(g => g.name).sort(), [wholesalerGroups]);

  const filteredGroups = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
    const toTs = dateTo ? new Date(dateTo + 'T23:59:59.999').getTime() : null;

    let groups = wholesalerGroups
      .filter(g => shopFilter === 'all' || g.name === shopFilter)
      .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))
      .map(g => ({
        ...g,
        rows: g.rows.filter(r => {
          if (statusFilter !== 'all' && r.status !== statusFilter) return false;
          const ts = r.order.date.getTime();
          if (fromTs !== null && ts < fromTs) return false;
          if (toTs !== null && ts > toTs) return false;
          return true;
        }),
      }))
      .filter(g => g.rows.length > 0);

    groups.sort((a, b) => {
      switch (sortBy) {
        case 'balance_asc':
          return a.balance - b.balance;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'balance_desc':
        default:
          return b.balance - a.balance || a.name.localeCompare(b.name);
      }
    });
    return groups;
  }, [wholesalerGroups, shopFilter, search, statusFilter, sortBy, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const total = orderRows.reduce((s, r) => s + r.total, 0);
    const paid = orderRows.reduce((s, r) => s + r.paid, 0);
    const outstanding = orderRows.reduce((s, r) => s + Math.max(0, r.balance), 0);
    return {
      total,
      paid,
      outstanding,
      unpaidCount: orderRows.filter(r => r.status !== 'paid').length,
      collectionRate: total > 0 ? Math.round((paid / total) * 100) : 0,
    };
  }, [orderRows]);

  const hasActiveFilters =
    !!search || statusFilter !== 'all' || shopFilter !== 'all' || !!dateFrom || !!dateTo || sortBy !== 'balance_desc';

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setShopFilter('all');
    setSortBy('balance_desc');
    setDateFrom('');
    setDateTo('');
  };

  const openRecordDialog = (orderId: string, suggested: number, shopName: string) => {
    setRecordDialog({ orderId, suggested, shopName });
    setAmount(suggested > 0 ? suggested.toFixed(2) : '');
    setMethod('cash');
    setCheckNumber('');
    setNote('');
  };

  const handleSubmitRecord = async () => {
    if (!recordDialog) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const fullNote = method === 'check' && checkNumber ? `Check #${checkNumber}${note ? ` — ${note}` : ''}` : note;
    await onAddPayment(recordDialog.orderId, amt, method, fullNote);
    toast.success('Payment recorded');
    setRecordDialog(null);
  };

  const openDistributeDialog = (shopName: string, rows: OrderRow[], totalPending: number) => {
    setDistributeDialog({ shopName, rows, totalPending });
    setDistAmount('');
    setDistMethod('cash');
    setDistCheckNumber('');
    setDistNote('');
  };

  const handleSubmitDistribute = async () => {
    if (!distributeDialog) return;
    const amt = parseFloat(distAmount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amt > distributeDialog.totalPending + 0.01) {
      toast.error('Payment amount cannot exceed total pending balance');
      return;
    }

    setDistSubmitting(true);
    try {
      // Apply oldest first across rows with balance > 0
      const sorted = [...distributeDialog.rows]
        .filter(r => r.balance > 0.01)
        .sort((a, b) => a.order.date.getTime() - b.order.date.getTime());

      let remaining = amt;
      const fullNote = distMethod === 'check' && distCheckNumber
        ? `Check #${distCheckNumber}${distNote ? ` — ${distNote}` : ''}`
        : distNote;

      for (const r of sorted) {
        if (remaining <= 0.01) break;
        const apply = Math.min(remaining, r.balance);
        await onAddPayment(r.order.id, apply, distMethod, fullNote);
        remaining -= apply;
      }
      toast.success(`Payment distributed across invoices for ${distributeDialog.shopName}`);
      setDistributeDialog(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to distribute payment');
    } finally {
      setDistSubmitting(false);
    }
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Wholesaler', 'Total Purchased', 'Paid', 'Balance', 'Unpaid Invoices'],
        ...wholesalerGroups.map(g => [g.name, g.total, g.paid, g.balance, g.unpaidCount]),
      ]),
      'Wholesaler Summary',
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Wholesaler', 'Order Date', 'Order Total', 'Paid', 'Balance', 'Status'],
        ...orderRows.map(r => [r.order.shopName, format(r.order.date, 'yyyy-MM-dd'), r.total, r.paid, r.balance, r.status]),
      ]),
      'Invoices',
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Date', 'Wholesaler', 'Amount', 'Method', 'Note'],
        ...payments.map(p => {
          const o = orders.find(o => o.id === p.orderId);
          return [format(p.paymentDate, 'yyyy-MM-dd'), o?.shopName ?? '-', p.amount, p.method, p.note];
        }),
      ]),
      'Payment Log',
    );
    XLSX.writeFile(wb, `payments-${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const statusBadge = (status: 'paid' | 'partial' | 'unpaid') => {
    const variants: Record<typeof status, 'default' | 'secondary' | 'destructive'> = {
      paid: 'default',
      partial: 'secondary',
      unpaid: 'destructive',
    };
    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const selectedShop = wholesalerNames.find(n => n === shopFilter);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Payments & Receivables
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Track wholesaler invoices and record payments
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={<FileText className="w-4 h-4" />} label="Total Invoiced" value={fmt(totals.total)} />
        <SummaryCard icon={<Wallet className="w-4 h-4" />} label="Total Received" value={fmt(totals.paid)} accent="green" />
        <SummaryCard icon={<AlertCircle className="w-4 h-4" />} label="Outstanding" value={fmt(totals.outstanding)} accent="red" />
        <SummaryCard
          icon={<DollarSign className="w-4 h-4" />}
          label="Collection Rate"
          value={`${totals.collectionRate}%`}
          progress={totals.collectionRate}
          hint={`${totals.unpaidCount} invoice${totals.unpaidCount !== 1 ? 's' : ''} open`}
        />
      </div>

      {/* Filter card */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Filters</h3>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Wholesaler name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Payment Status</Label>
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Wholesaler</Label>
              <Popover open={shopComboOpen} onOpenChange={setShopComboOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={shopComboOpen} className="w-full justify-between font-normal">
                    {shopFilter === 'all' ? 'All Wholesalers' : selectedShop || 'Select...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search wholesalers..." />
                    <CommandList>
                      <CommandEmpty>No wholesaler found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setShopFilter('all');
                            setShopComboOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', shopFilter === 'all' ? 'opacity-100' : 'opacity-0')} />
                          All Wholesalers
                        </CommandItem>
                        {wholesalerNames.map(n => (
                          <CommandItem
                            key={n}
                            value={n}
                            onSelect={() => {
                              setShopFilter(n);
                              setShopComboOpen(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', shopFilter === n ? 'opacity-100' : 'opacity-0')} />
                            {n}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort">Sort By</Label>
              <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
                <SelectTrigger id="sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance_desc">Highest Balance</SelectItem>
                  <SelectItem value="balance_asc">Lowest Balance</SelectItem>
                  <SelectItem value="name_asc">Name (A→Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z→A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <div className="relative">
                <Input id="dateFrom" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <div className="relative">
                <Input id="dateTo" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Wholesaler groups */}
      <div className="space-y-4">
        {filteredGroups.length === 0 && (
          <div className="text-center py-12 px-4 border-2 border-dashed rounded-lg">
            <Store className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="font-medium text-foreground">No wholesalers match the current filters</p>
            <p className="text-sm text-muted-foreground mt-1">Try changing the status filter or clearing your search.</p>
          </div>
        )}

        {filteredGroups.map(g => {
          const isExpanded = expanded[g.name] ?? false;
          const pendingRows = g.rows.filter(r => r.balance > 0.01);
          return (
            <div key={g.name} className="border rounded-lg">
              {/* Group header */}
              <div className="bg-muted p-3 md:p-4">
                <div className="flex items-start gap-2 md:gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(prev => ({ ...prev, [g.name]: !isExpanded }))}
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base md:text-lg truncate flex items-center gap-2">
                          <Store className="w-4 h-4 text-primary flex-shrink-0" />
                          {g.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <Badge variant="outline">{g.rows.length} invoice(s)</Badge>
                          {g.unpaidCount > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              {g.unpaidCount} open
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 md:gap-4">
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-lg md:text-xl font-bold tabular-nums">{fmt(g.total)}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-muted-foreground">Pending</p>
                          <p
                            className={`text-lg md:text-xl font-bold tabular-nums ${
                              g.balance > 0.01 ? 'text-orange-600' : 'text-green-600'
                            }`}
                          >
                            {fmt(g.balance)}
                          </p>
                        </div>
                        {g.balance > 0.01 && (
                          <Button
                            size="sm"
                            onClick={() => openDistributeDialog(g.name, pendingRows, g.balance)}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Pay
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoices table */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.rows.map(r => (
                        <TableRow key={r.order.id}>
                          <TableCell className="font-medium">INV-{r.order.id.slice(0, 8).toUpperCase()}</TableCell>
                          <TableCell className="text-sm">{format(r.order.date, 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{fmt(r.total)}</TableCell>
                          <TableCell className="text-right text-green-600 font-semibold tabular-nums">{fmt(r.paid)}</TableCell>
                          <TableCell
                            className={`text-right font-semibold tabular-nums ${
                              r.balance > 0.01 ? 'text-orange-600' : 'text-green-600'
                            }`}
                          >
                            {fmt(r.balance)}
                          </TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {r.status !== 'paid' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openRecordDialog(r.order.id, r.balance, g.name)}
                                  title="Record Payment"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadInvoice(r.order, wholesalers.find(w => w.name === r.order.shopName))}
                                title="Download PDF"
                              >
                                <FileDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="w-5 h-5" />
            Payment History
          </CardTitle>
          <p className="text-xs text-muted-foreground">Every payment received, newest first.</p>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Wholesaler</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments
                  .slice()
                  .sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime())
                  .map(p => {
                    const o = orders.find(o => o.id === p.orderId);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm text-muted-foreground">{format(p.paymentDate, 'dd MMM yyyy')}</TableCell>
                        <TableCell className="font-medium">{o?.shopName ?? '—'}</TableCell>
                        <TableCell className="text-right text-green-600 font-semibold tabular-nums">{fmt(p.amount)}</TableCell>
                        <TableCell className="text-sm capitalize">{p.method}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.note || '—'}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => onDeletePayment(p.id)} title="Delete payment">
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No payments recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={!!recordDialog} onOpenChange={o => !o && setRecordDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            {recordDialog && (
              <DialogDescription>
                For {recordDialog.shopName} — Outstanding: <span className="font-semibold text-foreground">{fmt(recordDialog.suggested)}</span>
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Remaining Balance</Label>
              <div className="text-2xl font-bold text-primary">{recordDialog ? fmt(recordDialog.suggested) : '—'}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount"
                autoFocus
                required
              />
              {recordDialog && (
                <p className="text-xs text-muted-foreground">Maximum: {fmt(recordDialog.suggested)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {method === 'check' && (
              <div className="space-y-2">
                <Label htmlFor="checkNumber">Check Number</Label>
                <Input id="checkNumber" value={checkNumber} onChange={e => setCheckNumber(e.target.value)} placeholder="Enter check number" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="note">Notes</Label>
              <Textarea id="note" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional notes" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRecord}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribute Payment Dialog */}
      <Dialog open={!!distributeDialog} onOpenChange={o => !o && !distSubmitting && setDistributeDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Distribute Payment — {distributeDialog?.shopName}</DialogTitle>
            <DialogDescription>
              Payment will be applied across {distributeDialog?.rows.length ?? 0} pending invoice(s), oldest first.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Total Pending Amount</Label>
              <div className="text-2xl font-bold text-orange-600">{distributeDialog ? fmt(distributeDialog.totalPending) : '—'}</div>
            </div>

            <div className="space-y-2">
              <Label>Payment Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={distAmount}
                onChange={e => setDistAmount(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select value={distMethod} onValueChange={setDistMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {distMethod === 'check' && (
              <div className="space-y-2">
                <Label>Check Number</Label>
                <Input value={distCheckNumber} onChange={e => setDistCheckNumber(e.target.value)} placeholder="Enter check number" />
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={distNote} onChange={e => setDistNote(e.target.value)} placeholder="Optional notes" rows={2} />
            </div>

            {distributeDialog && (
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <p className="text-sm font-medium">Distribution Preview</p>
                <p className="text-xs text-muted-foreground">Applied in this order:</p>
                <div className="space-y-1">
                  {[...distributeDialog.rows]
                    .sort((a, b) => a.order.date.getTime() - b.order.date.getTime())
                    .slice(0, 3)
                    .map(r => (
                      <div key={r.order.id} className="flex items-center justify-between text-xs">
                        <span>INV-{r.order.id.slice(0, 8).toUpperCase()}</span>
                        <span className="text-orange-600 font-semibold tabular-nums">{fmt(r.balance)}</span>
                      </div>
                    ))}
                  {distributeDialog.rows.length > 3 && (
                    <p className="text-xs text-muted-foreground">…and {distributeDialog.rows.length - 3} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistributeDialog(null)} disabled={distSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitDistribute} disabled={distSubmitting}>
              {distSubmitting ? 'Processing...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  accent,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: 'green' | 'red';
  progress?: number;
}) {
  const valueColor = accent === 'green' ? 'text-green-600' : accent === 'red' ? 'text-red-600' : 'text-foreground';
  const iconBg =
    accent === 'green'
      ? 'bg-green-100 text-green-700'
      : accent === 'red'
      ? 'bg-red-100 text-red-700'
      : 'bg-primary/10 text-primary';
  return (
    <div className="p-4 rounded-lg border bg-card flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-md ${iconBg}`}>{icon}</div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      {typeof progress === 'number' && <Progress value={progress} className="h-1.5" />}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
