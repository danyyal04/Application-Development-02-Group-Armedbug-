import { useEffect, useMemo, useState } from 'react';
import { Search, ShoppingCart, Plus, Minus, ArrowLeft, Clock, MapPin, Star } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';

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

export interface CartSummaryItem {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  imageUrl: string;
  category: string;
}

interface MenuListProps {
  cafeteria: {
    id: string;
    name: string;
    location: string;
    rating: number;
    estimatedTime: string;
  };
  onBack: () => void;
  onCheckout: (cartItems: CartSummaryItem[], pickupTime: string) => void;
  cartItems: CartSummaryItem[];
  pickupTime: string;
  onPickupTimeChange: (value: string) => void;
  onAddToCart: (item: Omit<CartSummaryItem, 'quantity'>) => void;
  onDecreaseItem: (itemId: string) => void;
}

export default function MenuList({
  cafeteria,
  onBack,
  onCheckout,
  cartItems,
  pickupTime,
  onPickupTimeChange,
  onAddToCart,
  onDecreaseItem,
}: MenuListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadMenu = async () => {
      setIsLoading(true);
      try {
        // Resolve cafeteria filter if provided
        const cafeteriaId = cafeteria?.id;

        // Try RPC first (bypasses RLS if function is security definer)
        const { data: rpcData, error: rpcError } = await supabase.rpc('list_menu_items');
        let rows = rpcData;
        let fetchError = rpcError;

        if (rpcError || !rpcData) {
          const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .order('name', { ascending: true });
          rows = data;
          fetchError = error;
        }

        if (fetchError) throw fetchError;

        const filtered = (rows || []).filter(
          (row: any) => row.available !== false && (!cafeteriaId || row.cafeteria_id === cafeteriaId)
        );

        setMenuItems(filtered.map(mapMenuRowToItem));
        setHasError(false);
      } catch (error: any) {
        setHasError(true);
        toast.error('Unable to load menu. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    loadMenu();
  }, [cafeteria.id]);

  const filteredItems = menuItems.filter(
    item =>
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

  const cartQuantities = useMemo(() => {
    return cartItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.id] = item.quantity;
      return acc;
    }, {});
  }, [cartItems]);

  const totalItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  const handleViewCart = () => {
    if (totalItems === 0) {
      toast.error('Your cart is empty');
      return;
    }
    onCheckout(cartItems, pickupTime || 'asap');
  };

  const handleAddToCart = (item: MenuItem) => {
    if (!item.available) {
      toast.error('This item is currently unavailable');
      return;
    }

    onAddToCart({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl,
      category: item.category,
    });
  };

  const handleDecreaseFromCart = (itemId: string) => {
    onDecreaseItem(itemId);
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
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button className="w-full sm:w-auto" onClick={handleSearchSubmit}>
              Search
            </Button>
            {searchQuery && (
              <Button className="w-full sm:w-auto" variant="outline" onClick={() => setSearchQuery('')}>
                Clear
              </Button>
            )}
          </div>
        </div>
        {searchQuery && filteredItems.length === 0 && (
          <p className="text-sm text-slate-500 mt-2">No items found for your search.</p>
        )}
      </div>

      {/* Cart Summary banner */}
      {totalItems > 0 && (
        <Card className="mb-8 border-purple-200 bg-purple-50">
          <CardContent className="py-4 space-y-4">
            <div className="flex items-center justify-between text-purple-900">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5" />
                <div>
                  <p className="font-semibold">{totalItems} {totalItems === 1 ? 'item' : 'items'} in cart</p>
                  <p className="text-sm text-purple-700">Total: RM {totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupTimeBanner" className="text-purple-900">Pickup Time</Label>
              <Select value={pickupTime} onValueChange={onPickupTimeChange}>
                <SelectTrigger id="pickupTimeBanner" className="bg-white">
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
              style={{ background: 'linear-gradient(90deg, #7e22ce, #ec4899)' }}
              onClick={handleViewCart}
            >
              View Cart & Checkout
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading menu items...</div>
      ) : hasError ? (
        <div className="text-center py-12 text-slate-500">Unable to load menu. Please check your connection.</div>
      ) : menuItems.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No menu items available at the moment.</div>
      ) : null}

      {/* Menu Items */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">No items found for your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video w-full overflow-hidden bg-slate-100">
                <img src={item.imageUrl || '/UTMMunch-Logo.jpg'} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-slate-900 mb-1">{item.name}</h3>
                    <Badge variant="secondary" className="mb-2">
                      {item.category}
                    </Badge>
                  </div>
                  <p className="text-purple-700">RM {item.price.toFixed(2)}</p>
                </div>
                <p className="text-sm text-slate-600 mb-4">{item.description}</p>

                {cartQuantities[item.id] ? (
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDecreaseFromCart(item.id)}
                      className="flex-1"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-slate-900 px-4">{cartQuantities[item.id]}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddToCart(item)}
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleAddToCart(item)}
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
