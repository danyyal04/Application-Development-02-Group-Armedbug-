import { useState } from 'react';
import { Clock, CheckCircle, ChefHat, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { Progress } from '../ui/progress.js';
import { toast } from 'sonner';

interface Order {
  id: string;
  cafeteria: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  status: 'Pending' | 'Cooking' | 'Ready for Pickup' | 'Completed';
  time: string;
  queueNumber: string;
}

const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    cafeteria: 'Cafe Angkasa',
    items: [
      { name: 'Nasi Lemak', quantity: 1, price: 8.50 },
      { name: 'Teh Tarik', quantity: 1, price: 2.50 },
    ],
    total: 11.00,
    status: 'Ready for Pickup',
    time: '10:30 AM',
    queueNumber: 'A12',
  },
  {
    id: 'ORD-002',
    cafeteria: 'Cafe Siswa',
    items: [
      { name: 'Chicken Rice', quantity: 1, price: 10.00 },
      { name: 'Ice Lemon Tea', quantity: 1, price: 3.00 },
    ],
    total: 13.00,
    status: 'Cooking',
    time: '11:00 AM',
    queueNumber: 'B05',
  },
];

export default function OrderTracking() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'Pending': return 25;
      case 'Cooking': return 50;
      case 'Ready for Pickup': return 75;
      case 'Completed': return 100;
      default: return 0;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock className="w-5 h-5" />;
      case 'Cooking': return <ChefHat className="w-5 h-5" />;
      case 'Ready for Pickup': return <Package className="w-5 h-5" />;
      case 'Completed': return <CheckCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
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

  const handleConfirmPickup = (orderId: string) => {
    setOrders(orders.map(order =>
      order.id === orderId ? { ...order, status: 'Completed' as const } : order
    ));
    toast.success('Thank you! Your order has been marked as completed.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-slate-900 mb-2">My Orders 📦</h1>
        <p className="text-slate-600">Track your orders in real-time</p>
      </div>

      {/* Active Orders */}
      <div className="space-y-6">
        {orders.filter(order => order.status !== 'Completed').length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">No active orders found.</p>
              <p className="text-sm text-slate-400 mt-2">Place a new order to get started!</p>
            </CardContent>
          </Card>
        ) : (
          orders
            .filter(order => order.status !== 'Completed')
            .map((order) => (
              <Card key={order.id} className="overflow-hidden border-2">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {order.id}
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">{order.status}</span>
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {order.cafeteria} • Queue #{order.queueNumber}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">{order.time}</p>
                      <p className="text-purple-700">RM {order.total.toFixed(2)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">Order Progress</span>
                      <span className="text-sm text-slate-900">{getStatusProgress(order.status)}%</span>
                    </div>
                    <Progress value={getStatusProgress(order.status)} className="h-2" />
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2 mb-6">
                    <p className="text-sm text-slate-600">Items:</p>
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded">
                        <span className="text-sm text-slate-900">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-sm text-slate-600">RM {item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Status Timeline */}
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {['Pending', 'Cooking', 'Ready for Pickup', 'Completed'].map((status, index) => (
                      <div key={status} className="text-center">
                        <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
                          getStatusProgress(order.status) >= (index + 1) * 25
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-200 text-slate-400'
                        }`}>
                          {getStatusIcon(status)}
                        </div>
                        <p className="text-xs text-slate-600">{status}</p>
                      </div>
                    ))}
                  </div>

                  {/* Confirm Pickup Button */}
                  {order.status === 'Ready for Pickup' && (
                    <Button
                      onClick={() => handleConfirmPickup(order.id)}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Pickup
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
        )}
      </div>

      {/* Completed Orders */}
      {orders.filter(order => order.status === 'Completed').length > 0 && (
        <div className="mt-12">
          <h2 className="text-slate-900 mb-4">Order History</h2>
          <div className="space-y-4">
            {orders
              .filter(order => order.status === 'Completed')
              .map((order) => (
                <Card key={order.id} className="opacity-75">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-900">{order.id}</p>
                        <p className="text-sm text-slate-600">
                          {order.cafeteria} • {order.items.length} items
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">Completed</Badge>
                        <p className="text-sm text-slate-600 mt-1">RM {order.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
