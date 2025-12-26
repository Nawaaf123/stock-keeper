import { useState } from 'react';
import { InventoryItem, Warehouse } from '@/types/inventory';
import { Search, Pencil, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface WarehousesViewProps {
  stats: {
    warehouseStats: { id: string; name: string; location: string; color: string; totalItems: number; totalValue: number }[];
  };
  items: InventoryItem[];
  warehouses: Warehouse[];
  onUpdateWarehouse: (id: string, updates: Partial<Omit<Warehouse, 'id'>>) => void;
}

export function WarehousesView({ stats, items, warehouses, onUpdateWarehouse }: WarehousesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query);
  });

  const handleStartEdit = (warehouse: Warehouse) => {
    setEditingWarehouseId(warehouse.id);
    setEditingName(warehouse.name);
  };

  const handleSaveEdit = () => {
    if (editingWarehouseId && editingName.trim()) {
      onUpdateWarehouse(editingWarehouseId, { name: editingName.trim() });
    }
    setEditingWarehouseId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingWarehouseId(null);
    setEditingName('');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Warehouses</h1>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">SKU</TableHead>
              <TableHead className="font-semibold">Product Name</TableHead>
              {warehouses.map(wh => (
                <TableHead key={wh.id} className="font-semibold text-center">
                  {editingWarehouseId === wh.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-7 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      {wh.name}
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => handleStartEdit(wh)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </TableHead>
              ))}
              <TableHead className="font-semibold text-center">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map(item => {
              const total = item.stock.reduce((sum, s) => sum + s.quantity, 0);
              return (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  {warehouses.map(wh => {
                    const stock = item.stock.find(s => s.warehouseId === wh.id)?.quantity || 0;
                    return (
                      <TableCell key={wh.id} className="text-center">
                        <span className={stock === 0 ? "text-muted-foreground" : stock < 10 ? "text-red-600 font-semibold" : ""}>
                          {stock}
                        </span>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-semibold">{total}</TableCell>
                </TableRow>
              );
            })}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={warehouses.length + 3} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No products match your search' : 'No products in inventory'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
