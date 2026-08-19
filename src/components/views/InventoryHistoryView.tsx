import { format } from 'date-fns';
import { History, Package, Warehouse, FileText } from 'lucide-react';
import { InventoryTransaction } from '@/types/inventory';
import { openBolDocument } from '@/lib/bolDocs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface InventoryHistoryViewProps {
  transactions: InventoryTransaction[];
}

export function InventoryHistoryView({ transactions }: InventoryHistoryViewProps) {
  // Group transactions by date
  const groupedByDate = transactions.reduce((acc, transaction) => {
    const dateKey = format(transaction.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(transaction);
    return acc;
  }, {} as Record<string, InventoryTransaction[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <History className="w-6 h-6" />
          Inventory History
        </h1>
        <p className="text-muted-foreground mt-1">
          Track all inventory additions by date and BOL number
        </p>
      </div>

      {transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No History Yet</h3>
            <p className="text-muted-foreground text-center mt-2">
              Inventory history will appear here when you receive stock.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const dayTransactions = groupedByDate[dateKey];
            const displayDate = format(new Date(Number(dateKey.slice(0, 4)), Number(dateKey.slice(5, 7)) - 1, Number(dateKey.slice(8, 10))), 'EEEE, MMMM d, yyyy');

            // Group by BOL within each day
            const groupedByBol = dayTransactions.reduce((acc, t) => {
              if (!acc[t.bolNumber]) {
                acc[t.bolNumber] = [];
              }
              acc[t.bolNumber].push(t);
              return acc;
            }, {} as Record<string, InventoryTransaction[]>);

            return (
              <Card key={dateKey}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{displayDate}</CardTitle>
                  <CardDescription>
                    {dayTransactions.length} item{dayTransactions.length !== 1 ? 's' : ''} received
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(groupedByBol).map(([bolNumber, bolTransactions]) => {
                    const bolDocUrl = bolTransactions.find(t => t.bolDocumentUrl)?.bolDocumentUrl;
                    return (
                    <div key={bolNumber} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          BOL: {bolNumber}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {bolTransactions.length} item{bolTransactions.length !== 1 ? 's' : ''}
                        </span>
                        {bolDocUrl && (
                          <button
                            type="button"
                            onClick={() => openBolDocument(bolDocUrl)}
                            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <FileText className="w-3 h-3" />
                            View BOL document
                          </button>
                        )}
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">SKU</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Warehouse</TableHead>
                            <TableHead className="text-right">Qty Added</TableHead>
                            <TableHead className="text-right">Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bolTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell className="font-mono text-xs">
                                {transaction.itemSku}
                              </TableCell>
                              <TableCell className="font-medium">
                                {transaction.itemName}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Warehouse className="w-3 h-3 text-muted-foreground" />
                                  {transaction.warehouseName}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-primary">
                                +{transaction.quantity}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground text-sm">
                                {format(transaction.date, 'h:mm a')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
