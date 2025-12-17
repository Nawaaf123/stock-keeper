import { categories } from '@/data/mockData';
import { InventoryItem } from '@/types/inventory';

interface CategoriesViewProps {
  items: InventoryItem[];
}

export function CategoriesView({ items }: CategoriesViewProps) {
  const getCategoryStats = (categoryName: string) => {
    const categoryItems = items.filter((item) => item.category === categoryName);
    const totalItems = categoryItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = categoryItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
    return { count: categoryItems.length, totalItems, totalValue };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Categories</h1>
        <p className="text-muted-foreground mt-1">
          Overview of inventory by category
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((category) => {
          const stats = getCategoryStats(category.name);
          return (
            <div
              key={category.id}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow animate-fade-in"
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats.count} product{stats.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Total Units</p>
                  <p className="text-xl font-semibold text-foreground">{stats.totalItems.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-xl font-semibold text-foreground">{formatCurrency(stats.totalValue)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
