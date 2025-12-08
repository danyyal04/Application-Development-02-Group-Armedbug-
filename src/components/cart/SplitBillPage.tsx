import { useState, useEffect, type ChangeEvent } from 'react';
import {
  Users,
  CreditCard,
  Check,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  amount: number;
  paid: boolean;
  paymentTime?: string | undefined;
  paymentMethod?: string | undefined;
  paymentStatus: 'pending' | 'paid' | 'failed';
  invitationStatus: 'pending' | 'accepted' | 'rejected';
}

interface SplitBillPageProps {
  splitBillId: string;
  cartItems: CartItem[];
  totalAmount: number;
  cafeteria: {
    name: string;
    location: string;
  };
  pickupTime: string;
  initiatorName: string;
  currentUserEmail?: string;
  onPaymentComplete: (participantId: string) => void;
  onCancel: () => void;
  onCompleteSplitBill?: () => void;
}

export default function SplitBillPage({
  splitBillId,
  cartItems,
  totalAmount,
  cafeteria,
  pickupTime,
  initiatorName,
  currentUserEmail,
  onPaymentComplete,
  onCancel,
  onCompleteSplitBill,
}: SplitBillPageProps) {
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: '1',
      name: initiatorName,
      email: currentUserEmail || 'initiator@utm.my',
      amount: totalAmount / 2,
      paid: false,
      paymentStatus: 'pending',
      invitationStatus: 'accepted',
    },
    {
      id: '2',
      name: 'Ahmad Bin Ali',
      email: 'ahmad@graduate.utm.my',
      amount: totalAmount / 2,
      paid: false,
      paymentStatus: 'pending',
      invitationStatus: 'pending',
    },
  ]);

  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [paymentCredentials, setPaymentCredentials] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const currentParticipant = participants.find(p => p.email === currentUserEmail);
  const paidCount = participants.filter(p => p.paid).length;
  const totalPaid = participants.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
  const unpaidAmount = totalAmount - totalPaid;
  const progressPercentage = (totalPaid / totalAmount) * 100;
  const allPaid = participants.every(p => p.paid);
  const isInitiator = currentUserEmail === participants[0]?.email;

  const mockPaymentMethods = [
    { id: '1', type: 'fpx', name: 'Maybank', details: '****1234' },
    { id: '2', type: 'ewallet', name: "Touch 'n Go eWallet", details: '012-345-6789' },
    { id: '3', type: 'card', name: 'Visa', details: '****5678' },
  ];

  const getPickupTimeLabel = (value: string) => {
    switch (value) {
      case 'asap':
        return 'ASAP';
      case '30min':
        return 'In 30 minutes';
      case '1hour':
        return 'In 1 hour';
      case '1.5hour':
        return 'In 1.5 hours';
      case '2hour':
        return 'In 2 hours';
      default:
        return value;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-amber-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-600">Paid</Badge>;
      case 'failed':
        return <Badge className="bg-red-600">Failed</Badge>;
      default:
        return <Badge className="bg-amber-600">Pending</Badge>;
    }
  };

  const getInvitationBadge = (status: Participant['invitationStatus']) => {
    if (status === 'accepted') return <Badge className="bg-green-100 text-green-700 border border-green-200">Accepted</Badge>;
    if (status === 'rejected') return <Badge className="bg-red-100 text-red-700 border border-red-200">Rejected</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 border border-amber-200">Pending Invite</Badge>;
  };

  const handlePayMyPortion = () => {
    if (!currentParticipant) {
      toast.error('Unable to identify your payment portion');
      return;
    }

    if (currentParticipant.invitationStatus !== 'accepted') {
      toast.error('Please accept the invitation before paying.');
      return;
    }

    if (currentParticipant.paid) {
      toast.info('You have already paid your portion');
      return;
    }

    setShowPaymentDialog(true);
  };

  const handleConfirmPayment = () => {
    if (!paymentCredentials) {
      toast.error('Invalid payment details. Please check and try again.');
      return;
    }

    if (!selectedPaymentId) {
      toast.error('Please select a payment method');
      return;
    }

    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      const isSuccess = Math.random() > 0.1; // 90% success rate

      if (isSuccess) {
        const selectedMethod = mockPaymentMethods.find(m => m.id === selectedPaymentId);
        
        // Update participant payment status
        setParticipants(prev =>
          prev.map(p =>
            p.email === currentUserEmail
              ? {
                  ...p,
                  paid: true,
                  paymentStatus: 'paid',
                  paymentTime: new Date().toLocaleTimeString(),
                  paymentMethod: selectedMethod?.name,
                }
              : p
          )
        );

        toast.success('Payment successful! Thank you for your contribution.');
        setShowPaymentDialog(false);

        if (currentParticipant) {
          onPaymentComplete(currentParticipant.id);
        }
      } else {
        // Simulate payment failure
        setParticipants(prev =>
          prev.map(p =>
            p.email === currentUserEmail
              ? { ...p, paymentStatus: 'failed' }
              : p
          )
        );
        toast.error('Payment failed. Please retry.');
      }

      setIsProcessing(false);
      setPaymentCredentials('');
    }, 2000);
  };

  const handleCoverRemainingAmount = () => {
    if (unpaidAmount <= 0) {
      toast.info('All payments have been completed');
      return;
    }

    setShowCompleteDialog(true);
  };

  const handleCompletePayment = () => {
    setIsProcessing(true);

    // Simulate payment processing for remaining amount
    setTimeout(() => {
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
        // Mark all unpaid participants as paid (covered by initiator)
        setParticipants(prev =>
          prev.map(p => ({
            ...p,
            paid: true,
            paymentStatus: 'paid',
            paymentTime: p.paid ? p.paymentTime : new Date().toLocaleTimeString(),
            paymentMethod: p.paid ? p.paymentMethod : 'Covered by initiator',
            invitationStatus: 'accepted',
          }))
        );

        toast.success('Split bill payment completed successfully! 🎉');
        setShowCompleteDialog(false);

        if (onCompleteSplitBill) {
          setTimeout(() => {
            onCompleteSplitBill();
          }, 1500);
        }
      } else {
        toast.error('Payment failed. Please try again.');
      }

      setIsProcessing(false);
    }, 2000);
  };

  useEffect(() => {
    // Check if all participants have paid
    if (allPaid) {
      setTimeout(() => {
        toast.success('All payments completed. Order is confirmed! 🎉', {
          duration: 5000,
        });
      }, 500);
    }
  }, [allPaid]);

  // Simulate session expiry after 30 minutes (for demo, using shorter time)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!allPaid) {
        setSessionExpired(true);
      }
    }, 1800000); // 30 minutes

    return () => clearTimeout(timer);
  }, [allPaid]);

  // UC020: Exception Flow - Session Expired
  if (sessionExpired) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-slate-900 mb-2">Split Bill Session Expired</h2>
            <p className="text-slate-600 mb-6">
              This split bill session is no longer active. The order may have been cancelled or expired.
            </p>
            <Button onClick={onCancel} variant="outline">
              Return to Order History
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header - UC020 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-6 h-6 text-purple-700" />
          <h1 className="text-slate-900">Split Bill Payment Tracking</h1>
        </div>
        <p className="text-slate-600">Real-time payment status for group order</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* UC020: Payment Progress */}
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700">Payment Progress</p>
                    <p className="text-2xl text-purple-900">
                      RM {totalPaid.toFixed(2)} / RM {totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <Badge className={allPaid ? 'bg-green-600' : 'bg-amber-600'}>
                    {paidCount} / {participants.length} paid
                  </Badge>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                
                {/* UC020: All Paid Confirmation */}
                {allPaid && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      All split bill payments completed. Your order is now confirmed and will be sent to the
                      cafeteria!
                    </AlertDescription>
                  </Alert>
                )}

                {/* UC020: Unpaid Balance Alert */}
                {!allPaid && unpaidAmount > 0 && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      Remaining unpaid balance: RM {unpaidAmount.toFixed(2)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* UC020: Participants Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Status ({participants.length} Participants)</CardTitle>
              <CardDescription>Real-time status for each participant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {participants.map(participant => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      participant.paid ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          participant.paymentStatus === 'paid'
                            ? 'bg-green-100'
                            : participant.paymentStatus === 'failed'
                            ? 'bg-red-100'
                            : 'bg-slate-100'
                        }`}
                      >
                        {getStatusIcon(participant.paymentStatus)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-slate-900">
                            {participant.name}
                            {participant.email === currentUserEmail && (
                              <span className="text-purple-700"> (You)</span>
                            )}
                          </p>
                          {participant.id === '1' && (
                            <Badge variant="secondary" className="text-xs">
                              Initiator
                            </Badge>
                          )}
                          {getInvitationBadge(participant.invitationStatus)}
                        </div>
                        <p className="text-sm text-slate-600">{participant.email}</p>
                        {participant.paymentTime && (
                          <p className="text-xs text-slate-500 mt-1">
                            Paid at {participant.paymentTime} via {participant.paymentMethod}
                          </p>
                        )}
                        {participant.email === currentUserEmail && participant.invitationStatus === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() =>
                                setParticipants(prev =>
                                  prev.map(p =>
                                    p.email === currentUserEmail ? { ...p, invitationStatus: 'accepted' } : p
                                  )
                                )
                              }
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-600"
                              onClick={() =>
                                setParticipants(prev =>
                                  prev.map(p =>
                                    p.email === currentUserEmail ? { ...p, invitationStatus: 'rejected' } : p
                                  )
                                )
                              }
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-900 mb-1">RM {participant.amount.toFixed(2)}</p>
                      {getStatusBadge(participant.paymentStatus)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>{cartItems.length} items in this order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between py-2">
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
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Bill Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pickup Details */}
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-900 mb-2">Pickup Details</p>
                <p className="text-slate-900">{cafeteria.name}</p>
                <p className="text-sm text-slate-600 mb-2">{cafeteria.location}</p>
                <Badge className="bg-purple-600">
                  <Clock className="w-3 h-3 mr-1" />
                  {getPickupTimeLabel(pickupTime)}
                </Badge>
              </div>

              <Separator />

              {/* Payment Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Total Amount</span>
                  <span>RM {totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Paid</span>
                  <span className="text-green-600">RM {totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-900">
                  <span>Unpaid</span>
                  <span className="text-red-600">RM {unpaidAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Your Portion */}
              {currentParticipant && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Your portion</span>
                      <span>RM {currentParticipant.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900">
                      <span>Status</span>
                      {getStatusBadge(currentParticipant.paymentStatus)}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Action Buttons */}
              <div className="space-y-2">
                {/* Pay My Portion Button */}
                {currentParticipant && !currentParticipant.paid && currentParticipant.invitationStatus === 'accepted' && (
                  <Button
                    onClick={handlePayMyPortion}
                    className="w-full bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-800 hover:to-pink-800"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Pay My Portion
                  </Button>
                )}

                {currentParticipant?.paid && (
                  <Button disabled className="w-full bg-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    Payment Complete
                  </Button>
                )}

                {/* UC021: Complete Split Bill Payment */}
                {isInitiator && !allPaid && unpaidAmount > 0 && (
                  <Button
                    onClick={handleCoverRemainingAmount}
                    variant="outline"
                    className="w-full border-purple-600 text-purple-700 hover:bg-purple-50"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Cover Remaining Balance
                  </Button>
                )}

                {allPaid && (
                  <Button variant="outline" onClick={onCancel} className="w-full">
                    Close
                  </Button>
                )}
              </div>

              {/* Info */}
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-800">
                  {allPaid
                    ? 'All participants have paid. The order will be sent to the cafeteria.'
                    : 'Waiting for all participants to complete payment. The initiator can cover the remaining balance.'}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Your Portion</DialogTitle>
            <DialogDescription>Complete payment for your share of the bill</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Amount Summary */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Your portion</span>
                <span className="text-slate-900">RM {currentParticipant?.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Service Fee</span>
                <span className="text-slate-900">RM 0.50</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-slate-900">Total to pay</span>
                <span className="text-slate-900">
                  RM {((currentParticipant?.amount || 0) + 0.5).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2">
              <Label>Select Payment Method</Label>
              <RadioGroup value={selectedPaymentId} onValueChange={setSelectedPaymentId}>
                <div className="space-y-2">
                  {mockPaymentMethods.map(method => (
                    <div
                      key={method.id}
                      className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPaymentId === method.id
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => setSelectedPaymentId(method.id)}
                    >
                      <RadioGroupItem value={method.id} id={method.id} />
                      <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                        <p className="text-slate-900">{method.name}</p>
                        <p className="text-sm text-slate-600">{method.details}</p>
                      </Label>
                      <CreditCard className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Payment Credentials */}
            <div className="space-y-2">
              <Label htmlFor="credentials">
                {mockPaymentMethods.find(m => m.id === selectedPaymentId)?.type === 'fpx'
                  ? 'Banking Username/PIN'
                  : mockPaymentMethods.find(m => m.id === selectedPaymentId)?.type === 'ewallet'
                  ? 'E-Wallet PIN'
                  : 'Card CVV'}
              </Label>
              <Input
                id="credentials"
                type="password"
                placeholder="Enter credentials"
                value={paymentCredentials}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPaymentCredentials(e.target.value)}
              />
            </div>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800">
                Demo mode: Enter any credentials to simulate payment
              </AlertDescription>
            </Alert>
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
              disabled={isProcessing || !selectedPaymentId}
              className="flex-1 bg-gradient-to-r from-purple-700 to-pink-700"
            >
              {isProcessing ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* UC021: Complete Split Bill Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Split Bill Payment</DialogTitle>
            <DialogDescription>
              Cover the remaining unpaid balance to complete the order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Unpaid Participants */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900 mb-2">Unpaid Participants:</p>
              <div className="space-y-1">
                {participants
                  .filter(p => !p.paid)
                  .map(p => (
                    <div key={p.id} className="flex justify-between text-sm">
                      <span className="text-red-800">{p.name}</span>
                      <span className="text-red-800">RM {p.amount.toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Amount Summary */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Remaining unpaid amount</span>
                <span className="text-slate-900">RM {unpaidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Service Fee</span>
                <span className="text-slate-900">RM 0.50</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-slate-900">Total to pay</span>
                <span className="text-slate-900">RM {(unpaidAmount + 0.5).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2">
              <Label>Select Payment Method</Label>
              <RadioGroup value={selectedPaymentId} onValueChange={setSelectedPaymentId}>
                <div className="space-y-2">
                  {mockPaymentMethods.map(method => (
                    <div
                      key={method.id}
                      className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPaymentId === method.id
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => setSelectedPaymentId(method.id)}
                    >
                      <RadioGroupItem value={method.id} id={method.id} />
                      <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                        <p className="text-slate-900">{method.name}</p>
                        <p className="text-sm text-slate-600">{method.details}</p>
                      </Label>
                      <CreditCard className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-800">
                By covering the remaining balance, you agree to pay for the unpaid portions. The order
                will be confirmed and sent to the cafeteria.
              </AlertDescription>
            </Alert>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompletePayment}
              disabled={isProcessing || !selectedPaymentId}
              className="flex-1 bg-gradient-to-r from-purple-700 to-pink-700"
            >
              {isProcessing ? 'Processing...' : 'Complete Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
