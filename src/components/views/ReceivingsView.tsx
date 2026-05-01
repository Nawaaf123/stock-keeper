import { useState, useMemo } from 'react';
import { InventoryItem, InventoryTransaction, Warehouse } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PackagePlus, Calendar, ChevronDown, FileText, Pencil, Trash2, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ReceiveStockDialog } from '@/components/inventory/ReceiveStockDialog';
import { EditReceivingDialog, ReceivingGroup } from '@/components/inventory/EditReceivingDialog';
import { toast } from 'sonner';

interface ReceivingsViewProps {
  transactions: InventoryTransaction[];
  items: InventoryItem[];
  warehouses: Warehouse[];
  onReceiveStock: (itemId: string, warehouseId: string, quantity: number, bolNumber: string, bolDocumentUrl?: string | null) => void;
  onUpdateReceiving: (bolNumber: string, newBolNumber: string, lines: { itemId: string; warehouseId: string; quantity: number }[], bolDocumentUrl?: string | null) => Promise<void> | void;
  onDeleteReceiving: (bolNumber: string) => Promise<void> | void;
}

export function ReceivingsView({
  transactions, items, warehouses, onReceiveStock, onUpdateReceiving, onDeleteReceiving,
}: ReceivingsViewProps) {
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ReceivingGroup | null>(null);
  const [deleteBol, setDeleteBol] = useState<string | null>(null);

  // Group transactions by BOL number (only "receive" type)
  const groups = useMemo<ReceivingGroup[]>(() => {
    const map = new Map<string, ReceivingGroup>();
    for (const t of transactions) {
      if (t.type !== 'receive') continue;
      const key = t.bolNumber || `(no-bol)-${t.id}`;
      const existing = map.get(key);
      if (existing) {
        existing.lines.push(t);
        if (t.date > existing.date) existing.date = t.date;
      } else {
        map.set(key, { bolNumber: t.bolNumber, date: t.date, lines: [t] });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const acc: Record<string, ReceivingGroup[]> = {};
    for (const g of groups) {
      const dk = format(g.date, 'yyyy-MM-dd');
      (acc[dk] ||= []).push(g);
    }
    return acc;
  }, [groups]);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const handleReceive = (itemId: string, warehouseId: string, quantity: number, bolNumber: string, bolDocumentUrl?: string | null) => {
    onReceiveStock(itemId, warehouseId, quantity, bolNumber, bolDocumentUrl);
    toast.success(`Received ${quantity} cases (BOL: ${bolNumber})`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteBol) return;
    await onDeleteReceiving(deleteBol);
    toast.success('Receiving deleted and inventory adjusted');
    setDeleteBol(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Receivings</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Track incoming stock by BOL — edit or delete to adjust inventory</p>
        </div>
        <Button onClick={() => setReceiveOpen(true)} className="w-full sm:w-auto">
          <PackagePlus className="w-4 h-4 mr-2" />
          Receive Stock
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PackagePlus className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Receivings Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Record incoming stock against a BOL number
            </p>
            <Button onClick={() => setReceiveOpen(true)}>
              <PackagePlus className="w-4 h-4 mr-2" />
              Receive Stock
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(dateKey => (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {format(new Date(Number(dateKey.slice(0, 4)), Number(dateKey.slice(5, 7)) - 1, Number(dateKey.slice(8, 10))), 'EEEE, MMMM d, yyyy')}
                </h2>
                <Badge variant="secondary">{groupedByDate[dateKey].length} BOL{groupedByDate[dateKey].length !== 1 ? 's' : ''}</Badge>
              </div>

              <div className="space-y-3">
                {groupedByDate[dateKey].map(group => {
                  const totalCases = group.lines.reduce((s, l) => s + l.quantity, 0);
                  return (
                    <Collapsible key={group.bolNumber + group.date.toISOString()}>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <CardTitle className="text-base flex items-start sm:items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-primary flex-shrink-0 mt-1 sm:mt-0" />
                                <span className="min-w-0">
                                  <span className="break-words">BOL #{group.bolNumber || '—'}</span>
                                  <span className="block sm:inline text-sm font-normal text-muted-foreground sm:ml-1">
                                    <span className="hidden sm:inline">— </span>{totalCases} cases, {group.lines.length} {group.lines.length === 1 ? 'product' : 'products'}
                                  </span>
                                </span>
                              </CardTitle>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  {format(group.date, 'h:mm a')}
                                </span>
                                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent>
                            <div className="space-y-2">
                              {group.lines.map((line) => (
                                <div key={line.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto] gap-1 sm:gap-3 text-sm py-2 border-b last:border-0 sm:items-center">
                                  <span className="min-w-0">
                                    <span className="font-mono text-xs text-muted-foreground mr-2">
                                      {line.itemSku}
                                    </span>
                                    <span className="break-words">{line.itemName}</span>
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {line.warehouseName}
                                  </span>
                                  <span className="font-medium sm:text-right sm:w-20 tabular-nums">
                                    {line.quantity} cases
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 pt-2 border-t flex flex-wrap justify-between gap-2 text-sm font-medium">
                              <span>Total</span>
                              <span>{totalCases} cases</span>
                            </div>
                            <div className="mt-3 flex justify-end gap-2">
                              {group.lines[0]?.bolDocumentUrl && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={group.lines[0].bolDocumentUrl} target="_blank" rel="noreferrer">
                                    <FileText className="w-4 h-4 mr-2" />
                                    BOL Doc
                                  </a>
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => setEditTarget(group)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => setDeleteBol(group.bolNumber)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ReceiveStockDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        warehouses={warehouses}
        item={null}
        items={items}
        onReceive={handleReceive}
      />

      <EditReceivingDialog
        open={!!editTarget}
        onOpenChange={(o) => { if (!o) setEditTarget(null); }}
        receiving={editTarget}
        items={items}
        warehouses={warehouses}
        onUpdate={onUpdateReceiving}
      />

      <AlertDialog open={!!deleteBol} onOpenChange={(o) => { if (!o) setDeleteBol(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this receiving?</AlertDialogTitle>
            <AlertDialogDescription>
              All lines under BOL #{deleteBol} will be removed and the corresponding stock will be subtracted from each warehouse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
