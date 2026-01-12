import { useEffect, useState } from 'react';
import { Package, Users, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import MenuManagement from '../menu/MenuManagement.js';
import OrderManagement from '../orders/OrderManagement.js';
import ProfileSettings from '../profile/ProfileSettings.js';
import PaymentManagement from '../payment/PaymentManagement.js';
import LiveQueueDashboard from '../queue/LiveQueueDashboard.js';
import CafeteriaInformation from '../profile/CafeteriaInformation.js';
import { ensureCafeteriaContext } from '../../utils/cafeteria.js';
import { supabase } from '../../lib/supabaseClient.js';


interface StaffDashboardProps {
  user: any;
  currentPage: string;
  onNavigate: (page: any) => void;
}

export default function StaffDashboard({ user, currentPage, onNavigate }: StaffDashboardProps) {
  const [stats, setStats] = useState({
    pendingOrders: 0,
    menuItems: 0,
    todaysOrders: 0,
    todaysRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const [profile, setProfile] = useState<any>(null);
  const [ownerCafeteria, setOwnerCafeteria] = useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      setIsProfileLoading(true);
      try {
        const context = await ensureCafeteriaContext(user);
        if (!isMounted) return;
        setProfile(context.profile);
        setOwnerCafeteria(context.cafeteria);
      } catch (error) {
        if (isMounted) {
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setIsProfileLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [user.id, user.name, user.email]);

  const cafeteriaId = ownerCafeteria?.id || profile?.cafeteria_id || user.id;
  const cafeteriaName =
    ownerCafeteria?.name || profile?.cafeteria_name || `${user.name || 'My'} Cafeteria`;

  useEffect(() => {
    if (!cafeteriaId) return;

    const fetchDashboardStats = async () => {
      setLoadingStats(true);
      try {
        // 1. Pending Orders Count
        const { count: pendingCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('cafeteria_id', cafeteriaId)
          .eq('status', 'Pending');

        // 2. Active Menu Items Count
        const { count: menuCount } = await supabase
          .from('menu_items')
          .select('*', { count: 'exact', head: true })
          .eq('cafeteria_id', cafeteriaId)
          .eq('available', true);

        // 3. Today's Orders & Revenue
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const { data: todaysData } = await supabase
          .from('orders')
          .select('total_amount, status')
          .eq('cafeteria_id', cafeteriaId)
          .gte('created_at', todayStart.toISOString());

        const todaysOrdersCount = todaysData?.length || 0;
        const revenue = todaysData
          ?.filter(o => ['Pending', 'Cooking', 'Ready for Pickup', 'Completed'].includes(o.status))
          .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

        // 4. Recent Orders
        const { data: recentData } = await supabase
          .from('orders')
          .select('*')
          .eq('cafeteria_id', cafeteriaId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (recentData) {
            const userIds = recentData.map(o => o.user_id).filter(Boolean);
            let userMap: Record<string, string> = {};
            
            if (userIds.length > 0) {
                 const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, name')
                    .in('id', userIds);
                 profiles?.forEach(p => {
                     userMap[p.id] = p.name;
                 });
            }

            const mappedRecent = recentData.map(o => {
                let parsedItems: any[] = [];
                try {
                    parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                } catch (e) {
                    parsedItems = [];
                }

                // Format item names
                const itemNames = Array.isArray(parsedItems) 
                    ? parsedItems.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')
                    : 'No items';

                // Use DB order_number if available, else fallback to short UUID
                const displayId = o.order_number 
                    ? `ORD-${o.order_number.toString().padStart(3, '0')}`
                    : `ORD-${o.id.split('-')[0].toUpperCase().slice(0, 6)}`;

                return {
                    id: displayId,
                    originalId: o.id,
                    customer: userMap[o.user_id] || 'Customer',
                    // Display item summary instead of count
                    itemSummary: itemNames,
                    total: `RM ${o.total_amount?.toFixed(2)}`,
                    status: o.status,
                    time: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    // Determine pickup label based on status
                    pickupLabel: o.status === 'Ready for Pickup' ? 'Ready for Pickup' : 
                                 o.status === 'Completed' ? 'Completed' : 
                                 o.estimated_pickup_time ? new Date(o.estimated_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                                 'Est. 15 mins', 
                    createdTime: o.created_at
                };
            });
            setRecentOrders(mappedRecent);
        }

        setStats({
          pendingOrders: pendingCount || 0,
          menuItems: menuCount || 0,
          todaysOrders: todaysOrdersCount,
          todaysRevenue: revenue,
        });

      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDashboardStats();
  }, [cafeteriaId]);


  if (currentPage === 'manage-menu') {
    if (isProfileLoading) return <div className="px-6 py-10 text-center text-slate-500">Loading profile...</div>;
    return <MenuManagement cafeteriaId={cafeteriaId} cafeteriaName={cafeteriaName} />;
  }

  if (currentPage === 'manage-orders') {
    if (isProfileLoading) return <div className="px-6 py-10 text-center text-slate-500">Loading profile...</div>;
    return <OrderManagement cafeteriaId={cafeteriaId} />;
  }

  if (currentPage === 'queue-dashboard') {
    if (isProfileLoading) return <div className="px-6 py-10 text-center text-slate-500">Loading profile...</div>;
    return <LiveQueueDashboard cafeteriaId={cafeteriaId} />;
  }

  if (currentPage === 'cafeteria-info') {
    if (isProfileLoading) return <div className="px-6 py-10 text-center text-slate-500">Loading profile...</div>;
    return (
      <CafeteriaInformation
        user={{ ...user, businessName: ownerCafeteria?.name || profile?.cafeteria_name }}
      />
    );
  }

  if (currentPage === 'manage-payments') {
    if (isProfileLoading) return <div className="px-6 py-10 text-center text-slate-500">Loading profile...</div>;
    return <PaymentManagement cafeteriaId={cafeteriaId} />;
  }

  if (currentPage === 'profile') {
    return <ProfileSettings user={user} />;
  }

  // Helper for "Time Ago"
  const getTimeAgo = (dateStr: string) => {
      const diff = new Date().getTime() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins} min ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return 'Yesterday';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-slate-900 mb-2">{user.name} - Dashboard ⭐</h1>
        <p className="text-slate-600">Managing {ownerCafeteria?.name || profile?.cafeteria_name || cafeteriaName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">Pending Orders</CardTitle>
            <Clock className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900 text-2xl font-bold">{loadingStats ? '...' : stats.pendingOrders}</div>
            <p className="text-xs text-slate-500 mt-1">Need attention</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">Menu Items</CardTitle>
            <Package className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900 text-2xl font-bold">{loadingStats ? '...' : stats.menuItems}</div>
            <p className="text-xs text-slate-500 mt-1">Active items</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">Today's Orders</CardTitle>
            <Users className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900 text-2xl font-bold">{loadingStats ? '...' : stats.todaysOrders}</div>
            <p className="text-xs text-slate-500 mt-1">Total orders</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">Revenue</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900 text-2xl font-bold">{loadingStats ? '...' : `RM ${stats.todaysRevenue.toFixed(2)}`}</div>
            <p className="text-xs text-slate-500 mt-1">Today's sales</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest customer orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.length === 0 ? (
                 <p className="text-sm text-slate-500 text-center py-4">No recent orders found.</p>
            ) : (
                recentOrders.map((order) => (
                  <div key={order.originalId} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-slate-900">{order.id}</p>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          order.status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                          order.status === 'Cooking' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{order.customer} • {order.itemSummary}</p>
                      <p className="text-xs text-slate-500 mt-1">Total: {order.total} • Pickup: {order.pickupLabel}</p>
                    </div>
                    <span className="text-xs text-slate-500">{getTimeAgo(order.createdTime)}</span>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('manage-menu')}>
          <CardHeader>
            <CardTitle className="text-purple-900">Manage Menu</CardTitle>
            <CardDescription className="text-purple-700">Add, edit or remove menu items</CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('manage-orders')}>
          <CardHeader>
            <CardTitle className="text-amber-900">Manage Orders</CardTitle>
            <CardDescription className="text-amber-700">Update order status and track progress</CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('queue-dashboard')}>
          <CardHeader>
            <CardTitle className="text-blue-900">Queue Dashboard</CardTitle>
            <CardDescription className="text-blue-700">Live queue and prep status</CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('manage-payments')}>
          <CardHeader>
            <CardTitle className="text-emerald-900">Manage Payments</CardTitle>
            <CardDescription className="text-emerald-700">View revenue and received payments</CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('cafeteria-info')}>
          <CardHeader>
            <CardTitle className="text-blue-900">Cafeteria Information</CardTitle>
            <CardDescription className="text-blue-700">Business details & documents</CardDescription>
          </CardHeader>
        </Card>
      </div>


    </div>
  );
}
