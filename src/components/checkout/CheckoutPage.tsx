import { useState } from 'react';
import { ArrowLeft, CreditCard, Check, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { Separator } from '../ui/separator.js';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group.js';
import { Label } from '../ui/label.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';
import { Input } from '../ui/input.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.js';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PaymentMethod {
  id: string;
  type: 'fpx' | 'ewallet' | 'card';
  name: string;
  details: string;
  isDefault: boolean;
}

interface CheckoutPageProps {
  cafeteria: {
    name: string;
    location: string;
  };
  cartItems: CartItem[];
  pickupTime: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function CheckoutPage({ cafeteria, cartItems, pickupTime, onBack, onSuccess }: CheckoutPageProps) {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [paymentCredentials, setPaymentCredentials] = useState('');

  // Mock saved payment methods
  const [savedPaymentMethods] = useState<PaymentMethod[]>([
    { id: '1', type: 'fpx', name: 'Maybank', details: '****1234', isDefault: true },
    { id: '2', type: 'ewallet', name: 'Touch \'n Go eWallet', details: '012-345-6789', isDefault: false },
    { id: '3', type: 'card', name: 'Visa', details: '****5678', isDefault: false },
  ]);

  const [newPaymentData, setNewPaymentData] = useState({
    type: 'fpx' as 'fpx' | 'ewallet' | 'card',
    name: '',
    details: '',
  });

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const serviceFee = 0.50;
  const total = subtotal + serviceFee;

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'fpx': return 'FPX Banking';
      case 'ewallet': return 'E-Wallet';
      case 'card': return 'Debit/Credit Card';
      default: return type;
    }
  };

  const getPickupTimeLabel = (value: string) => {
    switch (value) {
      case 'asap': return 'ASAP';
      case '30min': return 'In 30 minutes';
      case '1hour': return 'In 1 hour';
      case '1.5hour': return 'In 1.5 hours';
      case '2hour': return 'In 2 hours';
      default: return value;
    }
  };

  const handleAddNewPayment = () => {
    if (!newPaymentData.name || !newPaymentData.details) {
      toast.error('Please fill in all fields');
      return;
    }

    toast.success('Payment method added successfully!');
    setShowAddPaymentDialog(false);
    setNewPaymentData({ type: 'fpx', name: '', details: '' });
  };

  const handlePaymentMethodSelect = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
  };

  const handleProceedToPayment = () => {
    if (!selectedPaymentId) {
      toast.error('Please select a payment method');
      return;
    }

    setShowPaymentDialog(true);
  };

  const handleConfirmPayment = () => {
    if (!paymentCredentials) {
      toast.error('Invalid payment details. Please check and try again.');
      return;
    }

    setIsProcessing(true);

    // Simulate payment gateway processing
    setTimeout(() => {
      const isSuccess = Math.random() > 0.1; // 90% success rate for demo

      if (isSuccess) {
        toast.success('Payment successful! Your order is being prepared.');
        setShowPaymentDialog(false);
        onSuccess();
      } else {
        toast.error('Payment failed or cancelled. Please try again.');
        setIsProcessing(false);
      }
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Menu
        </Button>
        <h1 className="text-slate-900 mb-2">Checkout 💳</h1>
        <p className="text-slate-600">Review your order and complete payment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pickup Details */}
          <Card>
            <CardHeader>
              <CardTitle>Pickup Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Cafeteria</span>
                <span className="text-slate-900">{cafeteria.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Location</span>
                <span className="text-slate-900">{cafeteria.location}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Pickup Time</span>
                <Badge className="bg-purple-600">
                  <Clock className="w-3 h-3 mr-1" />
                  {getPickupTimeLabel(pickupTime)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>{cartItems.length} items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <p className="text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-slate-900">RM {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>Select your preferred payment option</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddPaymentDialog(true)}
                >
                  Add New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {savedPaymentMethods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 mb-4">No payment methods found.</p>
                  <Button onClick={() => setShowAddPaymentDialog(true)}>
                    Add Payment Method
                  </Button>
                </div>
              ) : (
                <RadioGroup value={selectedPaymentId} onValueChange={handlePaymentMethodSelect}>
                  <div className="space-y-3">
                    {savedPaymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedPaymentId === method.id
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => handlePaymentMethodSelect(method.id)}
                      >
                        <RadioGroupItem value={method.id} id={method.id} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={method.id} className="cursor-pointer text-slate-900">
                              {method.name}
                            </Label>
                            {method.isDefault && (
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">
                            {getPaymentTypeLabel(method.type)} • {method.type === 'ewallet' ? method.details : `****${method.details}`}
                          </p>
                        </div>
                        <CreditCard className="w-5 h-5 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Price Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Price Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>RM {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Service Fee</span>
                  <span>RM {serviceFee.toFixed(2)}</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between text-slate-900">
                <span>Total</span>
                <span>RM {total.toFixed(2)}</span>
              </div>

              <Button
                className="w-full text-white hover:opacity-90"
                style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}
                onClick={handleProceedToPayment}
                disabled={!selectedPaymentId}
              >
                Place Order
              </Button>

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-800">
                  Your payment will be processed securely. Please collect your order at the specified pickup time.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Gateway Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Enter your credentials to process payment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Amount</span>
                <span className="text-slate-900">RM {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Payment Method</span>
                <span className="text-slate-900">
                  {savedPaymentMethods.find(m => m.id === selectedPaymentId)?.name}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credentials">
                {savedPaymentMethods.find(m => m.id === selectedPaymentId)?.type === 'fpx'
                  ? 'Banking Username/PIN'
                  : savedPaymentMethods.find(m => m.id === selectedPaymentId)?.type === 'ewallet'
                  ? 'E-Wallet PIN'
                  : 'Card CVV'}
              </Label>
              <Input
                id="credentials"
                type="password"
                placeholder="Enter credentials"
                value={paymentCredentials}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentCredentials(e.target.value)}
              />
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-800">
                Demo mode: Enter any credentials to simulate payment
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={isProcessing}
              className="flex-1 text-white hover:opacity-90"
              style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}
            >
              {isProcessing ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Method Dialog */}
      <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Payment Method</DialogTitle>
            <DialogDescription>
              Add a payment method to use for your orders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type">Payment Type</Label>
              <Select
                value={newPaymentData.type}
                onValueChange={(value: any) => setNewPaymentData({ ...newPaymentData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fpx">FPX Online Banking</SelectItem>
                  <SelectItem value="ewallet">E-Wallet</SelectItem>
                  <SelectItem value="card">Debit/Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newPaymentData.type === 'fpx' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bank">Bank Name</Label>
                  <Select
                    value={newPaymentData.name}
                    onValueChange={(value: string) => setNewPaymentData({ ...newPaymentData, name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Maybank">Maybank</SelectItem>
                      <SelectItem value="CIMB Bank">CIMB Bank</SelectItem>
                      <SelectItem value="Public Bank">Public Bank</SelectItem>
                      <SelectItem value="RHB Bank">RHB Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account">Account Number (Last 4 digits)</Label>
                  <Input
                    id="account"
                    placeholder="1234"
                    maxLength={4}
                    value={newPaymentData.details}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPaymentData({ ...newPaymentData, details: e.target.value })}
                  />
                </div>
              </>
            )}

            {newPaymentData.type === 'ewallet' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="wallet">E-Wallet Provider</Label>
                  <Select
                    value={newPaymentData.name}
                    onValueChange={(value: string) => setNewPaymentData({ ...newPaymentData, name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Touch 'n Go eWallet">Touch 'n Go eWallet</SelectItem>
                      <SelectItem value="GrabPay">GrabPay</SelectItem>
                      <SelectItem value="Boost">Boost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="012-345-6789"
                    value={newPaymentData.details}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPaymentData({ ...newPaymentData, details: e.target.value })}
                  />
                </div>
              </>
            )}

            {newPaymentData.type === 'card' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cardType">Card Type</Label>
                  <Select
                    value={newPaymentData.name}
                    onValueChange={(value: string) => setNewPaymentData({ ...newPaymentData, name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select card type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Visa">Visa</SelectItem>
                      <SelectItem value="Mastercard">Mastercard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number (Last 4 digits)</Label>
                  <Input
                    id="cardNumber"
                    placeholder="5678"
                    maxLength={4}
                    value={newPaymentData.details}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPaymentData({ ...newPaymentData, details: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNewPayment} className="text-white hover:opacity-90" style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}>
              Add Method
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
