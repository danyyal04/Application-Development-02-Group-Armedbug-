import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.js';
import { toast } from 'sonner';

interface Order {
  id: string;
  customer: string;
  items: { name: string; quantity: number }[];
  total: number;
  status: 'Pending' | 'Cooking' | 'Ready for Pickup' | 'Completed';
  time: string;
  queueNumber: string;
}

const mockOrders: Order[] = [
  {
    id: 'ORD-045',
    customer: 'Ahmad bin Ali',
    items: [{ name: 'Nasi Lemak', quantity: 1 }, { name: 'Teh Tarik', quantity: 1 }],
    total: 11.00,
    status: 'Pending',
    time: '2 min ago',
    queueNumber: 'A15',
  },
  {
    id: 'ORD-044',
    customer: 'Siti Nurhaliza',
    items: [{ name: 'Chicken Rice', quantity: 1 }],
    total: 10.00,
    status: 'Cooking',
    time: '5 min ago',
    queueNumber: 'A14',
  },
  {
    id: 'ORD-043',
    customer: 'Lee Wei Ming',
    items: [{ name: 'Mee Goreng', quantity: 2 }, { name: 'Ice Lemon Tea', quantity: 1 }],
    total: 18.00,
    status: 'Ready for Pickup',
    time: '8 min ago',
    queueNumber: 'A13',
  },
];

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);

  const handleStatusUpdate = (orderId: string, newStatus: Order['status']) => {
    setOrders(orders.map(order =>
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-slate-900 mb-2">Manage Pre-Orders 📋</h1>
        <p className="text-slate-600">Update order status and track customer pre-orders in real-time</p>
      </div>

      {/* Stats */}
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

      {/* Active Orders */}
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
                        </div>
                        <p className="text-sm text-slate-600 mb-1">{order.customer}</p>
                        <p className="text-sm text-slate-500">
                          {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
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
                        <span className="text-xs text-slate-400 whitespace-nowrap">{order.time}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completed Orders */}
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
                  <Badge variant="secondary">Completed</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
