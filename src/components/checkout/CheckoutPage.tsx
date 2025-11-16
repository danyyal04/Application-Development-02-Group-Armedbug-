import { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { Separator } from '../ui/separator.js';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group.js';
import { Label } from '../ui/label.js';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog.js';
import { Input } from '../ui/input.js';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient.js';

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
  pin: string;
  is_default: boolean;
  balance: number | null;
  credit_limit: number | null;
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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [paymentCredentials, setPaymentCredentials] = useState('');
  const [newPaymentData, setNewPaymentData] = useState({
    type: 'fpx' as 'fpx' | 'ewallet' | 'card',
    name: '',
    details: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const serviceFee = 0.50;
  const total = subtotal + serviceFee;

  // Fetch payment methods
  const fetchPayments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('payment')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) return toast.error('Failed to load payment methods');
    if (data) setPaymentMethods(data as PaymentMethod[]);

    // Select default payment if exists
    const defaultMethod = (data as PaymentMethod[]).find(pm => pm.is_default);
    if (defaultMethod) setSelectedPaymentId(defaultMethod.id);
  };

  useEffect(() => {
    fetchPayments();

    // Subscribe to real-time payment method changes
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase.channel('payment-changes').on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment', filter: `user_id=eq.${user.id}` },
        () => {
          fetchPayments();
        }
      ).subscribe();

      return () => {
        channel.unsubscribe();
      };
    })();
  }, []);

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

  // Add new payment method
  const handleAddNewPayment = async () => {
    if (!newPaymentData.name || !newPaymentData.details) {
      toast.error('Please fill in all fields');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error('User not logged in');

    const payload = {
      user_id: user.id,
      type: newPaymentData.type,
      name: newPaymentData.name,
      details: newPaymentData.details,
      is_default: paymentMethods.length === 0,
      balance: newPaymentData.type === 'card' ? null : 100,
      credit_limit: newPaymentData.type === 'card' ? 500 : null,
    };

    const { data, error } = await supabase
      .from('payment')
      .insert([payload])
      .select()
      .single();

    if (error) return toast.error('Failed to add payment method');

    // ✅ Add to state and select it
    setPaymentMethods([...paymentMethods, data]);
    setSelectedPaymentId(data.id);

    setShowAddPaymentDialog(false);
    setNewPaymentData({ type: 'fpx', name: '', details: '' });
    toast.success('Payment method added successfully!');
  };

  // Confirm payment and place order
  const handleConfirmPayment = async () => {
    if (!selectedPaymentId) return toast.error('Please select a payment method');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error('User not logged in');

    const { data: payment } = await supabase
      .from('payment')
      .select('*')
      .eq('id', selectedPaymentId)
      .single();

    if (!payment) return toast.error('Payment method not found');

    // Check PIN
    if (payment.pin !== paymentCredentials) {
      return toast.error('Incorrect PIN');
    }

    // Check balance / credit_limit
    if (payment.type === 'card' && total > payment.credit_limit!) {
      return toast.error('Credit limit exceeded! Please use another card.');
    }
    if ((payment.type === 'fpx' || payment.type === 'ewallet') && total > payment.balance!) {
      return toast.error('Insufficient balance! Please use another method.');
    }

    setIsProcessing(true);

    // Place order
    const { error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: user.id,
        total_amount: total,
        payment_id: payment.id,
        items: JSON.stringify(cartItems),
      }]);

    if (orderError) {
      setIsProcessing(false);
      return toast.error('Failed to place order');
    }

    // Deduct balance/credit
    const { error: updateError } = await supabase
      .from('payment')
      .update({
        balance: payment.balance ? payment.balance - total : payment.balance,
        credit_limit: payment.credit_limit ? payment.credit_limit - total : payment.credit_limit,
      })
      .eq('id', selectedPaymentId);

    if (updateError) {
      setIsProcessing(false);
      return toast.error('Payment failed');
    }

    toast.success('Payment successful! Your order is being prepared.');
    setShowPaymentDialog(false);
    onSuccess();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Menu
        </Button>
        <h1 className="text-slate-900 mb-2">Checkout 💳</h1>
        <p className="text-slate-600">Review your order and complete payment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order & Payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pickup Details */}
          <Card>
            <CardHeader>
              <CardTitle>Pickup Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span className="text-slate-600">Cafeteria</span><span className="text-slate-900">{cafeteria.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Location</span><span className="text-slate-900">{cafeteria.location}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Pickup Time</span>
                <Badge className="bg-purple-600"><Clock className="w-3 h-3 mr-1" />{getPickupTimeLabel(pickupTime)}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>{cartItems.length} items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between py-2">
                  <div><p className="text-slate-900">{item.name}</p><p className="text-sm text-slate-500">Qty: {item.quantity}</p></div>
                  <p className="text-slate-900">RM {(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader className="flex justify-between">
              <div><CardTitle>Payment Method</CardTitle><CardDescription>Select your preferred payment option</CardDescription></div>
              <Button variant="outline" size="sm" onClick={() => setShowAddPaymentDialog(true)}>Add New</Button>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 mb-4">No payment methods found.</p>
                  <Button onClick={() => setShowAddPaymentDialog(true)}>Add Payment Method</Button>
                </div>
              ) : (
                <RadioGroup value={selectedPaymentId} onValueChange={setSelectedPaymentId} className="space-y-3">
                  {paymentMethods.map(pm => (
                    <div key={pm.id} className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer ${selectedPaymentId === pm.id ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`} onClick={() => setSelectedPaymentId(pm.id)}>
                      <RadioGroupItem value={pm.id} id={pm.id} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={pm.id} className="cursor-pointer text-slate-900">{pm.name}</Label>
                          {pm.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
                        </div>
                        <p className="text-sm text-slate-600">{getPaymentTypeLabel(pm.type)} • {(pm.type === 'fpx' || pm.type === 'ewallet') ? `Balance: RM ${pm.balance?.toFixed(2)}` : `Limit: RM ${pm.credit_limit?.toFixed(2)}`}</p>
                      </div>
                      <CreditCard className="w-5 h-5 text-slate-400" />
                    </div>
                  ))}
                </RadioGroup>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Price Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader><CardTitle>Price Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>RM {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Service Fee</span><span>RM {serviceFee.toFixed(2)}</span></div>
              </div>
              <Separator />
              <div className="flex justify-between text-slate-900"><span>Total</span><span>RM {total.toFixed(2)}</span></div>
              <Button className="w-full text-white hover:opacity-90" style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }} onClick={() => setShowPaymentDialog(true)} disabled={!selectedPaymentId}>Place Order</Button>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-800">Your payment will be processed securely. Please collect your order at the specified pickup time.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Payment</DialogTitle><DialogDescription>Enter your PIN / credentials to process payment</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-600">Amount</span><span className="text-slate-900">RM {total.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-600">Payment Method</span><span className="text-slate-900">{paymentMethods.find(m => m.id === selectedPaymentId)?.name}</span></div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credentials">Enter PIN to confirm payment</Label>
              <Input id="credentials" type="password" placeholder="Enter PIN" value={paymentCredentials} onChange={e => setPaymentCredentials(e.target.value)} />
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-800">Demo mode: Enter your PIN / credentials to simulate payment</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={isProcessing} className="flex-1">Cancel</Button>
            <Button onClick={handleConfirmPayment} disabled={isProcessing} className="flex-1 text-white hover:opacity-90" style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}>{isProcessing ? 'Processing...' : 'Confirm Payment'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Payment Method</DialogTitle><DialogDescription>Add a payment method to use for your orders</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <select
                className="w-full rounded-md border bg-input-background px-3 py-2 text-sm"
                value={newPaymentData.type}
                onChange={(e) => setNewPaymentData({ ...newPaymentData, type: e.target.value as any, name: '', details: '' })}
              >
                <option value="fpx">FPX Online Banking</option>
                <option value="ewallet">E-Wallet</option>
                <option value="card">Debit/Credit Card</option>
              </select>
            </div>

            {/* Conditional fields */}
            {newPaymentData.type === 'fpx' && (
              <>
                <div className="space-y-2">
                  <Label>Bank</Label>
                  <select
                    className="w-full rounded-md border bg-input-background px-3 py-2 text-sm"
                    value={newPaymentData.name}
                    onChange={(e) => setNewPaymentData({ ...newPaymentData, name: e.target.value })}
                  >
                    <option value="">Select bank</option>
                    <option value="Maybank">Maybank</option>
                    <option value="CIMB">CIMB</option>
                    <option value="Public Bank">Public Bank</option>
                    <option value="RHB">RHB</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Account Last 4 digits</Label>
                  <Input placeholder="1234" maxLength={4} value={newPaymentData.details} onChange={e => setNewPaymentData({ ...newPaymentData, details: e.target.value })} />
                </div>
              </>
            )}

            {newPaymentData.type === 'ewallet' && (
              <>
                <div className="space-y-2">
                  <Label>E-Wallet</Label>
                  <select
                    className="w-full rounded-md border bg-input-background px-3 py-2 text-sm"
                    value={newPaymentData.name}
                    onChange={(e) => setNewPaymentData({ ...newPaymentData, name: e.target.value })}
                  >
                    <option value="">Select provider</option>
                    <option value="TnG">Touch 'n Go</option>
                    <option value="GrabPay">GrabPay</option>
                    <option value="ShopeePay">ShopeePay</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Wallet PIN</Label>
                  <Input placeholder="1234" maxLength={4} value={newPaymentData.details} onChange={e => setNewPaymentData({ ...newPaymentData, details: e.target.value })} />
                </div>
              </>
            )}

            {newPaymentData.type === 'card' && (
              <>
                <div className="space-y-2">
                  <Label>Card Name</Label>
                  <Input placeholder="Visa / Mastercard" value={newPaymentData.name} onChange={e => setNewPaymentData({ ...newPaymentData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Card Last 4 digits</Label>
                  <Input placeholder="1234" maxLength={4} value={newPaymentData.details} onChange={e => setNewPaymentData({ ...newPaymentData, details: e.target.value })} />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAddPaymentDialog(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAddNewPayment} className="flex-1 text-white hover:opacity-90" style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}>Add Payment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
