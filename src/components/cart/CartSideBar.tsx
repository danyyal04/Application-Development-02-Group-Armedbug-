import type { SyntheticEvent } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { Separator } from '../ui/separator.js';
import { ScrollArea } from '../ui/scroll-area.js';
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

interface CartSidebarProps {
  cartItems: CartItem[];
  cafeteria?: {
    id: string;
    name: string;
    location: string;
  } | null;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckout: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_QUANTITY = 10;
const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' role='img' aria-label='Image unavailable'><rect width='200' height='200' fill='%23E2E8F0'/><text x='50%' y='50%' dy='.35em' text-anchor='middle' fill='%23607080' font-family='Arial, sans-serif' font-size='16'>No Image</text></svg>";

const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
  const target = event.currentTarget;
  target.onerror = null;
  target.src = FALLBACK_IMAGE;
};

export default function CartSidebar({
  cartItems,
  cafeteria,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  isOpen,
  onOpenChange,
}: CartSidebarProps) {
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

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

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }
    onCheckout();
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Shopping Cart
              {totalItems > 0 && (
                <Badge className="bg-purple-600">{totalItems}</Badge>
              )}
            </span>
          </SheetTitle>
        </SheetHeader>

        {cartItems.length === 0 ? (
          /* Empty Cart State */
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-slate-900 mb-2">Your cart is empty</h3>
              <p className="text-slate-600 text-sm">
                Add some delicious items from the menu to get started!
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Cafeteria Info */}
            {cafeteria && (
              <div className="px-6 py-3 bg-purple-50 border-b border-purple-100">
                <p className="text-xs text-purple-900 mb-1">Pickup from</p>
                <p className="text-sm text-slate-900">{cafeteria.name}</p>
                <p className="text-xs text-slate-600">{cafeteria.location}</p>
              </div>
            )}

            {/* Cart Items */}
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-4 py-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="space-y-3">
                    <div className="flex gap-3">
                      {/* Item Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
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
                          <div className="flex-1 pr-2">
                            <h4 className="text-sm text-slate-900 line-clamp-1">
                              {item.name}
                            </h4>
                            <p className="text-xs text-slate-600 line-clamp-1">
                              {item.description}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id, item.name)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0 -mt-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDecreaseQuantity(item.id, item.quantity)}
                              disabled={item.quantity <= 1}
                              className="h-7 w-7 p-0"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-sm text-slate-900">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleIncreaseQuantity(item.id, item.quantity)}
                              disabled={item.quantity >= MAX_QUANTITY}
                              className="h-7 w-7 p-0"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>

                          {/* Item Price */}
                          <div className="text-right">
                            <p className="text-sm text-slate-900">
                              RM {(item.price * item.quantity).toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-500">
                              RM {item.price.toFixed(2)} each
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Separator />
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Cart Summary & Checkout */}
            <div className="border-t px-6 py-4 space-y-4">
              {/* Subtotal */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal ({totalItems} items)</span>
                  <span>RM {subtotal.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-slate-900">
                  <span>Total</span>
                  <span>RM {subtotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                className="w-full bg-gradient-to-r from-[oklch(40.8%_0.153_2.432)] to-[oklch(40.8%_0.153_2.432)] text-white hover:from-[oklch(36%_0.153_2.432)] hover:to-[oklch(36%_0.153_2.432)]"
              >
                Proceed to Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
