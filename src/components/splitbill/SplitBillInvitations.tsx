import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Users, Clock, Mail, CheckCircle, XCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import InvitationDetailView from './InvitationDetailView';

interface SplitBillInvitation {
  id: string;
  splitBillId: string;
  orderId: string;
  cafeteria: string;
  initiatorName: string;
  initiatorEmail: string;
  totalAmount: number;
  myShare: number;
  splitMethod: 'evenly' | 'byItems' | 'custom';
  participants: number;
  items: { name: string; quantity: number; price: number }[];
  status: 'pending' | 'accepted' | 'declined';
  sessionStatus: 'active' | 'expired' | 'cancelled' | 'completed';
  invitedAt: string;
  expiresAt: string;
}

const mockInvitations: SplitBillInvitation[] = [
  {
    id: 'INV-001',
    splitBillId: 'SB-001',
    orderId: 'ORD-046',
    cafeteria: 'Cafe Angkasa',
    initiatorName: 'Ahmad bin Ali',
    initiatorEmail: 'ahmad@graduate.utm.my',
    totalAmount: 45.50,
    myShare: 15.17,
    splitMethod: 'evenly',
    participants: 3,
    items: [
      { name: 'Nasi Lemak', quantity: 2, price: 8.50 },
      { name: 'Mee Goreng', quantity: 1, price: 7.00 },
      { name: 'Teh Tarik', quantity: 3, price: 2.50 },
    ],
    status: 'pending',
    sessionStatus: 'active',
    invitedAt: '2 hours ago',
    expiresAt: 'in 4 hours',
  },
  {
    id: 'INV-002',
    splitBillId: 'SB-002',
    orderId: 'ORD-047',
    cafeteria: 'Cafe Siswa',
    initiatorName: 'Siti Nurhaliza',
    initiatorEmail: 'siti@graduate.utm.my',
    totalAmount: 32.00,
    myShare: 16.00,
    splitMethod: 'evenly',
    participants: 2,
    items: [
      { name: 'Chicken Rice', quantity: 2, price: 10.00 },
      { name: 'Ice Lemon Tea', quantity: 2, price: 3.00 },
    ],
    status: 'pending',
    sessionStatus: 'active',
    invitedAt: '30 min ago',
    expiresAt: 'in 5.5 hours',
  },
  {
    id: 'INV-003',
    splitBillId: 'SB-003',
    orderId: 'ORD-048',
    cafeteria: 'Cafe Angkasa',
    initiatorName: 'Lee Wei Ming',
    initiatorEmail: 'lee@graduate.utm.my',
    totalAmount: 28.50,
    myShare: 14.25,
    splitMethod: 'evenly',
    participants: 2,
    items: [
      { name: 'Nasi Goreng', quantity: 2, price: 9.00 },
    ],
    status: 'accepted',
    sessionStatus: 'active',
    invitedAt: '1 day ago',
    expiresAt: 'N/A',
  },
];

interface SplitBillInvitationsProps {
  onNavigateToPayment?: (splitBillId: string) => void;
}

