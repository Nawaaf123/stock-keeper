import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
import { InventoryView } from '@/components/views/InventoryView';
import { InventoryHistoryView } from '@/components/views/InventoryHistoryView';
import { WarehousesView } from '@/components/views/WarehousesView';
import { ReportsView } from '@/components/views/ReportsView';
import { BillOfLadingView } from '@/components/views/BillOfLadingView';
import { OrdersView } from '@/components/views/OrdersView';
import { WholesalersView } from '@/components/views/WholesalersView';
import { StockSummaryView } from '@/components/views/StockSummaryView';
import { PaymentsView } from '@/components/views/PaymentsView';
import { UsersView } from '@/components/views/UsersView';
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
            onUpdateOrder={inventory.updateOrder}
            onDeleteOrder={inventory.deleteOrder}
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
            wholesalers={inventory.wholesalers}
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
        return <WarehousesView stats={inventory.stats} items={inventory.allItems} warehouses={inventory.warehouses} onUpdateWarehouse={inventory.updateWarehouse} onUpdateStock={inventory.updateStock} onReorderWarehouse={inventory.reorderWarehouse} />;
      case 'reports':
        return <ReportsView orders={inventory.orders} items={inventory.allItems} transactions={inventory.transactions} warehouses={inventory.warehouses} />;
      case 'bill-of-lading':
        return <BillOfLadingView />;
      case 'users':
        return <UsersView />;
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
      <main className="lg:ml-64 pt-14 lg:pt-0 p-3 sm:p-5 lg:p-8">
        {inventory.loading ? <PageSkeleton /> : renderView()}
      </main>
    </div>
  );
};

export default Index;
