import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardView } from '@/components/views/DashboardView';
import { InventoryView } from '@/components/views/InventoryView';
import { WarehousesView } from '@/components/views/WarehousesView';
import { CategoriesView } from '@/components/views/CategoriesView';
import { BillOfLadingView } from '@/components/views/BillOfLadingView';
import { useInventory } from '@/hooks/useInventory';

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
            warehouseFilter={inventory.warehouseFilter}
            onWarehouseChange={inventory.setWarehouseFilter}
            sortField={inventory.sortField}
            sortDirection={inventory.sortDirection}
            onSort={inventory.toggleSort}
            onAddItem={inventory.addItem}
            onUpdateItem={inventory.updateItem}
            onReceiveStock={inventory.receiveStock}
            onUpdateStock={inventory.updateStock}
            onDeleteItem={inventory.deleteItem}
          />
        );
      case 'warehouses':
        return <WarehousesView stats={inventory.stats} items={inventory.allItems} />;
      case 'categories':
        return <CategoriesView items={inventory.allItems} />;
      case 'bill-of-lading':
        return <BillOfLadingView />;
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
