import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { InventoryItem, Warehouse } from '@/types/inventory';
import { toast } from 'sonner';

interface DriftMonitorViewProps {
  items: InventoryItem[];
  warehouses: Warehouse[];
}

interface DriftRow {
  itemId: string;
  warehouseId: string;
  itemName: string;
  sku: string;
  warehouseName: string;
  currentQty: number;
  auditSum: number;
  diff: number;
}

export function DriftMonitorView({ items, warehouses }: DriftMonitorViewProps) {
  const [rows, setRows] = useState<DriftRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const whMap = new Map(warehouses.map((w) => [w.id, w]));

  const runCheck = async () => {
    setLoading(true);
    try {
      // Pull all audit log rows (paged to bypass 1000-row limit)
      const allLogs: { item_id: string; warehouse_id: string; delta: number }[] = [];
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('stock_audit_log')
          .select('item_id, warehouse_id, delta')
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allLogs.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      // Sum deltas per (item, warehouse)
      const sums = new Map<string, number>();
      for (const r of allLogs) {
        const key = `${r.item_id}|${r.warehouse_id}`;
        sums.set(key, (sums.get(key) ?? 0) + (r.delta ?? 0));
      }

      // Compare to current stock
      const driftRows: DriftRow[] = [];
      const seen = new Set<string>();

      for (const item of items) {
        for (const wh of warehouses) {
          const key = `${item.id}|${wh.id}`;
          seen.add(key);
          const currentQty = item.stock.find((s) => s.warehouseId === wh.id)?.quantity ?? 0;
          const auditSum = sums.get(key) ?? 0;
          if (currentQty !== auditSum) {
            driftRows.push({
              itemId: item.id,
              warehouseId: wh.id,
              itemName: item.name,
              sku: item.sku,
              warehouseName: wh.name,
              currentQty,
              auditSum,
              diff: currentQty - auditSum,
            });
          }
        }
      }

      // Also surface audit rows pointing to items/warehouses no longer present
      for (const [key, auditSum] of sums) {
        if (seen.has(key) || auditSum === 0) continue;
        const [itemId, warehouseId] = key.split('|');
        driftRows.push({
          itemId,
          warehouseId,
          itemName: itemMap.get(itemId)?.name ?? '(deleted item)',
          sku: itemMap.get(itemId)?.sku ?? '—',
          warehouseName: whMap.get(warehouseId)?.name ?? '(deleted warehouse)',
          currentQty: 0,
          auditSum,
          diff: -auditSum,
        });
      }

      driftRows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
      setRows(driftRows);
      setCheckedAt(new Date());
    } catch (err: any) {
      toast.error(err?.message || 'Failed to check drift');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalDrift = rows.reduce((sum, r) => sum + Math.abs(r.diff), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Drift Monitor</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Compares current inventory to the audit log. Any mismatch means stock changed outside the normal workflow.
          </p>
        </div>
        <Button onClick={runCheck} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Re-check
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Mismatched rows</p>
          <p className="text-2xl font-bold mt-1">{rows.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total drift (cases)</p>
          <p className="text-2xl font-bold mt-1">{totalDrift}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Last checked</p>
          <p className="text-sm font-medium mt-1">{checkedAt ? checkedAt.toLocaleString() : '—'}</p>
        </div>
      </div>

      {rows.length === 0 && !loading ? (
        <div className="bg-success/10 border border-success/20 rounded-lg p-6 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success" />
          <div>
            <p className="font-medium text-foreground">No drift detected</p>
            <p className="text-sm text-muted-foreground">
              Every warehouse stock value matches the audit log exactly.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b bg-destructive/5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <p className="text-sm font-medium">
              {rows.length} mismatch{rows.length === 1 ? '' : 'es'} found
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Product</th>
                  <th className="text-left px-4 py-2">SKU</th>
                  <th className="text-left px-4 py-2">Warehouse</th>
                  <th className="text-right px-4 py-2">Current</th>
                  <th className="text-right px-4 py-2">Audit Sum</th>
                  <th className="text-right px-4 py-2">Drift</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.itemId}-${r.warehouseId}`} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{r.itemName}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.sku}</td>
                    <td className="px-4 py-2">{r.warehouseName}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.currentQty}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.auditSum}</td>
                    <td className={`px-4 py-2 text-right tabular-nums font-bold ${r.diff > 0 ? 'text-success' : 'text-destructive'}`}>
                      {r.diff > 0 ? '+' : ''}{r.diff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground bg-muted/40 border rounded-md p-3">
        <strong>How to read this:</strong> Audit Sum is the total of every recorded change to that warehouse stock. Current is what's in the inventory now. If they don't match, something changed without going through Receive, Order, Transfer, or Quick Edit — usually a direct database edit. Drift recorded before the audit log was installed will not appear here.
      </div>
    </div>
  );
}
