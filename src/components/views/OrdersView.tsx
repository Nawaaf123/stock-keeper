import { useState, useMemo } from 'react';
import { Order, InventoryItem, Wholesaler, Warehouse } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateOrderDialog } from '@/components/inventory/CreateOrderDialog';
import { EditOrderDialog } from '@/components/inventory/EditOrderDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Store, Package, Calendar, History, TrendingUp, BarChart3, ChevronDown, FileDown, Pencil, Trash2, ClipboardList, Eye, Search, X } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { downloadInvoice } from '@/lib/invoice';
import { downloadPickSheet, previewPickSheet } from '@/lib/pickSheet';
import { toast } from 'sonner';

interface OrdersViewProps {
  orders: Order[];
  items: InventoryItem[];
  warehouses: Warehouse[];
  wholesalers: Wholesaler[];
  onCreateOrder: (shopName: string, items: { itemId: string; warehouseId: string; quantity: number; unitPrice: number }[], shippingFee: number) => Promise<string | void> | string | void;
  onUpdateOrder: (orderId: string, shopName: string, items: { itemId: string; warehouseId: string; quantity: number; unitPrice: number }[], shippingFee: number) => Promise<void> | void;
  onDeleteOrder: (orderId: string) => Promise<void> | void;
}

export function OrdersView({ orders, items, warehouses, wholesalers, onCreateOrder, onUpdateOrder, onDeleteOrder }: OrdersViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [shopFilter, setShopFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'custom'>('all');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [showCancelled, setShowCancelled] = useState(false);

  const handlePreview = async (order: Order) => {
    try {
      const url = await previewPickSheet(order, items);
      setPreviewUrl(url);
      setPreviewTitle(`Order Sheet — ${order.shopName}`);
    } catch (e) {
      toast.error('Failed to generate preview');
    }
  };

  const filteredOrders = useMemo(() => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;
    if (dateRange === 'today') { from = startOfDay(now); to = endOfDay(now); }
    else if (dateRange === 'week') { from = startOfWeek(now, { weekStartsOn: 1 }); to = endOfWeek(now, { weekStartsOn: 1 }); }
    else if (dateRange === 'custom') {
      if (customFrom) from = startOfDay(customFrom);
      if (customTo) to = endOfDay(customTo);
    }
    const q = searchQuery.trim().toLowerCase();
    return orders.filter(o => {
      if (!showCancelled && o.status === 'cancelled') return false;
      if (q && !o.shopName.toLowerCase().includes(q)) return false;
      if (from && o.date < from) return false;
      if (to && o.date > to) return false;
      return true;
    });
  }, [orders, searchQuery, dateRange, customFrom, customTo, showCancelled]);

  const groupedOrders = filteredOrders.reduce((acc, order) => {
    const dateKey = format(order.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const sortedDates = Object.keys(groupedOrders).sort((a, b) => b.localeCompare(a));

  // Get unique shop names
  const uniqueShops = useMemo(() => {
    const shops = new Set(orders.map(o => o.shopName));
    return Array.from(shops).sort();
  }, [orders]);

  // Get unique products from orders
  const uniqueProducts = useMemo(() => {
    const products = new Map<string, { id: string; name: string; sku: string }>();
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!products.has(item.itemId)) {
          products.set(item.itemId, { id: item.itemId, name: item.itemName, sku: item.itemSku });
        }
      });
    });
    return Array.from(products.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  // Shop history - products shipped to each shop over time
  const shopHistory = useMemo(() => {
    const history = new Map<string, { 
      shopName: string; 
      totalOrders: number; 
      totalUnits: number;
      products: Map<string, { name: string; sku: string; quantity: number; orders: number }>;
      lastOrder: Date;
    }>();

    orders.filter(o => o.status !== 'cancelled').forEach(order => {
      if (!history.has(order.shopName)) {
        history.set(order.shopName, {
          shopName: order.shopName,
          totalOrders: 0,
          totalUnits: 0,
          products: new Map(),
          lastOrder: order.date,
        });
      }

      const shop = history.get(order.shopName)!;
      shop.totalOrders++;
      if (order.date > shop.lastOrder) shop.lastOrder = order.date;

      order.items.forEach(item => {
        shop.totalUnits += item.quantity;
        if (!shop.products.has(item.itemId)) {
          shop.products.set(item.itemId, { name: item.itemName, sku: item.itemSku, quantity: 0, orders: 0 });
        }
        const product = shop.products.get(item.itemId)!;
        product.quantity += item.quantity;
        product.orders++;
      });
    });

    return Array.from(history.values()).sort((a, b) => b.totalUnits - a.totalUnits);
  }, [orders]);

  // Product history - which shops received each product
  const productHistory = useMemo(() => {
    const history = new Map<string, {
      itemId: string;
      itemName: string;
      itemSku: string;
      totalUnits: number;
      shops: Map<string, { shopName: string; quantity: number; orders: number; lastOrder: Date }>;
    }>();

    orders.filter(o => o.status !== 'cancelled').forEach(order => {
      order.items.forEach(item => {
        if (!history.has(item.itemId)) {
          history.set(item.itemId, {
            itemId: item.itemId,
            itemName: item.itemName,
            itemSku: item.itemSku,
            totalUnits: 0,
            shops: new Map(),
          });
        }

        const product = history.get(item.itemId)!;
        product.totalUnits += item.quantity;

        if (!product.shops.has(order.shopName)) {
          product.shops.set(order.shopName, { shopName: order.shopName, quantity: 0, orders: 0, lastOrder: order.date });
        }
        const shop = product.shops.get(order.shopName)!;
        shop.quantity += item.quantity;
        shop.orders++;
        if (order.date > shop.lastOrder) shop.lastOrder = order.date;
      });
    });

    return Array.from(history.values()).sort((a, b) => b.totalUnits - a.totalUnits);
  }, [orders]);

  // Filtered shop history
  const filteredShopHistory = useMemo(() => {
    if (shopFilter === 'all') return shopHistory;
    return shopHistory.filter(s => s.shopName === shopFilter);
  }, [shopHistory, shopFilter]);

  // Filtered product history
  const filteredProductHistory = useMemo(() => {
    if (productFilter === 'all') return productHistory;
    return productHistory.filter(p => p.itemId === productFilter);
  }, [productHistory, productFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage outgoing orders and track shipment history</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Order
        </Button>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="w-max">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="shop-history" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              By Shop
            </TabsTrigger>
            <TabsTrigger value="product-history" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              By Product
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="orders" className="space-y-6">
          {orders.length > 0 && (
            <Card>
              <CardContent className="p-3 flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by shop name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This week</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
                {dateRange === 'custom' && (
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-40 justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                          <Calendar className="mr-2 h-4 w-4" />
                          {customFrom ? format(customFrom, 'MMM d, yyyy') : 'From'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-40 justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                          <Calendar className="mr-2 h-4 w-4" />
                          {customTo ? format(customTo, 'MMM d, yyyy') : 'To'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarPicker mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                {(searchQuery || dateRange !== 'all') && (
                  <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setDateRange('all'); setCustomFrom(undefined); setCustomTo(undefined); }}>
                    <X className="w-4 h-4 mr-1" /> Clear
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
          {orders.length > 0 && filteredOrders.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No orders match your filters.
              </CardContent>
            </Card>
          )}
          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Orders Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first order to start tracking outgoing shipments
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Order
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((dateKey) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold text-muted-foreground">
                      {format(new Date(Number(dateKey.slice(0, 4)), Number(dateKey.slice(5, 7)) - 1, Number(dateKey.slice(8, 10))), 'EEEE, MMMM d, yyyy')}
                    </h2>
                    <Badge variant="secondary">{groupedOrders[dateKey].length} orders</Badge>
                  </div>

                  <div className="space-y-3">
                    {groupedOrders[dateKey].map((order) => (
                      <Collapsible key={order.id}>
                        <Card>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <CardTitle className="text-base flex items-start sm:items-center gap-2 min-w-0">
                                  <Store className="w-4 h-4 text-primary flex-shrink-0 mt-1 sm:mt-0" />
                                  <span className="min-w-0">
                                    <span className="break-words">{order.shopName}</span>
                                    <span className="block sm:inline text-sm font-normal text-muted-foreground sm:ml-1">
                                      <span className="hidden sm:inline">— </span>{order.items.reduce((sum, i) => sum + i.quantity, 0)} cases, {order.items.length} {order.items.length === 1 ? 'product' : 'products'}
                                    </span>
                                  </span>
                                </CardTitle>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-xs text-muted-foreground">
                                    {format(order.date, 'h:mm a')}
                                  </span>
                                  <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                                    {order.status}
                                  </Badge>
                                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent>
                              <div className="space-y-2">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-1 sm:gap-3 text-sm py-2 border-b last:border-0 sm:items-center">
                                    <span className="min-w-0">
                                      <span className="font-mono text-xs text-muted-foreground mr-2">
                                        {item.itemSku}
                                      </span>
                                      <span className="break-words">{item.itemName}</span>
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {item.quantity} × ${item.unitPrice.toFixed(2)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {item.warehouseName}
                                    </span>
                                    <span className="font-medium sm:text-right sm:w-20">
                                      ${(item.quantity * item.unitPrice).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 pt-2 border-t space-y-1 text-sm">
                                <div className="flex flex-wrap justify-between gap-2">
                                  <span className="text-muted-foreground">Subtotal ({order.items.reduce((sum, i) => sum + i.quantity, 0)} cases)</span>
                                  <span>${order.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(2)}</span>
                                </div>
                                {order.shippingFee > 0 && (
                                  <div className="flex flex-wrap justify-between gap-2">
                                    <span className="text-muted-foreground">Shipping fee</span>
                                    <span>${order.shippingFee.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex flex-wrap justify-between gap-2 font-semibold">
                                  <span>Total</span>
                                  <span>${(order.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) + (order.shippingFee || 0)).toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="mt-3 flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => handlePreview(order)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Preview
                                </Button>
                                <Button size="sm" variant="default" onClick={() => downloadPickSheet(order, items)}>
                                  <ClipboardList className="w-4 h-4 mr-2" />
                                  Order Sheet
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => downloadInvoice(order, wholesalers.find(w => w.name === order.shopName))}>
                                  <FileDown className="w-4 h-4 mr-2" />
                                  Invoice
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditOrder(order)}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setDeleteOrderId(order.id)}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shop-history" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={shopFilter} onValueChange={setShopFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by shop" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shops</SelectItem>
                {uniqueShops.map(shop => (
                  <SelectItem key={shop} value={shop}>{shop}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredShopHistory.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Shop History</h3>
                <p className="text-muted-foreground text-center">
                  Create orders to see which products were shipped to each shop
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredShopHistory.map(shop => (
                <Card key={shop.shopName}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Store className="w-5 h-5 text-primary" />
                        {shop.shopName}
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {shop.totalOrders} orders
                        </Badge>
                        <Badge>
                          {shop.totalUnits} cases shipped
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Last order: {format(shop.lastOrder, 'MMM d, yyyy')}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <h4 className="text-sm font-medium text-foreground mb-2">Products Shipped</h4>
                    <div className="space-y-2">
                      {Array.from(shop.products.values())
                        .sort((a, b) => b.quantity - a.quantity)
                        .map(product => (
                          <div key={product.sku} className="flex justify-between items-center text-sm py-2 px-3 bg-muted/50 rounded-md">
                            <span>
                              <span className="font-mono text-xs text-muted-foreground mr-2">
                                {product.sku}
                              </span>
                              {product.name}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground text-xs">
                                {product.orders} {product.orders === 1 ? 'order' : 'orders'}
                              </span>
                              <Badge variant="secondary">{product.quantity} cases</Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="product-history" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {uniqueProducts.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredProductHistory.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Product History</h3>
                <p className="text-muted-foreground text-center">
                  Create orders to see where each product has been shipped
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredProductHistory.map(product => (
                <Card key={product.itemId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        <span className="font-mono text-sm text-muted-foreground mr-2">
                          {product.itemSku}
                        </span>
                        {product.itemName}
                      </CardTitle>
                      <Badge>
                        {product.totalUnits} cases shipped total
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h4 className="text-sm font-medium text-foreground mb-2">Shipped To</h4>
                    <div className="space-y-2">
                      {Array.from(product.shops.values())
                        .sort((a, b) => b.quantity - a.quantity)
                        .map(shop => (
                          <div key={shop.shopName} className="flex justify-between items-center text-sm py-2 px-3 bg-muted/50 rounded-md">
                            <span className="flex items-center gap-2">
                              <Store className="w-4 h-4 text-muted-foreground" />
                              {shop.shopName}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground text-xs">
                                {shop.orders} {shop.orders === 1 ? 'order' : 'orders'}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                Last: {format(shop.lastOrder, 'MMM d')}
                              </span>
                              <Badge variant="secondary">{shop.quantity} cases</Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        items={items}
        warehouses={warehouses}
        wholesalers={wholesalers}
        onCreateOrder={onCreateOrder}
      />

      {editOrder !== null && (
        <EditOrderDialog
          open={true}
          onOpenChange={(o) => { if (!o) setEditOrder(null); }}
          order={editOrder}
          items={items}
          warehouses={warehouses}
          wholesalers={wholesalers}
          onUpdateOrder={onUpdateOrder}
        />
      )}

      <AlertDialog open={deleteOrderId !== null} onOpenChange={(o) => { if (!o) setDeleteOrderId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              The product quantities from this order will be returned to inventory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteOrderId) return;
                await onDeleteOrder(deleteOrderId);
                toast.success('Order deleted and stock restored');
                setDeleteOrderId(null);
              }}
            >
              Delete & restore stock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={previewUrl !== null} onOpenChange={(o) => { if (!o) setPreviewUrl(null); }}>
        <DialogContent className="sm:max-w-5xl sm:h-[90vh] sm:p-4 flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-8">
              <span className="truncate">{previewTitle || 'Order Sheet Preview'}</span>
              {previewUrl && (
                <a
                  href={previewUrl}
                  download="order-sheet.pdf"
                  className="text-sm font-normal text-primary underline-offset-4 hover:underline"
                >
                  Download
                </a>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <object
              data={previewUrl}
              type="application/pdf"
              className="flex-1 w-full h-[75vh] border rounded-md bg-background"
            >
              <div className="p-4 text-sm text-muted-foreground">
                Your browser is blocking inline PDF preview. <a href={previewUrl} download="order-sheet.pdf" className="text-primary underline">Download the PDF</a> instead.
              </div>
            </object>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
