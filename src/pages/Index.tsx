import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { InventoryView } from '@/components/views/InventoryView';
import { InventoryHistoryView } from '@/components/views/InventoryHistoryView';
import { WarehousesView } from '@/components/views/WarehousesView';
import { CategoriesView } from '@/components/views/CategoriesView';
import { BillOfLadingView } from '@/components/views/BillOfLadingView';
import { OrdersView } from '@/components/views/OrdersView';
import { WholesalersView } from '@/components/views/WholesalersView';
import { StockSummaryView } from '@/components/views/StockSummaryView';
import { useInventory } from '@/hooks/useInventory';

const Index = () => {
  const [activeView, setActiveView] = useState('inventory');
  const inventory = useInventory();

  const renderView = () => {
    switch (activeView) {
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
      case 'orders':
        return (
          <OrdersView
            orders={inventory.orders}
            items={inventory.allItems}
            wholesalers={inventory.wholesalers}
            onCreateOrder={inventory.createOrder}
          />
        );
      case 'stock-summary':
        return (
          <StockSummaryView
            items={inventory.allItems}
            orders={inventory.orders}
            transactions={inventory.transactions}
          />
        );
      case 'wholesalers':
        return (
          <WholesalersView
            wholesalers={inventory.wholesalers}
            onAddWholesaler={inventory.addWholesaler}
            onUpdateWholesaler={inventory.updateWholesaler}
            onDeleteWholesaler={inventory.deleteWholesaler}
          />
        );
      case 'inventory-history':
        return <InventoryHistoryView transactions={inventory.transactions} />;
      case 'warehouses':
        return <WarehousesView stats={inventory.stats} items={inventory.allItems} />;
      case 'categories':
        return <CategoriesView items={inventory.allItems} />;
      case 'bill-of-lading':
        return <BillOfLadingView />;
      default:
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
