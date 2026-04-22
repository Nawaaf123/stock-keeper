import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  CreditCard,
  Search,
  Plus,
  Trash2,
  Download,
  ChevronDown,
  Check,
  X,
  Store,
  FileDown,
  DollarSign,
  Wallet,
  AlertCircle,
  FileText,
  Info,
  History,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Order, Payment, Wholesaler } from '@/types/inventory';
import { downloadInvoice } from '@/lib/invoice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface PaymentsViewProps {
  orders: Order[];
  payments: Payment[];
  wholesalers: Wholesaler[];
  onAddPayment: (orderId: string, amount: number, method: string, note: string, paymentDate?: Date) => Promise<void>;
  onDeletePayment: (id: string) => Promise<void>;
}

type StatusFilter = 'all' | 'unpaid' | 'partial' | 'paid';
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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [openDialog, setOpenDialog] = useState<{ orderId: string; suggested: number } | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedWholesaler, setSelectedWholesaler] = useState<string>('all');

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
    return Array.from(map.entries())
      .map(([name, rows]) => {
        const total = rows.reduce((s, r) => s + r.total, 0);
        const paid = rows.reduce((s, r) => s + r.paid, 0);
        const balance = total - paid;
        const unpaidCount = rows.filter(r => r.status !== 'paid').length;
        const sortedRows = [...rows].sort((a, b) => b.order.date.getTime() - a.order.date.getTime());
        return { name, rows: sortedRows, total, paid, balance, unpaidCount };
      })
      .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));
  }, [orderRows]);

  const wholesalerNames = useMemo(() => wholesalerGroups.map(g => g.name), [wholesalerGroups]);

  const filteredGroups = useMemo(() => {
    return wholesalerGroups
      .filter(g => selectedWholesaler === 'all' || g.name === selectedWholesaler)
      .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))
      .map(g => ({
        ...g,
        rows: g.rows.filter(r => filter === 'all' || r.status === filter),
      }))
      .filter(g => g.rows.length > 0);
  }, [wholesalerGroups, selectedWholesaler, search, filter]);

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

  const handleMarkPaid = async (row: OrderRow) => {
    if (row.balance <= 0.01) return;
    await onAddPayment(row.order.id, row.balance, 'cash', 'Marked as paid');
    toast.success(`Invoice for ${row.order.shopName} marked as paid`);
  };

  const handleMarkUnpaid = async (row: OrderRow) => {
    const orderPayments = payments.filter(p => p.orderId === row.order.id);
    if (orderPayments.length === 0) return;
    if (!confirm(`Remove all ${orderPayments.length} payment(s) for this invoice?`)) return;
    for (const p of orderPayments) await onDeletePayment(p.id);
    toast.success('Invoice marked as unpaid');
  };

  const openRecordDialog = (orderId: string, suggested: number) => {
    setOpenDialog({ orderId, suggested });
    setAmount(suggested > 0 ? suggested.toFixed(2) : '');
    setMethod('cash');
    setNote('');
  };

  const handleSubmit = async () => {
    if (!openDialog) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    await onAddPayment(openDialog.orderId, amt, method, note);
    toast.success('Payment recorded');
    setOpenDialog(null);
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
    if (status === 'paid')
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
          <Check className="w-3 h-3" /> Paid
        </Badge>
      );
    if (status === 'partial')
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 gap-1">
          <DollarSign className="w-3 h-3" /> Partial
        </Badge>
      );
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
        <AlertCircle className="w-3 h-3" /> Unpaid
      </Badge>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              Payments & Receivables
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track who owes you money. Each wholesaler card shows their total purchases, payments received, and outstanding balance.
            </p>
          </div>
          <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        {/* How it works helper */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
          <div>
            <span className="font-semibold">Quick guide: </span>
            Click the green <span className="font-semibold">Paid</span> button to mark an invoice fully paid, or click
            <span className="inline-flex items-center mx-1 px-1.5 py-0.5 border rounded text-xs"><Plus className="w-3 h-3" /></span>
            to record a partial payment. Use
            <span className="inline-flex items-center mx-1 px-1.5 py-0.5 border rounded text-xs"><FileDown className="w-3 h-3" /></span>
            to download the invoice PDF.
          </div>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            icon={<FileText className="w-4 h-4" />}
            label="Total Invoiced"
            value={fmt(totals.total)}
            hint="Sum of all order values"
          />
          <SummaryCard
            icon={<Wallet className="w-4 h-4" />}
            label="Total Received"
            value={fmt(totals.paid)}
            hint="Money collected so far"
            accent="green"
          />
          <SummaryCard
            icon={<AlertCircle className="w-4 h-4" />}
            label="Outstanding Balance"
            value={fmt(totals.outstanding)}
            hint="Money still owed to you"
            accent="red"
          />
          <SummaryCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Collection Rate"
            value={`${totals.collectionRate}%`}
            hint={`${totals.unpaidCount} invoice${totals.unpaidCount !== 1 ? 's' : ''} not fully paid`}
            progress={totals.collectionRate}
          />
        </div>

        {/* Wholesaler balances */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Wholesaler Balances
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Click any wholesaler to expand and see their individual invoices.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
                <Select value={selectedWholesaler} onValueChange={setSelectedWholesaler}>
                  <SelectTrigger className="w-full sm:w-56">
                    <Store className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                    <SelectValue placeholder="All wholesalers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All wholesalers</SelectItem>
                    {wholesalerNames.map(n => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="overflow-x-auto -mx-1 px-1">
                  <Tabs value={filter} onValueChange={v => setFilter(v as StatusFilter)}>
                    <TabsList className="w-max">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
                      <TabsTrigger value="partial">Partial</TabsTrigger>
                      <TabsTrigger value="paid">Paid</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="relative w-full sm:w-56 sm:ml-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search wholesaler..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredGroups.length === 0 && (
              <div className="text-center py-12 px-4 border-2 border-dashed rounded-lg">
                <Store className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="font-medium text-foreground">No wholesalers match the current filters</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try changing the status filter or clearing your search.
                </p>
              </div>
            )}
            {filteredGroups.map(g => {
              const isOpen = expanded[g.name] ?? (g.balance > 0.01 || selectedWholesaler !== 'all');
              const headerStatus: 'paid' | 'partial' | 'unpaid' =
                g.balance <= 0.01 ? 'paid' : g.paid > 0.01 ? 'partial' : 'unpaid';
              const pct = g.total > 0 ? Math.round((g.paid / g.total) * 100) : 0;
              const accentBar =
                headerStatus === 'paid' ? 'bg-green-500' : headerStatus === 'partial' ? 'bg-orange-500' : 'bg-red-500';
              return (
                <Collapsible
                  key={g.name}
                  open={isOpen}
                  onOpenChange={o => setExpanded(prev => ({ ...prev, [g.name]: o }))}
                  className="border rounded-lg overflow-hidden bg-card"
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-stretch text-left hover:bg-muted/40 transition-colors">
                      <div className={`w-1.5 ${accentBar} flex-shrink-0`} />
                      <div className="flex-1 flex items-start sm:items-center gap-3 px-3 sm:px-4 py-3">
                        <ChevronDown
                          className={`w-4 h-4 mt-1 sm:mt-0 text-muted-foreground transition-transform flex-shrink-0 ${
                            isOpen ? '' : '-rotate-90'
                          }`}
                        />
                        <Store className="w-4 h-4 mt-1 sm:mt-0 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold truncate">{g.name}</span>
                            {statusBadge(headerStatus)}
                            <Badge variant="secondary" className="text-xs">
                              {g.rows.length} invoice{g.rows.length !== 1 ? 's' : ''}
                            </Badge>
                            {g.unpaidCount > 0 && (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                {g.unpaidCount} open
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">{pct}% paid</span>
                          </div>
                          <div className="sm:hidden mt-2 grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <div className="text-muted-foreground">Total</div>
                              <div className="font-semibold">{fmt(g.total)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Paid</div>
                              <div className="font-semibold text-green-600">{fmt(g.paid)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Owes</div>
                              <div className={`font-bold ${g.balance > 0.01 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                {fmt(g.balance)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-6 text-sm flex-shrink-0">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Total Purchased</div>
                            <div className="font-semibold tabular-nums">{fmt(g.total)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Paid</div>
                            <div className="font-semibold text-green-600 tabular-nums">{fmt(g.paid)}</div>
                          </div>
                          <div className="text-right min-w-[110px]">
                            <div className="text-xs text-muted-foreground">Owes You</div>
                            <div
                              className={`font-bold tabular-nums ${
                                g.balance > 0.01 ? 'text-red-600' : 'text-muted-foreground'
                              }`}
                            >
                              {fmt(g.balance)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Invoice Date</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {g.rows.map(r => (
                            <TableRow key={r.order.id} className="hover:bg-muted/30">
                              <TableCell className="text-sm">
                                <div className="font-medium">{format(r.order.date, 'dd MMM yyyy')}</div>
                                <div className="text-xs text-muted-foreground">Invoice #{r.order.id.slice(0, 8)}</div>
                              </TableCell>
                              <TableCell className="text-right font-semibold tabular-nums">{fmt(r.total)}</TableCell>
                              <TableCell className="text-right text-green-600 font-semibold tabular-nums">
                                {fmt(r.paid)}
                              </TableCell>
                              <TableCell
                                className={`text-right font-semibold tabular-nums ${
                                  r.balance > 0.01 ? 'text-red-600' : 'text-muted-foreground'
                                }`}
                              >
                                {fmt(r.balance)}
                              </TableCell>
                              <TableCell className="text-center">{statusBadge(r.status)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {r.status !== 'paid' ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          onClick={() => handleMarkPaid(r)}
                                          className="h-7 bg-green-600 hover:bg-green-700 text-white"
                                        >
                                          <Check className="w-3 h-3 mr-1" />
                                          Paid
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Mark this invoice fully paid ({fmt(r.balance)})</TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleMarkUnpaid(r)}
                                          className="h-7 text-red-600 border-red-200 hover:bg-red-50"
                                        >
                                          <X className="w-3 h-3 mr-1" />
                                          Undo
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Remove all payments for this invoice</TooltipContent>
                                    </Tooltip>
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openRecordDialog(r.order.id, r.balance)}
                                        disabled={r.status === 'paid'}
                                        className="h-7"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Record a partial payment</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          downloadInvoice(r.order, wholesalers.find(w => w.name === r.order.shopName))
                                        }
                                        className="h-7"
                                      >
                                        <FileDown className="w-3 h-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Download invoice PDF</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </CardContent>
        </Card>

        {/* Payment history */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Payment History
            </CardTitle>
            <p className="text-xs text-muted-foreground">Every payment received, newest first. Click the trash icon to remove a payment.</p>
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
                        <TableRow key={p.id} className="hover:bg-muted/30">
                          <TableCell className="text-sm text-muted-foreground">
                            {format(p.paymentDate, 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">{o?.shopName ?? '—'}</TableCell>
                          <TableCell className="text-right text-green-600 font-semibold tabular-nums">
                            {fmt(p.amount)}
                          </TableCell>
                          <TableCell className="text-sm capitalize">{p.method}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.note || '—'}</TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" onClick={() => onDeletePayment(p.id)}>
                                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete this payment</TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No payments recorded yet. Use the green "Paid" button on any invoice above to start.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Record payment dialog */}
        <Dialog open={!!openDialog} onOpenChange={o => !o && setOpenDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              {openDialog && openDialog.suggested > 0 && (
                <p className="text-sm text-muted-foreground">
                  Outstanding balance for this invoice: <span className="font-semibold text-foreground">{fmt(openDialog.suggested)}</span>
                </p>
              )}
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Amount Received ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the full balance to mark this invoice paid, or any smaller amount for a partial payment.
                </p>
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Note (optional)</Label>
                <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Reference, check number, etc." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Record Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
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
  const valueColor =
    accent === 'green' ? 'text-green-600' : accent === 'red' ? 'text-red-600' : 'text-foreground';
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
