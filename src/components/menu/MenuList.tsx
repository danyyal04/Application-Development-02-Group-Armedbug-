import { useState } from 'react';
import { Search, ShoppingCart, Plus, Minus, ArrowLeft, Clock, MapPin, Star } from 'lucide-react';
import { Card, CardContent } from '../ui/card.js';
import { Input } from '../ui/input.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { Label } from '../ui/label.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.js';
import { toast } from 'sonner';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  available: boolean;
}

const mockMenuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Nasi Lemak',
    description: 'Traditional Malaysian rice dish with sambal, anchovies, peanuts, and egg',
    price: 8.50,
    category: 'Main Course',
    imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398',
    available: true,
  },
  {
    id: '2',
    name: 'Chicken Rice',
    description: 'Tender chicken served with fragrant rice and special sauce',
    price: 10.00,
    category: 'Main Course',
    imageUrl: 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2',
    available: true,
  },
  {
    id: '3',
    name: 'Mee Goreng',
    description: 'Spicy fried noodles with vegetables and your choice of protein',
    price: 7.50,
    category: 'Main Course',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624',
    available: true,
  },
  {
    id: '4',
    name: 'Teh Tarik',
    description: 'Classic Malaysian pulled tea',
    price: 2.50,
    category: 'Beverages',
    imageUrl: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f',
    available: true,
  },
  {
    id: '5',
    name: 'Ice Lemon Tea',
    description: 'Refreshing iced tea with lemon',
    price: 3.00,
    category: 'Beverages',
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc',
    available: true,
  },
  {
    id: '6',
    name: 'Roti Canai',
    description: 'Crispy flatbread served with curry dipping sauce',
    price: 4.00,
    category: 'Snacks',
    imageUrl: 'https://images.unsplash.com/photo-1630383249896-424e482df921',
    available: true,
  },
];

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
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [pickupTime, setPickupTime] = useState('asap');

  const filteredItems = mockMenuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    const item = mockMenuItems.find(i => i.id === itemId);
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
      const item = mockMenuItems.find(i => i.id === itemId);
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
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search for food, drinks, or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

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
