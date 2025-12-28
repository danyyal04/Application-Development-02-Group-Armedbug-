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
import FeedbackDashboard from '../feedback/FeedbackDashboard';

interface StaffDashboardProps {
  user: any;
  currentPage: string;
  onNavigate: (page: any) => void;
}

export default function StaffDashboard({ user, currentPage, onNavigate }: StaffDashboardProps) {
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

  const cafeteriaId = ownerCafeteria?.id || profile?.cafeteria_id || user.id; // fallback to own auth id
  const cafeteriaName =
    ownerCafeteria?.name || profile?.cafeteria_name || `${user.name || 'My'} Cafeteria`;


  // UC033 & UC034 - Customer Feedback Dashboard
  if (currentPage === 'feedback-dashboard') {
    return <FeedbackDashboard />;
  }

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
            <div className="text-slate-900">8</div>
            <p className="text-xs text-slate-500 mt-1">Need attention</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">Menu Items</CardTitle>
            <Package className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">24</div>
            <p className="text-xs text-slate-500 mt-1">Active items</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">Today's Orders</CardTitle>
            <Users className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">45</div>
            <p className="text-xs text-slate-500 mt-1">Total orders</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">Revenue</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">RM 892</div>
            <p className="text-xs text-slate-500 mt-1">Today's sales</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Pre-Orders</CardTitle>
          <CardDescription>Latest customer pre-orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { id: 'ORD-045', customer: 'Ahmad bin Ali', items: 2, total: 'RM 18.50', status: 'Pending', time: '2 min ago', pickup: '11:30 AM' },
              { id: 'ORD-044', customer: 'Siti Nurhaliza', items: 1, total: 'RM 12.00', status: 'Cooking', time: '5 min ago', pickup: '12:00 PM' },
              { id: 'ORD-043', customer: 'Lee Wei Ming', items: 3, total: 'RM 25.00', status: 'Ready', time: '8 min ago', pickup: '11:00 AM' },
            ].map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
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
                  <p className="text-sm text-slate-600">{order.customer} • {order.items} items • {order.total}</p>
                  <p className="text-xs text-slate-500 mt-1">Pickup: {order.pickup}</p>
                </div>
                <span className="text-xs text-slate-500">{order.time}</span>
              </div>
            ))}
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

      {/* UC033 & UC034 - Customer Feedback Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card 
          className="border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => onNavigate('feedback-dashboard')}
        >
          <CardHeader>
            <CardTitle className="text-pink-900">Customer Feedback</CardTitle>
            <CardDescription className="text-pink-700">View and respond to customer reviews</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
