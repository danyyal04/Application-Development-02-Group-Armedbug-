import { useEffect, useState } from 'react';
import { Search, ShoppingCart, Plus, Minus, ArrowLeft, Clock, MapPin, Star } from 'lucide-react';
import { Card, CardContent } from '../ui/card.js';
import { Input } from '../ui/input.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { Label } from '../ui/label.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.js';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient.js';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  available: boolean;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c';

const mapMenuRowToItem = (row: any): MenuItem => ({
  id: row.id,
  name: row.name,
  description: row.description ?? '',
  price: Number(row.price) || 0,
  category: row.category ?? 'Main Course',
  imageUrl: row.image_url || FALLBACK_IMAGE,
  available: row.available ?? true,
});

interface MenuListProps {
  cafeteria: {
    id: string;
    name: string;
    location: string;
    rating: number;
    estimatedTime: string;
  };
  onBack: () => void;
  onCheckout: (cartItems: any[], pickupTime: string) => void;
}

export default function MenuList({ cafeteria, onBack, onCheckout }: MenuListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [pickupTime, setPickupTime] = useState('asap');

  useEffect(() => {
    const loadMenu = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('cafeteria_id', cafeteria.id)
          .eq('available', true)
          .order('name', { ascending: true });

        if (error) throw error;

        setMenuItems((data || []).map(mapMenuRowToItem));
        setHasError(false);
      } catch (error) {
        setHasError(true);
        toast.error('Unable to load menu. Please check your connection.');
      } finally {
        setIsLoading(false);
      }
    };
    loadMenu();
  }, [cafeteria.id]);

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a keyword to search.');
      return;
    }
    if (filteredItems.length === 0) {
      toast.error('No items found for your search.');
    }
  };

  const addToCart = (itemId: string) => {
    setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
    toast.success('Item added to cart');
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] && newCart[itemId] > 1) {
        newCart[itemId]--;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
    toast.success('Item removed from cart');
  };

  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = Object.entries(cart).reduce((sum, [itemId, qty]) => {
    const item = menuItems.find(i => i.id === itemId);
    return sum + (item?.price || 0) * qty;
  }, 0);

  const handleCheckout = () => {
    if (totalItems === 0) {
      toast.error('Your cart is empty');
      return;
    }
    
    if (pickupTime === '') {
      toast.error('Please select a pickup time');
      return;
    }

    // Prepare cart items for checkout
    const cartItemsArray = Object.entries(cart).map(([itemId, quantity]) => {
      const item = menuItems.find(i => i.id === itemId);
      return {
        id: itemId,
        name: item?.name || '',
        price: item?.price || 0,
        quantity,
      };
    });

    onCheckout(cartItemsArray, pickupTime);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Back Button */}
      <div className="mb-8">
        <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cafeterias
        </Button>
        
        {/* Cafeteria Info */}
        <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-slate-900 mb-2">{cafeteria.name}</h1>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{cafeteria.location}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-slate-900">{cafeteria.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{cafeteria.estimatedTime}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="flex flex-col gap-3 w-full">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search for food, drinks, or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button className="w-full sm:w-auto" onClick={handleSearchSubmit}>Search</Button>
            {searchQuery && (
              <Button className="w-full sm:w-auto" variant="outline" onClick={() => setSearchQuery('')}>Clear</Button>
            )}
          </div>
        </div>
        {searchQuery && filteredItems.length === 0 && (
          <p className="text-sm text-slate-500 mt-2">No items found for your search.</p>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading menu items...</div>
      ) : hasError ? (
        <div className="text-center py-12 text-slate-500">Unable to load menu. Please check your connection.</div>
      ) : menuItems.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No menu items available at the moment.</div>
      ) : null}

      {/* Cart Summary with Pickup Time */}
      {totalItems > 0 && (
        <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-purple-700" />
                <div>
                  <p className="text-purple-900">{totalItems} items in cart</p>
                  <p className="text-sm text-purple-700">Total: RM {totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pickupTime" className="text-purple-900">Pickup Time</Label>
              <Select value={pickupTime} onValueChange={setPickupTime}>
                <SelectTrigger id="pickupTime" className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asap">ASAP ({cafeteria.estimatedTime})</SelectItem>
                  <SelectItem value="30min">In 30 minutes</SelectItem>
                  <SelectItem value="1hour">In 1 hour</SelectItem>
                  <SelectItem value="1.5hour">In 1.5 hours</SelectItem>
                  <SelectItem value="2hour">In 2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full text-white hover:opacity-90"
              style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}
              onClick={handleCheckout}
            >
              Pre-Order Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Menu Items */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">No items found for your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video w-full overflow-hidden bg-slate-100">
                <img
                  src={item.imageUrl || '/UTMMunch-Logo.jpg'}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-slate-900 mb-1">{item.name}</h3>
                    <Badge variant="secondary" className="mb-2">{item.category}</Badge>
                  </div>
                  <p className="text-purple-700">RM {item.price.toFixed(2)}</p>
                </div>
                <p className="text-sm text-slate-600 mb-4">{item.description}</p>
                
                {cart[item.id] ? (
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                      className="flex-1"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-slate-900 px-4">{cart[item.id]}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addToCart(item.id)}
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => addToCart(item.id)}
                    className="w-full text-white hover:opacity-90"
                    style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
