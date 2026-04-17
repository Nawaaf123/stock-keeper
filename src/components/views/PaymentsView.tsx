import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CreditCard, Search, Plus, Trash2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Order, Payment } from '@/types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface PaymentsViewProps {
  orders: Order[];
  payments: Payment[];
  onAddPayment: (orderId: string, amount: number, method: string, note: string) => Promise<void>;
  onDeletePayment: (id: string) => Promise<void>;
}

type StatusFilter = 'all' | 'unpaid' | 'partial' | 'paid';

export function PaymentsView({ orders, payments, onAddPayment, onDeletePayment }: PaymentsViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');

  const orderRows = useMemo(() => {
    return orders.map(o => {
      const total = o.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const orderPayments = payments.filter(p => p.orderId === o.id);
      const paid = orderPayments.reduce((s, p) => s + p.amount, 0);
      const balance = total - paid;
      const status: 'paid' | 'partial' | 'unpaid' = balance <= 0.01 ? 'paid' : paid > 0.01 ? 'partial' : 'unpaid';
      return { order: o, total, paid, balance, status, payments: orderPayments };
    }).sort((a, b) => b.order.date.getTime() - a.order.date.getTime());
  }, [orders, payments]);

  const filteredRows = useMemo(() => {
    return orderRows.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (search && !r.order.shopName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [orderRows, filter, search]);

  const totals = useMemo(() => ({
    total: orderRows.reduce((s, r) => s + r.total, 0),
    paid: orderRows.reduce((s, r) => s + r.paid, 0),
    outstanding: orderRows.reduce((s, r) => s + Math.max(0, r.balance), 0),
    unpaidCount: orderRows.filter(r => r.status !== 'paid').length,
  }), [orderRows]);

  const openFor = (orderId: string, suggestedBalance: number) => {
    setOpenDialog(orderId);
    setAmount(suggestedBalance > 0 ? suggestedBalance.toFixed(2) : '');
    setMethod('cash');
    setNote('');
  };

  const handleSubmit = async () => {
    if (!openDialog) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    await onAddPayment(openDialog, amt, method, note);
    toast.success('Payment recorded');
    setOpenDialog(null);
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Shop', 'Order Date', 'Order Total', 'Paid', 'Balance', 'Status'],
      ...orderRows.map(r => [r.order.shopName, format(r.order.date, 'yyyy-MM-dd'), r.total, r.paid, r.balance, r.status]),
    ]), 'Order Balances');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Date', 'Shop', 'Amount', 'Method', 'Note'],
      ...payments.map(p => {
        const o = orders.find(o => o.id === p.orderId);
        return [format(p.paymentDate, 'yyyy-MM-dd'), o?.shopName ?? '-', p.amount, p.method, p.note];
      }),
    ]), 'Payment Log');
    XLSX.writeFile(wb, `payments-${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const statusBadge = (status: 'paid' | 'partial' | 'unpaid') => {
    if (status === 'paid') return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
    if (status === 'partial') return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Partial</Badge>;
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Unpaid</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground">Track customer payments and outstanding balances per order</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />Export to Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Total Invoiced" value={`$${totals.total.toFixed(2)}`} />
        <StatTile label="Total Received" value={`$${totals.paid.toFixed(2)}`} accent="green" />
        <StatTile label="Outstanding" value={`$${totals.outstanding.toFixed(2)}`} accent="red" />
        <StatTile label="Unpaid / Partial Orders" value={totals.unpaidCount.toString()} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />Order Balances
            </CardTitle>
            <div className="flex items-center gap-2">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
                  <TabsTrigger value="partial">Partial</TabsTrigger>
                  <TabsTrigger value="paid">Paid</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search shop..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Shop</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map(r => (
                  <TableRow key={r.order.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{r.order.shopName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(r.order.date, 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-right font-semibold">${r.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-green-600 font-semibold">${r.paid.toFixed(2)}</TableCell>
                    <TableCell className={`text-right font-semibold ${r.balance > 0.01 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      ${r.balance.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openFor(r.order.id, r.balance)} disabled={r.status === 'paid'}>
                        <Plus className="w-3 h-3 mr-1" />Record
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders match</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle>Payment History</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map(p => {
                  const o = orders.find(o => o.id === p.orderId);
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm text-muted-foreground">{format(p.paymentDate, 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-medium">{o?.shopName ?? '—'}</TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">${p.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-sm capitalize">{p.method}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.note || '—'}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => onDeletePayment(p.id)}>
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {payments.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payments recorded yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!openDialog} onOpenChange={(o) => !o && setOpenDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
            </div>
            <div>
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Button variant="outline" onClick={() => setOpenDialog(null)}>Cancel</Button>
            <Button onClick={handleSubmit}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: 'green' | 'red' }) {
  const color = accent === 'green' ? 'text-green-600' : accent === 'red' ? 'text-red-600' : 'text-foreground';
  return (
    <div className="p-4 rounded-lg border bg-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
