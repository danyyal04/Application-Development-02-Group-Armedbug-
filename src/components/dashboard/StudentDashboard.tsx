import { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  ShoppingBag,
  CreditCard,
  Star,
  MapPin,
  Search,
  ShoppingCart,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import MenuList from '../menu/MenuList';
import type { CartSummaryItem } from '../menu/MenuList';
import OrderTracking from '../orders/OrderTracking';
import PaymentMethods from '../payment/PaymentMethods';
import ProfileSettings from '../profile/ProfileSettings';
import CafeteriaList from '../cafeteria/CafeteriaList';
import CheckoutPage from '../checkout/CheckoutPage';
import CartPage from '../cart/CartPage';
import CartSideBar from '../cart/CartSideBar';
import SplitBillInitiation from '../cart/SplitBillInitiation';
import SplitBillPage from '../cart/SplitBillPage';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';

type CartItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  imageUrl: string;
  category: string;
};

type SplitBillItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

interface StudentDashboardProps {
  user: any;
  currentPage: string;
  onNavigate: (page: any) => void;
}

const DEFAULT_CAFETERIA = {
  id: 'utm-default',
  name: 'UTMMunch Cafeterias',
  location: 'Universiti Teknologi Malaysia',
};

export default function StudentDashboard({ user, currentPage, onNavigate }: StudentDashboardProps) {
  const MAX_CART_QUANTITY = 10;
  const [selectedCafeteria, setSelectedCafeteria] = useState<any>(null);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [featuredCafeterias, setFeaturedCafeterias] = useState<any[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartPickupTime, setCartPickupTime] = useState('asap');
  const [cartCafeteria, setCartCafeteria] = useState<any | null>(null);
  const [splitBillItems, setSplitBillItems] = useState<SplitBillItem[]>([]);
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false);

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

  useEffect(() => {
    if (cartItems.length === 0) {
      setCartCafeteria(null);
    }
  }, [cartItems.length]);

  useEffect(() => {
    if (
      (currentPage === 'split-bill-initiation' || currentPage === 'split-bill-tracking') &&
      splitBillItems.length === 0
    ) {
      toast.info('Start checkout from your cart to use split bill.');
      onNavigate('dashboard');
    }
  }, [currentPage, splitBillItems.length, onNavigate]);

  const totalCartItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const cartPageCafeteria = cartCafeteria ?? selectedCafeteria ?? DEFAULT_CAFETERIA;
  const splitBillTotal = splitBillItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addItemToCart = (item: Omit<CartItem, 'quantity'>, notify = false) => {
    let updated = false;
    setCartItems(prev => {
      const existing = prev.find(ci => ci.id === item.id);
      if (existing) {
        if (existing.quantity >= MAX_CART_QUANTITY) {
          if (notify) toast.error('Maximum quantity reached.');
          return prev;
        }
        updated = true;
        return prev.map(ci =>
          ci.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      updated = true;
      return [...prev, { ...item, quantity: 1 }];
    });

    if (updated && selectedCafeteria) {
      setCartCafeteria(selectedCafeteria);
    }

    if (updated && notify) {
      toast.success(`${item.name} added to cart`);
    }
  };

  const decreaseCartItem = (itemId: string, notify = false) => {
    let message: string | null = null;
    setCartItems(prev => {
      const target = prev.find(item => item.id === itemId);
      if (!target) return prev;
      if (target.quantity <= 1) {
        message = 'Item removed from cart';
        return prev.filter(item => item.id !== itemId);
      }
      message = 'Quantity updated';
      return prev.map(item =>
        item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item
      );
    });

    if (notify && message) {
      toast.success(message);
    }
  };

  const removeCartItem = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateCartQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity > MAX_CART_QUANTITY) {
      toast.error('Maximum quantity reached.');
      return;
    }
    if (newQuantity <= 0) {
      removeCartItem(itemId);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleMenuCheckout = (items: CartSummaryItem[], pickup: string) => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    setCartPickupTime(pickup);
    setCheckoutData({
      cafeteria: selectedCafeteria,
      cartItems: items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      pickupTime: pickup,
    });
  };

  const handleProceedToSplitBill = () => {
    if (cartItems.length === 0) {
      toast.error('Add items to your cart before checking out.');
      return;
    }
    setSplitBillItems(
      cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }))
    );
    onNavigate('split-bill-initiation');
  };

  const handleSplitBillCompletion = () => {
    toast.success('Split bill fully settled!');
    setCartItems([]);
    setSplitBillItems([]);
    onNavigate('orders');
  };

  const renderContent = () => {
    if (currentPage === 'cart-preview') {
      return (
        <CartPage
          cartItems={cartItems}
          cafeteria={cartPageCafeteria}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeCartItem}
          onBackToMenu={() => onNavigate(selectedCafeteria ? 'menu' : 'dashboard')}
          onProceedToCheckout={handleProceedToSplitBill}
        />
      );
    }

    if (currentPage === 'split-bill-initiation') {
      return (
        <SplitBillInitiation
          cartItems={splitBillItems}
          totalAmount={splitBillTotal}
          onInitiateSplitBill={() => {
            toast.success('Split bill link shared with your group.');
            onNavigate('split-bill-tracking');
          }}
          onCancel={() => onNavigate('cart-preview')}
        />
      );
    }

    if (currentPage === 'split-bill-tracking') {
      return (
        <SplitBillPage
          splitBillId="SB-LIVE-001"
          cartItems={splitBillItems}
          totalAmount={splitBillTotal}
          cafeteria={{ name: cartPageCafeteria.name, location: cartPageCafeteria.location }}
          pickupTime={cartPickupTime}
          initiatorName={user.name || 'UTM Student'}
          currentUserEmail={user.email || 'student@utm.my'}
          onPaymentComplete={participantId => {
            toast.success(`Payment recorded for ${participantId}.`);
          }}
          onCancel={() => onNavigate('dashboard')}
          onCompleteSplitBill={handleSplitBillCompletion}
        />
      );
    }

    if (currentPage === 'menu') {
      if (checkoutData) {
        return (
          <CheckoutPage
            cafeteria={checkoutData.cafeteria || cartPageCafeteria}
            cartItems={checkoutData.cartItems}
            pickupTime={checkoutData.pickupTime}
            onBack={() => setCheckoutData(null)}
            onSuccess={() => {
              setCheckoutData(null);
              setCartItems([]);
              setSelectedCafeteria(null);
              toast.success('Order placed successfully!');
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
            onCheckout={handleMenuCheckout}
            cartItems={cartItems}
            pickupTime={cartPickupTime}
            onPickupTimeChange={setCartPickupTime}
            onAddToCart={item => addItemToCart(item, true)}
            onDecreaseItem={itemId => decreaseCartItem(itemId, true)}
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

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-slate-900 mb-2">Welcome back, {user.name}!</h1>
            <p className="text-slate-600">
              Pre-order your favorite meals from UTM cafeterias and skip the queue.
            </p>
          </div>
          <Button
            variant="outline"
            className="relative w-full md:w-auto"
            onClick={() => {
              if (cartItems.length === 0) {
                toast.info('Your cart is empty.');
                return;
              }
              onNavigate('cart-preview');
            }}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            View Cart
            {totalCartItems > 0 && (
              <Badge className="ml-2 bg-purple-600 text-white">{totalCartItems}</Badge>
            )}
          </Button>
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card
            className="border-slate-200 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onNavigate('orders')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-slate-600">Active Orders</CardTitle>
              <ShoppingBag className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-slate-900">2</div>
              <p className="text-xs text-slate-500 mt-1">In progress</p>
            </CardContent>
          </Card>

          <Card
            className="border-slate-200 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onNavigate('payment')}
          >
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
              ].map(order => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-slate-900">{order.id}</p>
                      <Badge variant={order.status === 'Ready for Pickup' ? 'default' : 'secondary'}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {order.cafeteria} - {order.items}
                    </p>
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

        <div className="mb-4">
          <h2 className="text-slate-900 mb-4">Featured Cafeterias</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {featuredCafeterias.map(cafeteria => (
            <Card
              key={cafeteria.id}
              className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedCafeteria(cafeteria);
                onNavigate('menu');
              }}
            >
              <div className="aspect-video w-full overflow-hidden bg-slate-100 relative">
                <img src={cafeteria.image || '/UTMMunch-Logo.jpg'} alt={cafeteria.name} className="w-full h-full object-cover" />
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

        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50">
          <CardContent className="py-8 text-center">
            <h3 className="text-slate-900 mb-2">Explore All Cafeterias</h3>
            <p className="text-slate-600 mb-4">
              Browse menus from all UTM cafeterias and pre-order your meals
            </p>
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
  };

  return (
    <>
      <CartSideBar
        cartItems={cartItems}
        cafeteria={cartCafeteria ?? selectedCafeteria}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeCartItem}
        onCheckout={() => {
          setIsCartSidebarOpen(false);
          onNavigate('cart-preview');
        }}
        isOpen={isCartSidebarOpen}
        onOpenChange={setIsCartSidebarOpen}
      />
      {renderContent()}
      {currentPage === 'dashboard' && totalCartItems > 0 && (
        <Button
          onClick={() => setIsCartSidebarOpen(true)}
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg bg-gradient-to-r from-purple-700 to-pink-700 hover:opacity-90"
        >
          <ShoppingCart className="w-5 h-5" />
        </Button>
      )}
    </>
  );
}
