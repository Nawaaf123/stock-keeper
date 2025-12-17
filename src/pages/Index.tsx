import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardView } from '@/components/views/DashboardView';
import { InventoryView } from '@/components/views/InventoryView';
import { LowStockView } from '@/components/views/LowStockView';
import { CategoriesView } from '@/components/views/CategoriesView';
import { useInventory } from '@/hooks/useInventory';
import { initialInventory } from '@/data/mockData';

const Index = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const inventory = useInventory();

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView stats={inventory.stats} />;
      case 'inventory':
        return (
          <InventoryView
            items={inventory.items}
            searchQuery={inventory.searchQuery}
            onSearchChange={inventory.setSearchQuery}
            categoryFilter={inventory.categoryFilter}
            onCategoryChange={inventory.setCategoryFilter}
            sortField={inventory.sortField}
            sortDirection={inventory.sortDirection}
            onSort={inventory.toggleSort}
            onAddItem={inventory.addItem}
            onUpdateItem={inventory.updateItem}
            onDeleteItem={inventory.deleteItem}
          />
        );
      case 'low-stock':
        return <LowStockView items={initialInventory} />;
      case 'categories':
        return <CategoriesView items={initialInventory} />;
      default:
        return <DashboardView stats={inventory.stats} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="ml-64 p-8">
        {renderView()}
      </main>
    </div>
  );
};

export default Index;
