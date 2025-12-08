import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Users, Plus, X, Link as LinkIcon, UserPlus, AlertCircle, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Participant {
  id: string;
  identifier: string; // username, student ID, or email
  type: 'username' | 'studentid' | 'email';
}

interface SplitBillInitiationProps {
  cartItems: CartItem[];
  totalAmount: number;
  onInitiateSplitBill: (data: {
    splitMethod: 'equal' | 'items' | 'custom';
    participants: Participant[];
    customAmounts?: { [participantId: string]: number };
  }) => void;
  onCancel: () => void;
}

export default function SplitBillInitiation({
  cartItems,
  totalAmount,
  onInitiateSplitBill,
  onCancel,
}: SplitBillInitiationProps) {
  const [splitMethod, setSplitMethod] = useState<'equal' | 'items' | 'custom'>('equal');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [participantType, setParticipantType] = useState<'username' | 'studentid' | 'email'>('username');
  const [customAmounts, setCustomAmounts] = useState<{ [participantId: string]: number }>({});

  const handleAddParticipant = () => {
    if (!newParticipant.trim()) {
      toast.error('Please enter a valid identifier');
      return;
    }

    // Check for duplicates
    if (participants.some(p => p.identifier === newParticipant.trim())) {
      toast.error('This participant has already been added');
      return;
    }

    const participant: Participant = {
      id: `participant-${Date.now()}`,
      identifier: newParticipant.trim(),
      type: participantType,
    };

    setParticipants([...participants, participant]);
    
    // Initialize custom amount if custom split is selected
    if (splitMethod === 'custom') {
      setCustomAmounts({
        ...customAmounts,
        [participant.id]: 0,
      });
    }
    
    setNewParticipant('');
    toast.success('Participant added successfully');
  };

  const handleRemoveParticipant = (participantId: string) => {
    setParticipants(participants.filter(p => p.id !== participantId));
    
    // Remove custom amount if exists
    if (customAmounts[participantId]) {
      const newCustomAmounts = { ...customAmounts };
      delete newCustomAmounts[participantId];
      setCustomAmounts(newCustomAmounts);
    }
    
    toast.success('Participant removed');
  };

  const handleCustomAmountChange = (participantId: string, amount: number) => {
    setCustomAmounts({
      ...customAmounts,
      [participantId]: amount,
    });
  };

  const calculateSplitAmounts = () => {
    if (splitMethod === 'equal') {
      const amountPerPerson = totalAmount / (participants.length + 1); // +1 for initiator
      return participants.map(p => ({
        participantId: p.id,
        amount: amountPerPerson,
      }));
    }
    
    if (splitMethod === 'custom') {
      return participants.map(p => ({
        participantId: p.id,
        amount: customAmounts[p.id] || 0,
      }));
    }
    
    // For items split, divide equally as default (can be enhanced later)
    const amountPerPerson = totalAmount / (participants.length + 1);
    return participants.map(p => ({
      participantId: p.id,
      amount: amountPerPerson,
    }));
  };

  const handleInitiate = () => {
    // Validation
    if (participants.length === 0) {
      toast.error('Please add at least one participant to continue');
      return;
    }

    if (splitMethod === 'custom') {
      const totalAssigned = Object.values(customAmounts).reduce((sum, amt) => sum + amt, 0);
      if (Math.abs(totalAssigned - totalAmount) > 0.01) {
        toast.error('Custom amounts must sum up to the total amount');
        return;
      }
    }

    if (splitMethod === 'custom') {
      onInitiateSplitBill({
        splitMethod,
        participants,
        customAmounts,
      });
      return;
    }

    onInitiateSplitBill({
      splitMethod,
      participants,
    });
  };

  const amountPerPerson = totalAmount / (participants.length + 1);
  const totalCustomAmount = Object.values(customAmounts).reduce((sum, amt) => sum + amt, 0);
  const remainingAmount = totalAmount - totalCustomAmount;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-6 h-6 text-purple-700" />
          <h1 className="text-slate-900">Initiate Split Bill</h1>
        </div>
        <p className="text-slate-600">Set up payment splitting for your group order</p>
      </div>

      <div className="space-y-6">
        {/* Order Summary Card */}
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-purple-900">Order Summary</CardTitle>
            <CardDescription>Total amount to be split</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700">Total Amount</p>
                <p className="text-2xl text-purple-900">RM {totalAmount.toFixed(2)}</p>
              </div>
              <Badge className="bg-purple-600">{cartItems.length} items</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Split Method Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Split Method</CardTitle>
            <CardDescription>Choose how to divide the payment</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={splitMethod}
              onValueChange={(value: 'equal' | 'items' | 'custom') => setSplitMethod(value)}
            >
              <div className="space-y-3">
                {/* Equal Split */}
                <div
                  className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    splitMethod === 'equal'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSplitMethod('equal')}
                >
                  <RadioGroupItem value="equal" id="equal" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="equal" className="cursor-pointer">
                      <p className="text-slate-900 mb-1">Split Evenly</p>
                      <p className="text-sm text-slate-600">
                        Divide the total amount equally among all participants
                      </p>
                      {participants.length > 0 && (
                        <p className="text-sm text-purple-700 mt-2">
                          RM {amountPerPerson.toFixed(2)} per person ({participants.length + 1} people)
                        </p>
                      )}
                    </Label>
                  </div>
                </div>

                {/* Item-based Split */}
                <div
                  className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    splitMethod === 'items'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSplitMethod('items')}
                >
                  <RadioGroupItem value="items" id="items" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="items" className="cursor-pointer">
                      <p className="text-slate-900 mb-1">Split by Items</p>
                      <p className="text-sm text-slate-600">
                        Each participant pays for specific items they ordered
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">Coming Soon</Badge>
                    </Label>
                  </div>
                </div>

                {/* Custom Split */}
                <div
                  className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    splitMethod === 'custom'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSplitMethod('custom')}
                >
                  <RadioGroupItem value="custom" id="custom" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="custom" className="cursor-pointer">
                      <p className="text-slate-900 mb-1">Custom Amount</p>
                      <p className="text-sm text-slate-600">
                        Manually specify the amount each participant should pay
                      </p>
                    </Label>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Add Participants */}
        <Card>
          <CardHeader>
            <CardTitle>Add Participants</CardTitle>
            <CardDescription>Add people to split the bill with</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Participant Form */}
            <div className="space-y-3">
              <div>
                <Label className="mb-2 block">Participant Identifier Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={participantType === 'username' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setParticipantType('username')}
                    className={participantType === 'username' ? 'bg-purple-700' : ''}
                  >
                    Username
                  </Button>
                  <Button
                    type="button"
                    variant={participantType === 'studentid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setParticipantType('studentid')}
                    className={participantType === 'studentid' ? 'bg-purple-700' : ''}
                  >
                    Student ID
                  </Button>
                  <Button
                    type="button"
                    variant={participantType === 'email' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setParticipantType('email')}
                    className={participantType === 'email' ? 'bg-purple-700' : ''}
                  >
                    Email
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder={
                    participantType === 'username'
                      ? 'Enter username (e.g., john_doe)'
                      : participantType === 'studentid'
                      ? 'Enter student ID (e.g., A20EC0123)'
                      : 'Enter email (e.g., student@utm.my)'
                  }
                  value={newParticipant}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewParticipant(e.target.value)}
                  onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
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
            </div>

            {/* Participants List */}
            {participants.length > 0 ? (
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
                          <p className="text-xs text-slate-500">
                            {participant.type === 'username'
                              ? 'Username'
                              : participant.type === 'studentid'
                              ? 'Student ID'
                              : 'Email'}
                          </p>
                        </div>
                        
                        {/* Custom Amount Input */}
                        {splitMethod === 'custom' && (
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-slate-600">RM</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-24"
                              value={customAmounts[participant.id] || 0}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                handleCustomAmountChange(participant.id, parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                        )}
                        
                        {/* Equal Split Amount Display */}
                        {splitMethod === 'equal' && (
                          <p className="text-slate-900">RM {amountPerPerson.toFixed(2)}</p>
                        )}
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

                {/* Custom Split Summary */}
                {splitMethod === 'custom' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-blue-900">Total Assigned:</span>
                      <span className="text-blue-900">RM {totalCustomAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-900">Remaining:</span>
                      <span
                        className={
                          Math.abs(remainingAmount) < 0.01
                            ? 'text-green-700'
                            : 'text-red-700'
                        }
                      >
                        RM {remainingAmount.toFixed(2)}
                      </span>
                    </div>
                    {Math.abs(remainingAmount) > 0.01 && (
                      <p className="text-xs text-amber-700 mt-2">
                        ⚠ Amounts must sum to RM {totalAmount.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <p className="text-sm text-amber-800">
                  No participants added yet. Add at least one participant to continue.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <LinkIcon className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 mb-1">Share with participants</p>
                <p className="text-xs text-blue-800">
                  After initiating the split bill, you'll receive a unique link to share with all
                  participants. They can use this link to view their portion and make payment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleInitiate}
            disabled={participants.length === 0 || (splitMethod === 'custom' && Math.abs(remainingAmount) > 0.01)}
            className="flex-1 bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-800 hover:to-pink-800"
          >
            <Check className="w-4 h-4 mr-2" />
            Initiate Split Bill
          </Button>
        </div>
      </div>
    </div>
  );
}
