import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { InventoryView } from '@/components/views/InventoryView';
import { InventoryHistoryView } from '@/components/views/InventoryHistoryView';
import { WarehousesView } from '@/components/views/WarehousesView';
import { ReportsView } from '@/components/views/ReportsView';
import { BillOfLadingView } from '@/components/views/BillOfLadingView';
import { OrdersView } from '@/components/views/OrdersView';
import { WholesalersView } from '@/components/views/WholesalersView';
import { StockSummaryView } from '@/components/views/StockSummaryView';
import { PaymentsView } from '@/components/views/PaymentsView';
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
            allItems={inventory.allItems}
            warehouses={inventory.warehouses}
            searchQuery={inventory.searchQuery}
            onSearchChange={inventory.setSearchQuery}
            categoryFilter={inventory.categoryFilter}
            onCategoryChange={inventory.setCategoryFilter}
            subCategoryFilter={inventory.subCategoryFilter}
            onSubCategoryChange={inventory.setSubCategoryFilter}
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
            onTransferStock={inventory.transferStock}
            onUpdateWarehouse={inventory.updateWarehouse}
          />
        );
      case 'orders':
        return (
          <OrdersView
            orders={inventory.orders}
            items={inventory.allItems}
            warehouses={inventory.warehouses}
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
      case 'payments':
        return (
          <PaymentsView
            orders={inventory.orders}
            payments={inventory.payments}
            onAddPayment={inventory.addPayment}
            onDeletePayment={inventory.deletePayment}
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
        return <WarehousesView stats={inventory.stats} items={inventory.allItems} warehouses={inventory.warehouses} onUpdateWarehouse={inventory.updateWarehouse} />;
      case 'reports':
        return <ReportsView orders={inventory.orders} items={inventory.allItems} transactions={inventory.transactions} warehouses={inventory.warehouses} />;
      case 'bill-of-lading':
        return <BillOfLadingView />;
      default:
        return (
          <InventoryView
            items={inventory.items}
            allItems={inventory.allItems}
            warehouses={inventory.warehouses}
            searchQuery={inventory.searchQuery}
            onSearchChange={inventory.setSearchQuery}
            categoryFilter={inventory.categoryFilter}
            onCategoryChange={inventory.setCategoryFilter}
            subCategoryFilter={inventory.subCategoryFilter}
            onSubCategoryChange={inventory.setSubCategoryFilter}
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
            onTransferStock={inventory.transferStock}
            onUpdateWarehouse={inventory.updateWarehouse}
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
