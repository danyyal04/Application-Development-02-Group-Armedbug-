import { Clock, ShoppingBag, CreditCard, Star, MapPin, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import MenuList from '../menu/MenuList.js';
import OrderTracking from '../orders/OrderTracking.js';
import PaymentMethods from '../payment/PaymentMethods.js';
import ProfileSettings from '../profile/ProfileSettings.js';
import CafeteriaList from '../cafeteria/CafeteriaList.js';
import CheckoutPage from '../checkout/CheckoutPage.js';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient.js';

interface StudentDashboardProps {
  user: any;
  currentPage: string;
  onNavigate: (page: any) => void;
}

export default function StudentDashboard({ user, currentPage, onNavigate }: StudentDashboardProps) {
  const [selectedCafeteria, setSelectedCafeteria] = useState<any>(null);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [featuredCafeterias, setFeaturedCafeterias] = useState<any[]>([]);

  useEffect(() => {
    const loadFeatured = async () => {
      const { data } = await supabase
        .from('cafeterias')
        .select('*')
        .order('rating', { ascending: false })
        .limit(3);
      setFeaturedCafeterias(data || []);
    };
    loadFeatured();
  }, []);

  if (currentPage === 'menu') {
    if (checkoutData) {
      return (
        <CheckoutPage
          cafeteria={selectedCafeteria}
          cartItems={checkoutData.cartItems}
          pickupTime={checkoutData.pickupTime}
          onBack={() => setCheckoutData(null)}
          onSuccess={() => {
            setCheckoutData(null);
            setSelectedCafeteria(null);
            onNavigate('orders');
          }}
        />
      );
    }
    
    if (selectedCafeteria) {
      return (
        <MenuList
          cafeteria={selectedCafeteria}
          onBack={() => setSelectedCafeteria(null)}
          onCheckout={(cartItems: any, pickupTime: any) => {
            setCheckoutData({ cartItems, pickupTime });
          }}
        />
      );
    }
    return <CafeteriaList onSelectCafeteria={(caf: any) => setSelectedCafeteria(caf)} />;
  }

  if (currentPage === 'orders') {
    return <OrderTracking userId={user.id} />;
  }

  if (currentPage === 'payment') {
    return <PaymentMethods />;
  }

  if (currentPage === 'profile') {
    return <ProfileSettings user={user} />;
  }

  // Dashboard Home

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-slate-900 mb-2">Welcome back, {user.name}! 👋</h1>
        <p className="text-slate-600">Pre-order your favorite meals from UTM cafeterias and skip the queue.</p>
      </div>

      {/* Quick Search */}
      <Card className="mb-8 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search for cafeterias or food..."
              className="pl-10 bg-white"
              onClick={() => onNavigate('menu')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-slate-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('orders')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">Active Orders</CardTitle>
            <ShoppingBag className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">2</div>
            <p className="text-xs text-slate-500 mt-1">In progress</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('payment')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">Payment Methods</CardTitle>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">3</div>
            <p className="text-xs text-slate-500 mt-1">Saved methods</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">Favorite Cafeterias</CardTitle>
            <Star className="w-4 h-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900">3</div>
            <p className="text-xs text-slate-500 mt-1">Your top picks</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Track your latest pre-orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { id: 'ORD-001', cafeteria: 'Cafe Angkasa', items: 'Nasi Lemak, Teh Tarik', status: 'Ready for Pickup', time: '10:30 AM', pickup: '11:00 AM' },
              { id: 'ORD-002', cafeteria: 'Cafe Siswa', items: 'Chicken Rice, Ice Lemon Tea', status: 'Cooking', time: '11:00 AM', pickup: '11:45 AM' },
            ].map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-slate-900">{order.id}</p>
                    <Badge variant={order.status === 'Ready for Pickup' ? 'default' : 'secondary'}>
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{order.cafeteria} • {order.items}</p>
                  <p className="text-xs text-slate-500 mt-1">Pickup: {order.pickup}</p>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{order.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Featured Cafeterias */}
      <div className="mb-4">
        <h2 className="text-slate-900 mb-4">Featured Cafeterias 🍽️</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {featuredCafeterias.map((cafeteria) => (
          <Card 
            key={cafeteria.id} 
            className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedCafeteria(cafeteria);
              onNavigate('menu');
            }}
          >
            <div className="aspect-video w-full overflow-hidden bg-slate-100 relative">
              <img
                src={cafeteria.image || '/UTMMunch-Logo.jpg'}
                alt={cafeteria.name}
                className="w-full h-full object-cover"
              />
              {cafeteria.isOpen && (
                <Badge className="absolute top-3 right-3 bg-green-600">Open Now</Badge>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-slate-900 mb-1">{cafeteria.name}</h3>
                  <div className="flex items-center gap-1 text-amber-500 mb-2">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm text-slate-900">{cafeteria.rating}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-slate-600 mb-2">
                <MapPin className="w-4 h-4" />
                <p className="text-sm">{cafeteria.location}</p>
              </div>
              <p className="text-sm text-slate-600 mb-3">{cafeteria.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">{cafeteria.estimatedTime}</span>
                </div>
                <Button size="sm" className="text-white hover:opacity-90" style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}>
                  Pre-Order
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Action Banner */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50">
        <CardContent className="py-8 text-center">
          <h3 className="text-slate-900 mb-2">Explore All Cafeterias</h3>
          <p className="text-slate-600 mb-4">Browse menus from all UTM cafeterias and pre-order your meals</p>
          <Button 
            className="text-white hover:opacity-90"
            style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}
            onClick={() => onNavigate('menu')}
          >
            Browse All Cafeterias
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
