import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.js';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient.js';

interface Order {
  id: string;
  customer: string;
  items: { name: string; quantity: number }[];
  total: number;
  status: 'Pending' | 'Cooking' | 'Ready for Pickup' | 'Completed';
  createdAt: string;
  paidAt: string | null;
  paymentMethod?: string | null;
  queueNumber: string;
}

const parseItems = (raw: any): Order['items'] => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      name: item.name ?? 'Item',
      quantity: Number(item.quantity) || 1,
    }));
  } catch {
    return [];
  }
};

const normalizeStatus = (value: string | null | undefined): Order['status'] => {
  const allowed: Order['status'][] = ['Pending', 'Cooking', 'Ready for Pickup', 'Completed'];
  if (value && allowed.includes(value as Order['status'])) {
    return value as Order['status'];
  }
  return 'Pending';
};

interface OrderManagementProps {
  cafeteriaId?: string | null;
}

const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-1001',
    customer: 'Irfan Danial',
    items: [{ name: 'Nasi Lemak', quantity: 1 }, { name: 'Teh Tarik', quantity: 1 }],
    total: 12.5,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    paymentMethod: 'fpx',
    queueNumber: 'A12',
  },
  {
    id: 'ORD-1000',
    customer: 'Kanade',
    items: [{ name: 'Chicken Rice', quantity: 1 }],
    total: 10,
    status: 'Cooking',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    paidAt: new Date(Date.now() - 15 * 60000).toISOString(),
    paymentMethod: 'ewallet',
    queueNumber: 'A11',
  },
  {
    id: 'ORD-0999',
    customer: 'Nurul Aina',
    items: [{ name: 'Mee Goreng', quantity: 2 }],
    total: 15,
    status: 'Ready for Pickup',
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    paidAt: null,
    paymentMethod: 'card',
    queueNumber: 'A10',
  },
];

export default function OrderManagement({ cafeteriaId }: OrderManagementProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      if (!cafeteriaId) {
        setOrders(MOCK_ORDERS);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('cafeteria_id', cafeteriaId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (!isMounted) return;
        const mapped = (data || []).map((order: any) => ({
          id: order.id,
          customer: order.customer_name || order.user_id?.slice(0, 8) || 'Customer',
          items: parseItems(order.items),
          total: Number(order.total_amount) || 0,
          status: normalizeStatus(order.status),
          createdAt: order.created_at,
          paidAt: order.paid_at,
          paymentMethod: order.payment_method,
          queueNumber: order.queue_number || '—',
        }));
        setOrders(mapped.length ? mapped : MOCK_ORDERS);
        setHasError(false);
      } catch (error) {
        if (!isMounted) return;
        setHasError(true);
        toast.error('Unable to process requests. Please try again later.');
        setOrders(MOCK_ORDERS);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadOrders();

    const channel = supabase
      .channel('orders-management')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [cafeteriaId]);

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    const previousOrders = orders;
    setOrders(orders.map(order =>
      order.id === orderId ? { ...order, status: newStatus } : order
    ));

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      setOrders(previousOrders);
      toast.error('Unable to process requests. Please try again later.');
      return;
    }

    toast.success(`Order ${orderId} status updated to ${newStatus}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-orange-100 text-orange-700';
      case 'Cooking': return 'bg-blue-100 text-blue-700';
      case 'Ready for Pickup': return 'bg-green-100 text-green-700';
      case 'Completed': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const activeOrders = orders.filter(order => order.status !== 'Completed');
  const completedOrders = orders.filter(order => order.status === 'Completed');

  const renderPaymentBadge = (order: Order) => {
    if (order.paidAt) {
      return <Badge className="bg-emerald-100 text-emerald-700">Paid</Badge>;
    }
    return <Badge className="bg-red-100 text-red-700">Unpaid</Badge>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-slate-900 mb-2">Manage Pre-Orders ??</h1>
        <p className="text-slate-600">Update order status and track customer pre-orders in real-time</p>
      </div>

      {!cafeteriaId && !isLoading && (
        <p className="text-center text-slate-500 mb-6">
          No cafeteria assigned to your profile. Showing sample orders until your account is linked.
        </p>
      )}
      {isLoading && <p className="text-center text-slate-500 mb-6">Loading orders...</p>}
      {hasError && !isLoading && (
        <p className="text-center text-slate-500 mb-6">Unable to process requests. Please try again later.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-900">{orders.filter(o => o.status === 'Pending').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Cooking</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-900">{orders.filter(o => o.status === 'Cooking').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-900">{orders.filter(o => o.status === 'Ready for Pickup').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Active Orders</CardTitle>
          <CardDescription>Orders that need attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeOrders.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No active orders</p>
            ) : (
              activeOrders.map((order) => (
                <Card key={order.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-slate-900">{order.id}</p>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                          <Badge variant="outline">#{order.queueNumber}</Badge>
                          {renderPaymentBadge(order)}
                        </div>
                        <p className="text-sm text-slate-600 mb-1">{order.customer}</p>
                        <p className="text-sm text-slate-500">
                          {order.items.length === 0
                            ? 'No items recorded'
                            : order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                        </p>
                        <p className="text-sm text-purple-700 mt-1">RM {order.total.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={order.status}
                          onValueChange={(value: string) => handleStatusUpdate(order.id, value as Order['status'])}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Cooking">Cooking</SelectItem>
                            <SelectItem value="Ready for Pickup">Ready for Pickup</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : ''}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {completedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Orders</CardTitle>
            <CardDescription>Recently completed orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-900">{order.id} • {order.customer}</p>
                    <p className="text-xs text-slate-500">RM {order.total.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderPaymentBadge(order)}
                    <Badge variant="secondary">Completed</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !hasError && orders.length === 0 && (
        <div className="text-center text-slate-500 mt-8">
          <p>No menu orders have been placed yet.</p>
        </div>
      )}
    </div>
  );
}
