import { useState, useEffect } from 'react';
import { Clock, ChefHat, Package, Users, TrendingUp, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import {
  calculateEstimatedPickupTime,
  formatEstimatedPickupTime,
  getQueueLength,
  calculateAverageWaitTime,
  getOrderStatusBreakdown,
  isBulkOrder,
} from "../../utils/queueCalculations.js";

interface Order {
  id: string;
  customer: string;
  items: { name: string; quantity: number }[];
  total: number;
  status: 'Pending' | 'Cooking' | 'Ready for Pickup' | 'Completed';
  time: string;
  queueNumber: string;
  createdAt: Date;
  estimatedPrepTime?: number;
}

// Helper functions
const parseItems = (raw: any): Order["items"] => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      name: item.name ?? "Item",
      quantity: Number(item.quantity) || 1,
    }));
  } catch {
    return [];
  }
};

const normalizeStatus = (value: string | null | undefined): Order["status"] => {
  const allowed: Order["status"][] = [
    "Pending",
    "Cooking",
    "Ready for Pickup",
    "Completed",
  ];
  if (value && allowed.includes(value as Order["status"])) {
    return value as Order["status"];
  }
  return "Pending";
};

interface LiveQueueDashboardProps {
  cafeteriaId?: string;
}

export default function LiveQueueDashboard({ cafeteriaId }: LiveQueueDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [syncError, setSyncError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    if (!cafeteriaId) return;
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('cafeteria_id', cafeteriaId)
        .neq('status', 'Completed')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedOrders: Order[] = (data || []).map((order: any) => {
        const items = parseItems(order.items);
        return {
          id: order.id,
          customer: order.customer_name || order.user_id?.slice(0, 8) || "Customer",
          items,
          total: Number(order.total_amount) || 0,
          status: normalizeStatus(order.status),
          time: new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          queueNumber: order.queue_number || "—",
          createdAt: new Date(order.created_at),
          estimatedPrepTime: 0
        };
      });

      setOrders(mappedOrders);
      setLastUpdated(new Date());
      setSyncError(false);
    } catch (err) {
      console.error('Error fetching orders:', err);
      // setSyncError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!cafeteriaId) {
        setIsLoading(false);
        return;
    }

    fetchOrders();

    const channel = supabase
      .channel('queue-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `cafeteria_id=eq.${cafeteriaId}`
        },
        () => {
          fetchOrders();
          toast.info('Queue updated');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cafeteriaId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh || !cafeteriaId) return;

    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, cafeteriaId]);

  const activeOrders = orders.filter(order => order.status !== 'Completed');
  const queueLength = getQueueLength(orders);
  const avgWaitTime = calculateAverageWaitTime(orders);
  const statusBreakdown = getOrderStatusBreakdown(orders);

  const handleManualRefresh = () => {
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-orange-100 text-orange-700';
      case 'Cooking': return 'bg-blue-100 text-blue-700';
      case 'Ready for Pickup': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-900 mb-2">Live Queue Dashboard 📊</h1>
            <p className="text-slate-600">Real-time order queue and preparation status</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-500">Last updated</p>
              <p className="text-sm text-slate-900">
                {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Sync Error Alert */}
      {syncError && (
        <Alert variant="destructive" className="mb-6">
          <Clock className="w-4 h-4" />
          <AlertDescription>
            Real-time sync failure. Data may be outdated. Last updated: {lastUpdated.toLocaleTimeString()}
          </AlertDescription>
        </Alert>
      )}

      {/* Queue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-orange-900">Queue Length</CardTitle>
            <Users className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">{queueLength}</div>
            <p className="text-xs text-orange-700 mt-1">
              {queueLength === 0 ? 'Queue is clear' : 'Orders in queue'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-blue-900">Avg Wait Time</CardTitle>
            <Clock className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">{avgWaitTime} min</div>
            <p className="text-xs text-blue-700 mt-1">Estimated average</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-purple-900">Cooking Now</CardTitle>
            <ChefHat className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">{statusBreakdown.cooking}</div>
            <p className="text-xs text-purple-700 mt-1">Active preparation</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-green-900">Ready for Pickup</CardTitle>
            <Package className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">{statusBreakdown.ready}</div>
            <p className="text-xs text-green-700 mt-1">Awaiting collection</p>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Breakdown */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Order Status Distribution</CardTitle>
          <CardDescription>Visual breakdown of current orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Pending</span>
                <span className="text-sm text-slate-900">{statusBreakdown.pending} orders</span>
              </div>
              <Progress 
                value={(statusBreakdown.pending / activeOrders.length) * 100} 
                className="h-2 bg-orange-100 [&>div]:bg-orange-600" 
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Cooking</span>
                <span className="text-sm text-slate-900">{statusBreakdown.cooking} orders</span>
              </div>
              <Progress 
                value={(statusBreakdown.cooking / activeOrders.length) * 100} 
                className="h-2 bg-blue-100 [&>div]:bg-blue-600" 
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Ready for Pickup</span>
                <span className="text-sm text-slate-900">{statusBreakdown.ready} orders</span>
              </div>
              <Progress 
                value={(statusBreakdown.ready / activeOrders.length) * 100} 
                className="h-2 bg-green-100 [&>div]:bg-green-600" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Orders with Estimated Times */}
      <Card>
        <CardHeader>
          <CardTitle>Active Orders</CardTitle>
          <CardDescription>
            {activeOrders.length === 0 
              ? 'No active orders. Queue is clear.' 
              : `${activeOrders.length} orders in progress`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">No active orders</p>
              <p className="text-sm text-slate-400 mt-2">Queue is clear ✨</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order, index) => {
                const estimatedTime = calculateEstimatedPickupTime(order, index);
                const isBulk = isBulkOrder(order);
                
                return (
                  <Card key={order.id} className="border-2 hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-slate-900">{order.id}</p>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                            <Badge variant="outline">#{order.queueNumber}</Badge>
                            {isBulk && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                Bulk Order
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mb-1">{order.customer}</p>
                          <p className="text-sm text-slate-500 mb-2">
                            {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-purple-700">
                              <TrendingUp className="w-3 h-3" />
                              <span>RM {order.total.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-600">
                              <Clock className="w-3 h-3" />
                              <span>{formatEstimatedPickupTime(estimatedTime)}</span>
                            </div>
                          </div>
                          {isBulk && (
                            <p className="text-xs text-amber-700 mt-2">
                              ⚠️ This order may take longer due to customization/volume
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400 mb-1">{order.time}</div>
                          <div className="text-sm text-slate-900">
                            Est: {estimatedTime} min
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-refresh indicator */}
      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
        <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
        <span>Dashboard updates automatically every 30 seconds</span>
      </div>
    </div>
  );
}
