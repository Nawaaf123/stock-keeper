import { Package, AlertTriangle, DollarSign, Tags } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { InventoryItem } from '@/types/inventory';

interface DashboardViewProps {
  stats: {
    totalItems: number;
    lowStockItems: InventoryItem[];
    totalValue: number;
    uniqueCategories: number;
  };
}

export function DashboardView({ stats }: DashboardViewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your inventory status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Items"
          value={stats.totalItems.toLocaleString()}
          icon={Package}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.lowStockItems.length}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Total Value"
          value={formatCurrency(stats.totalValue)}
          icon={DollarSign}
          variant="success"
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Categories"
          value={stats.uniqueCategories}
          icon={Tags}
        />
      </div>

      {stats.lowStockItems.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-foreground mb-4">Low Stock Alerts</h2>
          <div className="space-y-3">
            {stats.lowStockItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/20"
              >
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-destructive font-semibold">{item.quantity} left</p>
                  <p className="text-sm text-muted-foreground">Min: {item.minStock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