export default function SplitBillInvitations({ onNavigateToPayment }: SplitBillInvitationsProps) {
  const [invitations, setInvitations] = useState<SplitBillInvitation[]>(mockInvitations);
  const [selectedInvitation, setSelectedInvitation] = useState<SplitBillInvitation | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending' && inv.sessionStatus === 'active');
  const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted');
  const declinedInvitations = invitations.filter(inv => inv.status === 'declined');

  const handleViewDetails = (invitation: SplitBillInvitation) => {
    setSelectedInvitation(invitation);
    setShowDetailView(true);
  };

  const handleAcceptInvitation = (invitationId: string) => {
    const invitation = invitations.find(inv => inv.id === invitationId);
    
    if (!invitation) return;

    // EF1: Check if session is still active
    if (invitation.sessionStatus === 'expired' || invitation.sessionStatus === 'cancelled') {
      toast.error('This split bill session is no longer active.', {
        description: 'The session has expired or been cancelled.',
      });
      return;
    }

    // Update invitation status to accepted
    setInvitations(invitations.map(inv =>
      inv.id === invitationId ? { ...inv, status: 'accepted' as const } : inv
    ));

    // UC020 - Normal Flow: Success message
    toast.success('You have successfully joined this split bill.', {
      description: 'You can now proceed to pay your share.',
      duration: 5000,
    });

    setShowDetailView(false);
  };

  const handleDeclineInvitation = (invitationId: string) => {
    // AF1: Customer decline invitation
    setInvitations(invitations.map(inv =>
      inv.id === invitationId ? { ...inv, status: 'declined' as const } : inv
    ));

    toast.info('You have declined this split bill invitation.', {
      description: 'You will not be charged for this order.',
    });

    setShowDetailView(false);
  };

  const handlePayMyShare = (splitBillId: string) => {
    if (onNavigateToPayment) {
      onNavigateToPayment(splitBillId);
    } else {
      toast.info('Redirecting to payment...', {
        description: 'You will be able to pay your share.',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700">Pending</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-700">Accepted</Badge>;
      case 'declined':
        return <Badge className="bg-slate-100 text-slate-700">Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSplitMethodLabel = (method: string) => {
    switch (method) {
      case 'evenly':
        return 'Split Evenly';
      case 'byItems':
        return 'Split by Items';
      case 'custom':
        return 'Custom Split';
      default:
        return method;
    }
  };

  if (showDetailView && selectedInvitation) {
    return (
      <InvitationDetailView
        invitation={selectedInvitation}
        onAccept={handleAcceptInvitation}
        onDecline={handleDeclineInvitation}
        onBack={() => setShowDetailView(false)}
        onPayMyShare={handlePayMyShare}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-slate-900 mb-2">Split Bill Invitations 📬</h1>
        <p className="text-slate-600">Manage your split bill invitations and join group orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-orange-600" />
              <p className="text-slate-900">{pendingInvitations.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-slate-900">{acceptedInvitations.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Declined</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-slate-600" />
              <p className="text-slate-900">{declinedInvitations.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>You have {pendingInvitations.length} pending split bill invitation(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingInvitations.map((invitation) => (
                <Card key={invitation.id} className="border-2 border-orange-200 bg-orange-50/30">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-slate-900">{invitation.orderId}</p>
                          {getStatusBadge(invitation.status)}
                          <Badge variant="outline" className="bg-white">
                            <Users className="w-3 h-3 mr-1" />
                            {invitation.participants} people
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">
                          From: <span className="text-slate-900">{invitation.initiatorName}</span> • {invitation.cafeteria}
                        </p>
                        <p className="text-sm text-slate-500">
                          {getSplitMethodLabel(invitation.splitMethod)} • Total: RM {invitation.totalAmount.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-purple-700">Your Share: RM {invitation.myShare.toFixed(2)}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>Invited {invitation.invitedAt}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleViewDetails(invitation)}
                        >
                          View Details
                        </Button>
                        <Button
                          onClick={() => handleAcceptInvitation(invitation.id)}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accept
                        </Button>
                      </div>
                    </div>

                    {/* Expiration warning */}
                    {invitation.expiresAt !== 'N/A' && (
                      <Alert className="mt-3 border-amber-200 bg-amber-50">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <AlertDescription className="text-amber-800 text-xs">
                          This invitation expires {invitation.expiresAt}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Pending Invitations */}
      {pendingInvitations.length === 0 && (
        <Card className="mb-8">
          <CardContent className="py-12 text-center">
            <Mail className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">No pending invitations</p>
            <p className="text-sm text-slate-400 mt-2">When someone invites you to join a split bill, it will appear here.</p>
          </CardContent>
        </Card>
      )}

      {/* Accepted Invitations */}
      {acceptedInvitations.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Accepted Invitations</CardTitle>
            <CardDescription>Split bills you have joined</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {acceptedInvitations.map((invitation) => (
                <Card key={invitation.id} className="border-green-200 bg-green-50/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm text-slate-900">{invitation.orderId}</p>
                          {getStatusBadge(invitation.status)}
                        </div>
                        <p className="text-sm text-slate-600">
                          {invitation.cafeteria} • Your Share: RM {invitation.myShare.toFixed(2)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handlePayMyShare(invitation.splitBillId)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        Pay My Share
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Declined Invitations */}
      {declinedInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Declined Invitations</CardTitle>
            <CardDescription>Invitations you have declined</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {declinedInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg opacity-75">
                  <div>
                    <p className="text-sm text-slate-900">{invitation.orderId} • {invitation.cafeteria}</p>
                    <p className="text-xs text-slate-500">From: {invitation.initiatorName}</p>
                  </div>
                  {getStatusBadge(invitation.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

