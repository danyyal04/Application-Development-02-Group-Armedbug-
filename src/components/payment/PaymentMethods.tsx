import { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '../ui/dialog.js';
import { Label } from '../ui/label.js';
import { Input } from '../ui/input.js';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select.js';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient.js';

interface PaymentMethod {
  id: string;
  type: 'fpx' | 'ewallet' | 'card';
  name: string;
  details: string;
  pin: string;
  is_default: boolean;
  balance?: number;
  credit_limit?: number;
}

export default function PaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'fpx' as 'fpx' | 'ewallet' | 'card',
    name: '',
    details: '',
    pin: ''
  });

  // Fetch payment methods
  useEffect(() => {
    async function fetchPayments() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('payment')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) return toast.error('Failed to load payment methods');
      setPaymentMethods(data as PaymentMethod[]);
    }
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

  const handleAddPaymentMethod = async () => {
    if (!formData.name || !formData.details || !formData.pin) {
      toast.error('Please fill in all fields including PIN');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error('User not logged in');

    const payload: any = {
      user_id: user.id,
      type: formData.type,
      name: formData.name,
      details: formData.details,
      pin: formData.pin,
      is_default: paymentMethods.length === 0,
      balance: formData.type === 'card' ? null : 100,
      credit_limit: formData.type === 'card' ? 500 : null
    };

    const { data, error } = await supabase
      .from('payment')
      .insert([payload])
      .select()
      .single();

    if (error) return toast.error('Failed to add payment method');

    setPaymentMethods([...paymentMethods, data as PaymentMethod]);
    setIsAddDialogOpen(false);
    setFormData({ type: 'fpx', name: '', details: '', pin: '' });
    toast.success('Payment method added successfully!');
  };

  const handleDeletePaymentMethod = async (id: string) => {
    const { error } = await supabase.from('payment').delete().eq('id', id);
    if (error) return toast.error('Failed to delete payment method');
    setPaymentMethods(paymentMethods.filter(pm => pm.id !== id));
    toast.success('Payment method removed successfully!');
  };

  const handleSetDefault = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('payment').update({ is_default: false }).eq('user_id', user.id);
    await supabase.from('payment').update({ is_default: true }).eq('id', id);
    setPaymentMethods(paymentMethods.map(pm => ({ ...pm, is_default: pm.id === id })));
    toast.success('Default payment method updated!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 mb-2">Payment Methods 💳</h1>
          <p className="text-slate-600">Manage your payment options</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="text-white hover:opacity-90" style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}>
              <Plus className="w-4 h-4 mr-2" /> Add Payment Method
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Payment Method</DialogTitle>
              <DialogDescription>Add a payment method to use for your orders</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value, name: '', details: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fpx">FPX Online Banking</SelectItem>
                    <SelectItem value="ewallet">E-Wallet</SelectItem>
                    <SelectItem value="card">Debit/Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'fpx' && (
                <>
                  <div className="space-y-2">
                    <Label>Bank</Label>
                    <Select value={formData.name} onValueChange={(val: string) => setFormData({ ...formData, name: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Maybank">Maybank</SelectItem>
                        <SelectItem value="CIMB">CIMB</SelectItem>
                        <SelectItem value="Public Bank">Public Bank</SelectItem>
                        <SelectItem value="RHB">RHB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Account Last 4 digits</Label>
                    <Input placeholder="1234" maxLength={4} value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>PIN</Label>
                    <Input type="password" placeholder="Enter PIN" value={formData.pin} onChange={e => setFormData({ ...formData, pin: e.target.value })} />
                  </div>
                </>
              )}

              {formData.type === 'ewallet' && (
                <>
                  <div className="space-y-2">
                    <Label>E-Wallet</Label>
                    <Select value={formData.name} onValueChange={(val: string) => setFormData({ ...formData, name: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TnG">Touch 'n Go</SelectItem>
                        <SelectItem value="GrabPay">GrabPay</SelectItem>
                        <SelectItem value="Boost">Boost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input placeholder="012-345-6789" value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>PIN</Label>
                    <Input type="password" placeholder="Enter PIN" value={formData.pin} onChange={e => setFormData({ ...formData, pin: e.target.value })} />
                  </div>
                </>
              )}

              {formData.type === 'card' && (
                <>
                  <div className="space-y-2">
                    <Label>Card Type</Label>
                    <Select value={formData.name} onValueChange={(val: string) => setFormData({ ...formData, name: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Visa">Visa</SelectItem>
                        <SelectItem value="Mastercard">Mastercard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Card Last 4 digits</Label>
                    <Input placeholder="1234" maxLength={4} value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>PIN / CVV</Label>
                    <Input type="password" placeholder="Enter PIN or CVV" value={formData.pin} onChange={e => setFormData({ ...formData, pin: e.target.value })} />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button className="text-white hover:opacity-90" style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }} onClick={handleAddPaymentMethod}>
                Add Method
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {paymentMethods.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" /><p className="text-slate-500 mb-4">No payment methods found.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {paymentMethods.map(pm => (
            <Card key={pm.id} className={pm.is_default ? 'border-slate-300 bg-slate-50' : ''}>
              <CardContent className="py-6 flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <div className="p-3 bg-white rounded-lg border border-slate-200"><CreditCard className="w-5 h-5" /></div>
                  <div>
                    <div className="flex gap-2 items-center mb-1">
                      <p>{pm.name}</p>
                      {pm.is_default && <Badge className="text-white bg-purple-600"><Star className="w-3 h-3 mr-1" />Default</Badge>}
                    </div>
                    <p className="text-sm text-slate-600">{pm.type} • {pm.details}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!pm.is_default && <Button variant="outline" size="sm" onClick={() => handleSetDefault(pm.id)}>Set Default</Button>}
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeletePaymentMethod(pm.id)}><Trash2 className="w-4 h-4"/></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
