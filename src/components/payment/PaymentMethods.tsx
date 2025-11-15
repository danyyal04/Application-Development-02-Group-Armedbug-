import { useState } from 'react';
import { CreditCard, Plus, Trash2, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog.js';
import { Label } from '../ui/label.js';
import { Input } from '../ui/input.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.js';
import { toast } from 'sonner';

interface PaymentMethod {
  id: string;
  type: 'fpx' | 'ewallet' | 'card';
  name: string;
  details: string;
  isDefault: boolean;
}

const initialPaymentMethods: PaymentMethod[] = [
  {
    id: '1',
    type: 'fpx',
    name: 'Maybank',
    details: '****1234',
    isDefault: true,
  },
  {
    id: '2',
    type: 'ewallet',
    name: 'Touch \'n Go eWallet',
    details: '012-345-6789',
    isDefault: false,
  },
  {
    id: '3',
    type: 'card',
    name: 'Visa',
    details: '****5678',
    isDefault: false,
  },
];

export default function PaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initialPaymentMethods);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'fpx' as 'fpx' | 'ewallet' | 'card',
    name: '',
    details: '',
  });

  const getPaymentIcon = (type: string) => {
    return <CreditCard className="w-5 h-5" />;
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'fpx': return 'FPX Banking';
      case 'ewallet': return 'E-Wallet';
      case 'card': return 'Debit/Credit Card';
      default: return type;
    }
  };

  const handleAddPaymentMethod = () => {
    if (!formData.name || !formData.details) {
      toast.error('Please fill in all fields');
      return;
    }

    // Check for duplicate
    const duplicate = paymentMethods.find(
      pm => pm.type === formData.type && pm.details === formData.details
    );

    if (duplicate) {
      toast.error('This payment method already exists');
      return;
    }

    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: formData.type,
      name: formData.name,
      details: formData.details,
      isDefault: paymentMethods.length === 0,
    };

    setPaymentMethods([...paymentMethods, newMethod]);
    toast.success('Payment method added successfully!');
    setIsAddDialogOpen(false);
    setFormData({ type: 'fpx', name: '', details: '' });
  };

  const handleDeletePaymentMethod = (id: string) => {
    setPaymentMethods(paymentMethods.filter(pm => pm.id !== id));
    toast.success('Payment method removed successfully!');
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods(paymentMethods.map(pm => ({
      ...pm,
      isDefault: pm.id === id,
    })));
    toast.success('Default payment method updated!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 mb-2">Payment Methods 💳</h1>
          <p className="text-slate-600">Manage your payment options</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="text-white hover:opacity-90" style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </DialogTrigger>
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
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
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

              {formData.type === 'fpx' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="bank">Bank Name</Label>
                    <Select
                      value={formData.name}
                      onValueChange={(value: string) => setFormData({ ...formData, name: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Maybank">Maybank</SelectItem>
                        <SelectItem value="CIMB Bank">CIMB Bank</SelectItem>
                        <SelectItem value="Public Bank">Public Bank</SelectItem>
                        <SelectItem value="RHB Bank">RHB Bank</SelectItem>
                        <SelectItem value="Hong Leong Bank">Hong Leong Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account">Account Number (Last 4 digits)</Label>
                    <Input
                      id="account"
                      placeholder="1234"
                      maxLength={4}
                      value={formData.details}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, details: e.target.value })}
                    />
                  </div>
                </>
              )}

              {formData.type === 'ewallet' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="wallet">E-Wallet Provider</Label>
                    <Select
                      value={formData.name}
                      onValueChange={(value: string) => setFormData({ ...formData, name: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Touch 'n Go eWallet">Touch 'n Go eWallet</SelectItem>
                        <SelectItem value="GrabPay">GrabPay</SelectItem>
                        <SelectItem value="Boost">Boost</SelectItem>
                        <SelectItem value="ShopeePay">ShopeePay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="012-345-6789"
                      value={formData.details}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, details: e.target.value })}
                    />
                  </div>
                </>
              )}

              {formData.type === 'card' && (
                <>
                  <div className="space-y-2">
                    <Label>Stripe Test Mode Information</Label>
                    <p className="text-xs text-slate-500 mb-3">Use Stripe's test cards for development</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardType">Card Type</Label>
                    <Select
                      value={formData.name}
                      onValueChange={(value: string) => setFormData({ ...formData, name: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select card type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Visa">Visa (4242 4242 4242 4242)</SelectItem>
                        <SelectItem value="Mastercard">Mastercard (5555 5555 5555 4444)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={formData.details}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, details: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry Date (MM/YY)</Label>
                      <Input
                        id="expiry"
                        placeholder="12/25"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        placeholder="123"
                        maxLength={3}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddPaymentMethod} className="text-white hover:opacity-90" style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}>
                Add Method
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Methods List */}
      {paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 mb-4">No payment methods found.</p>
            <p className="text-sm text-slate-400">Add a payment method to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <Card key={method.id} className={method.isDefault ? 'border-slate-300 bg-slate-50' : ''}>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      {getPaymentIcon(method.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-slate-900">{method.name}</p>
                        {method.isDefault && (
                          <Badge style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }} className="text-white">
                            <Star className="w-3 h-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {getPaymentTypeLabel(method.type)} • {method.type === 'ewallet' ? method.details : `****${method.details}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(method.id)}
                      >
                        Set as Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePaymentMethod(method.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="mt-8 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm text-blue-900">Secure Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-800">
            Your payment information is encrypted and securely stored. We never share your payment details with third parties.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
