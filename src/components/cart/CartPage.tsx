import type { SyntheticEvent } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.js';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  imageUrl: string;
  category: string;
}

interface CartPageProps {
  cartItems: CartItem[];
  cafeteria: {
    id: string;
    name: string;
    location: string;
  };
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onBackToMenu: () => void;
  onProceedToCheckout: () => void;
}

const MAX_QUANTITY = 10;
const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' role='img' aria-label='Image unavailable'><rect width='200' height='200' fill='%23E2E8F0'/><text x='50%' y='50%' dy='.35em' text-anchor='middle' fill='%23607080' font-family='Arial, sans-serif' font-size='16'>No Image</text></svg>";

const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
  const target = event.currentTarget;
  target.onerror = null;
  target.src = FALLBACK_IMAGE;
};

export default function CartPage({
  cartItems,
  cafeteria,
  onUpdateQuantity,
  onRemoveItem,
  onBackToMenu,
  onProceedToCheckout,
}: CartPageProps) {
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleIncreaseQuantity = (itemId: string, currentQuantity: number) => {
    if (currentQuantity >= MAX_QUANTITY) {
      toast.error('Maximum quantity reached.');
      return;
    }
    onUpdateQuantity(itemId, currentQuantity + 1);
    toast.success('Quantity updated');
  };

  const handleDecreaseQuantity = (itemId: string, currentQuantity: number) => {
    if (currentQuantity <= 1) {
      return;
    }
    onUpdateQuantity(itemId, currentQuantity - 1);
    toast.success('Quantity updated');
  };

  const handleRemoveItem = (itemId: string, itemName: string) => {
    onRemoveItem(itemId);
    toast.success(`${itemName} removed from cart`);
  };

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }
    onProceedToCheckout();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={onBackToMenu} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Menu
        </Button>
        <h1 className="text-slate-900 mb-2">Shopping Cart 🛒</h1>
        <p className="text-slate-600">Review and manage your items before checkout</p>
      </div>

      {cartItems.length === 0 ? (
        /* Empty Cart State */
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h2 className="text-slate-900 mb-2">Your cart is empty</h2>
              <p className="text-slate-600 mb-6">
                Add some delicious items from the menu to get started!
              </p>
              <Button
                onClick={onBackToMenu}
                className="bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-800 hover:to-pink-800"
              >
                Browse Menu
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Items ({cartItems.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cartItems.map((item, index) => (
                    <div key={item.id}>
                      <div className="flex gap-4">
                        {/* Item Image */}
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          <img
                            src={item.imageUrl || FALLBACK_IMAGE}
                            alt={item.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                          />
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 pr-4">
                              <h3 className="text-slate-900 mb-1">{item.name}</h3>
                              <p className="text-sm text-slate-600 line-clamp-1">
                                {item.description}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id, item.name)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 -mt-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDecreaseQuantity(item.id, item.quantity)}
                                disabled={item.quantity <= 1}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center text-slate-900">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleIncreaseQuantity(item.id, item.quantity)}
                                disabled={item.quantity >= MAX_QUANTITY}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>

                            {/* Item Price */}
                            <div className="text-right">
                              <p className="text-slate-900">
                                RM {(item.price * item.quantity).toFixed(2)}
                              </p>
                              <p className="text-xs text-slate-500">
                                RM {item.price.toFixed(2)} each
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {index < cartItems.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Continue Shopping Button */}
            <Button
              variant="outline"
              onClick={onBackToMenu}
              className="w-full"
            >
              Continue Shopping
            </Button>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cafeteria Info */}
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-900 mb-1">Pickup from</p>
                  <p className="text-slate-900">{cafeteria.name}</p>
                  <p className="text-sm text-slate-600">{cafeteria.location}</p>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span>RM {subtotal.toFixed(2)}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-slate-900">
                  <span>Total</span>
                  <span>RM {subtotal.toFixed(2)}</span>
                </div>

                {/* Checkout Button */}
                <Button
                  onClick={handleProceedToCheckout}
                  className="w-full bg-gradient-to-r from-[oklch(40.8%_0.153_2.432)] to-[oklch(40.8%_0.153_2.432)] text-white hover:from-[oklch(36%_0.153_2.432)] hover:to-[oklch(36%_0.153_2.432)]"
                >
                  Proceed to Checkout
                </Button>

                {/* Info Alert */}
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-800">
                    You can adjust quantities or remove items before checkout.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
