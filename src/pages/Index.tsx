import { useState, lazy, Suspense } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageSkeleton } from '@/components/layout/PageSkeleton';
import { InventoryView } from '@/components/views/InventoryView';
import { useInventory } from '@/hooks/useInventory';

// Lazy-load non-default views to keep initial bundle small
const InventoryHistoryView = lazy(() => import('@/components/views/InventoryHistoryView').then(m => ({ default: m.InventoryHistoryView })));
const ReceivingsView = lazy(() => import('@/components/views/ReceivingsView').then(m => ({ default: m.ReceivingsView })));
const WarehousesView = lazy(() => import('@/components/views/WarehousesView').then(m => ({ default: m.WarehousesView })));
const ReportsView = lazy(() => import('@/components/views/ReportsView').then(m => ({ default: m.ReportsView })));
const PaymentHistoryView = lazy(() => import('@/components/views/PaymentHistoryView').then(m => ({ default: m.PaymentHistoryView })));
const OrdersView = lazy(() => import('@/components/views/OrdersView').then(m => ({ default: m.OrdersView })));
const WholesalersView = lazy(() => import('@/components/views/WholesalersView').then(m => ({ default: m.WholesalersView })));
const StockSummaryView = lazy(() => import('@/components/views/StockSummaryView').then(m => ({ default: m.StockSummaryView })));
const PaymentsView = lazy(() => import('@/components/views/PaymentsView').then(m => ({ default: m.PaymentsView })));
const UsersView = lazy(() => import('@/components/views/UsersView').then(m => ({ default: m.UsersView })));
const DriftMonitorView = lazy(() => import('@/components/views/DriftMonitorView').then(m => ({ default: m.DriftMonitorView })));

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
      case 'receivings':
        return (
          <ReceivingsView
            transactions={inventory.transactions}
            items={inventory.allItems}
            warehouses={inventory.warehouses}
            onReceiveStock={inventory.receiveStock}
            onUpdateReceiving={inventory.updateReceiving}
            onDeleteReceiving={inventory.deleteReceiving}
          />
        );
      case 'stock-summary':
        return (
          <StockSummaryView
            items={inventory.allItems}
            orders={inventory.orders}
            transactions={inventory.transactions}
            warehouses={inventory.warehouses}
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
      case 'payment-history':
        return <PaymentHistoryView orders={inventory.orders} payments={inventory.payments} onDeletePayment={inventory.deletePayment} />;
      case 'users':
        return <UsersView />;
      case 'drift-monitor':
        return <DriftMonitorView items={inventory.allItems} warehouses={inventory.warehouses} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="lg:ml-64 pt-14 lg:pt-0 p-3 sm:p-5 lg:p-8">
        {inventory.loading ? <PageSkeleton /> : <Suspense fallback={<PageSkeleton />}>{renderView()}</Suspense>}
      </main>
    </div>
  );
};

export default Index;
