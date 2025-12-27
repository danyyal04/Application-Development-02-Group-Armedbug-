import { useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import {
  Users,
  Plus,
  X,
  UserPlus,
  AlertCircle,
  Check,
  ArrowLeft,
  Clock,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Participant {
  id: string;
  identifier: string; // email only
}

interface SplitBillInitiationProps {
  cartItems: CartItem[];
  totalAmount: number;
  cafeteria?: {
    id?: string;
    name?: string;
    location?: string;
  };
  pickupTime?: string;
  onInitiateSplitBill: (data: {
    splitMethod: 'equal' | 'items';
    participants: Participant[];
    sessionId?: string;
  }) => void;
  onCancel: () => void;
  autoOpenDialog?: boolean;
}

const SERVICE_FEE = 0.5;

const getPickupTimeLabel = (value?: string) => {
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
      return value || 'ASAP';
  }
};

export default function SplitBillInitiation({
  cartItems,
  totalAmount,
  cafeteria,
  pickupTime,
  onInitiateSplitBill,
  onCancel,
  autoOpenDialog = false,
}: SplitBillInitiationProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const splitMethod: 'equal' = 'equal';

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) || totalAmount,
    [cartItems, totalAmount]
  );
  const totalToSplit = useMemo(() => subtotal + SERVICE_FEE, [subtotal]);
  const amountPerPerson = useMemo(
    () => totalToSplit / (participants.length + 1),
    [participants.length, totalToSplit]
  );

  useEffect(() => {
    if (autoOpenDialog) {
      setIsDialogOpen(true);
    }
  }, [autoOpenDialog]);

  const handleAddParticipant = async () => {
    const trimmedParticipant = newParticipant.trim();
    if (!trimmedParticipant) {
      toast.error('Please enter a valid identifier');
      return;
    }

    const normalizedParticipant = trimmedParticipant.toLowerCase();
    if (participants.some(p => p.identifier.toLowerCase() === normalizedParticipant)) {
      toast.error('This participant has already been added');
      return;
    }

    const { data: isRegistered, error: registrationError } = await supabase.rpc(
      'is_registered_email',
      { check_email: trimmedParticipant }
    );
    if (registrationError) {
      toast.error('Unable to verify participant email. Please try again.');
      return;
    }
    if (!isRegistered) {
      toast.error('This email is not registered in UTMmunch.');
      return;
    }

    const participant: Participant = {
      id: `participant-${Date.now()}`,
      identifier: trimmedParticipant,
    };

    setParticipants([...participants, participant]);
    setNewParticipant('');
    toast.success('Participant added successfully');
  };

  const handleRemoveParticipant = (participantId: string) => {
    setParticipants(participants.filter(p => p.id !== participantId));
    toast.success('Participant removed');
  };

  const handleInitiate = async () => {
    if (participants.length === 0) {
      toast.error('Please add at least one participant.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to create a split bill.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create split bill session
      const { data: session, error: sessionError } = await supabase
        .from('split_bill_sessions')
        .insert({
          initiator_user_id: user.id,
          total_amount: totalToSplit,
          // Save items and cafeteria_id to DB (assuming schema update applied)
          items: JSON.stringify(cartItems),
          cafeteria_id: (cafeteria as any)?.id,
          split_method: 'even',
          pickup_time: pickupTime,
        })
        .select('id')
        .single();

      if (sessionError || !session?.id) {
        throw new Error(sessionError?.message || 'Failed to create split bill session');
      }

      // Include the initiator in the split calculation
      const participantCount = participants.length + 1; // +1 for initiator
      const perPerson = participantCount > 0 ? totalToSplit / participantCount : totalToSplit;

      // Insert initiator and added participants
      const initiatorParticipant = {
        session_id: session.id,
        identifier: user.email ?? user.id,
        identifier_type: 'email',
        amount_due: perPerson,
        status: 'accepted',
      };

      const participantRows = participants.map(p => ({
        session_id: session.id,
        identifier: p.identifier,
        identifier_type: 'email',
        amount_due: perPerson,
        status: 'pending',
      }));

      const allParticipants = [initiatorParticipant, ...participantRows];

      const { error: participantsError } = await supabase
        .from('split_bill_participants')
        .insert(allParticipants);

      if (participantsError) {
        throw new Error(participantsError.message);
      }

      toast.success('Split bill created and participants added.');
      onInitiateSplitBill({
        splitMethod: 'equal',
        participants,
        sessionId: session.id,
      });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create split bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={onCancel} className="mb-2 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Menu
        </Button>
        <h1 className="text-slate-900 mb-1">Checkout</h1>
        <p className="text-slate-600">Review your order and start split bill</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-700" />
                Pickup Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-slate-600">
                <span>Cafeteria</span>
                <span className="text-slate-900">{cafeteria?.name || 'Cafe Siswa'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Location</span>
                <span className="text-slate-900 text-right">{cafeteria?.location || 'Kolej Tun Dr. Ismail'}</span>
              </div>
              <div className="flex justify-between text-slate-600 items-center">
                <span>Pickup Time</span>
                <Badge className="bg-purple-600">
                  <Clock className="w-3 h-3 mr-1" />
                  {getPickupTimeLabel(pickupTime)}
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-800">
                  <Clock className="w-4 h-4" />
                  <p className="text-sm font-medium">Estimated Preparation Time</p>
                </div>
                <p className="text-sm text-blue-800 mt-1">Ready in approximately 24 minutes</p>
                <p className="text-xs text-blue-700">Based on current queue and order volume</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>{cartItems.length} items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between py-2">
                  <div>
                    <p className="text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-slate-900">RM {(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Checkout Options</CardTitle>
              <CardDescription>Choose how you want to pay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 rounded-full bg-slate-100 p-1 text-sm">
                <div className="px-3 py-2 text-center text-slate-500">Normal Checkout</div>
                <div className="px-3 py-2 text-center rounded-full bg-white shadow text-purple-700 font-medium flex items-center justify-center gap-2">
                  <Users className="w-4 h-4" />
                  Split Bill
                </div>
              </div>

              <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                <p className="text-purple-900 font-medium">Split the bill with friends!</p>
                <p className="text-sm text-purple-800">
                  Share the cost with your dining companions. Each person pays their portion.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Split Method</Label>
                <div className="p-3 rounded-lg border border-slate-200 text-sm text-slate-700">
                  Split Evenly or Split by Items (select during participant setup)
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
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
                  <span>RM {SERVICE_FEE.toFixed(2)}</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between text-slate-900 font-semibold">
                <span>Total</span>
                <span>RM {totalToSplit.toFixed(2)}</span>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-800 hover:to-pink-800"
                onClick={() => setIsDialogOpen(true)}
              >
                <Users className="w-4 h-4 mr-2" />
                Create Split Bill
              </Button>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  Your payment will be processed securely. Please collect your order at the specified pickup time.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) onCancel();
        }}
      >
        <DialogContent className="sm:max-w-xl lg:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-900">
              <UserPlus className="w-5 h-5" />
              Add Participants
            </DialogTitle>
            <DialogDescription>Choose split method and add participants</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700">Order Summary</p>
                    <p className="text-2xl text-purple-900">RM {totalToSplit.toFixed(2)}</p>
                  </div>
                  <Badge className="bg-purple-600">{cartItems.length} items</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Participants</CardTitle>
                <CardDescription>Add people to split the bill with</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter email (e.g., student@utm.my)"
                    value={newParticipant}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewParticipant(e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddParticipant();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddParticipant}
                    className="bg-purple-700 hover:bg-purple-800"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                {participants.length === 0 && (
                  <Alert className="border-amber-200 bg-amber-50 pl-11">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 text-sm">
                      Please add at least one participant to continue.
                    </AlertDescription>
                  </Alert>
                )}

                {participants.length > 0 && (
                  <div className="space-y-2">
                    <Separator />
                    <Label>Participants ({participants.length})</Label>
                    <div className="space-y-2">
                      {participants.map(participant => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <UserPlus className="w-4 h-4 text-slate-600" />
                            <div className="flex-1">
                              <p className="text-slate-900">{participant.identifier}</p>
                              <p className="text-xs text-slate-500">Email</p>
                            </div>
                            <p className="text-slate-900">RM {amountPerPerson.toFixed(2)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveParticipant(participant.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                onCancel();
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInitiate}
              className="flex-1 bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-800 hover:to-pink-800"
              disabled={isSubmitting}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Creating...' : 'Initiate Split Bill'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
