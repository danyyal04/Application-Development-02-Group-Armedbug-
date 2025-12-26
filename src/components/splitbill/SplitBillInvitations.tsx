import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Users, Clock, Mail, CheckCircle, XCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import InvitationDetailView from './InvitationDetailView.js';
import { supabase } from '../../lib/supabaseClient';

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

interface SplitBillInvitationsProps {
  onNavigateToPayment?: (invitation: {
    splitBillId: string;
    totalAmount: number;
    myShare: number;
    cafeteria?: string;
  }) => void;
}

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

export default function SplitBillInvitations({ onNavigateToPayment }: SplitBillInvitationsProps) {
  const [invitations, setInvitations] = useState<SplitBillInvitation[]>([]);
  const [selectedInvitation, setSelectedInvitation] = useState<SplitBillInvitation | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvitations = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const possibleIdentifiers = [
        user?.email?.toLowerCase(),
        user?.user_metadata?.email?.toLowerCase(),
        user?.user_metadata?.username?.toLowerCase(),
      ].filter(Boolean) as string[];

      if (!possibleIdentifiers.length) {
        setInvitations([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('split_bill_participants')
        .select(`
          id, session_id, identifier, identifier_type, status, amount_due, created_at,
          session:split_bill_sessions (
            id, total_amount, split_method, initiator_user_id, created_at, 
            items, cafeteria_id,
            cafeteria:cafeterias (id, name, location)
          )
        `)
        .in('identifier', possibleIdentifiers);

      if (error) {
        toast.error('Failed to load invitations: ' + error.message);
        setLoading(false);
        return;
      }

      const mapped: SplitBillInvitation[] = (data || []).map((row: any) => {
        const session = row.session;
        const cafe = session?.cafeteria; 
        
        // Parse items from session
        let parsedItems = [];
        try {
            if (session?.items && typeof session.items === 'string') {
                parsedItems = JSON.parse(session.items);
            } else if (Array.isArray(session?.items)) {
                parsedItems = session.items;
            }
        } catch (e) {
            console.error("Failed to parse split bill items", e);
        }

        return {
        id: row.id,
        splitBillId: row.session_id,
        orderId: row.session_id,
        cafeteria: cafe?.name || 'Cafeteria',
        // Store full cafeteria object including ID
        _cafeteriaObj: cafe ? { id: cafe.id, name: cafe.name, location: cafe.location } : { name: 'Cafeteria', location: 'Unknown' },
        initiatorName: session?.initiator_user_id || 'Initiator',
        initiatorEmail: session?.initiator_user_id, 
        totalAmount: Number(session?.total_amount) || 0,
        myShare: Number(row.amount_due) || 0,
        splitMethod: 'evenly',
        participants: 0,
        items: parsedItems, // Pass parsed items
        status: row.status || 'pending',
        sessionStatus: 'active',
        invitedAt: row.created_at || '',
        expiresAt: 'N/A',
      }});

      setInvitations(mapped);
      setLoading(false);
    };

    loadInvitations();
  }, []);

  const handlePayMyShare = () => {
    if (selectedInvitation) {
      handleTrackPayment(selectedInvitation);
    }
  };

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending' && inv.sessionStatus === 'active');
  const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted');
  const declinedInvitations = invitations.filter(inv => inv.status === 'declined');
  const ongoingInvitations = invitations.filter(inv => inv.status !== 'declined');

  const handleViewDetails = (invitation: SplitBillInvitation) => {
    setSelectedInvitation(invitation);
    setShowDetailView(true);
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    const invitation = invitations.find(inv => inv.id === invitationId);
    if (!invitation) return;
    try {
      const { error } = await supabase
        .from('split_bill_participants')
        .update({ status: 'accepted' })
        .eq('id', invitationId);
      if (error) throw error;

      setInvitations(invitations.map(inv =>
        inv.id === invitationId ? { ...inv, status: 'accepted' as const } : inv
      ));
      toast.success('You have successfully joined this split bill.', {
        description: 'You can now proceed to pay your share.',
        duration: 5000,
      });
      setShowDetailView(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update invitation.');
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('split_bill_participants')
        .update({ status: 'declined' })
        .eq('id', invitationId);
      if (error) throw error;

      setInvitations(invitations.map(inv =>
        inv.id === invitationId ? { ...inv, status: 'declined' as const } : inv
      ));
      toast.info('You have declined this split bill invitation.', {
        description: 'You will not be charged for this order.',
      });
      setShowDetailView(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to decline invitation.');
    }
  };

  const handleTrackPayment = (invitation: SplitBillInvitation) => {
    if (onNavigateToPayment) {
      onNavigateToPayment({
        splitBillId: invitation.splitBillId,
        totalAmount: invitation.totalAmount,
        myShare: invitation.myShare,
        cafeteria: invitation.cafeteria,
        // @ts-ignore
        _cafeteriaObj: (invitation as any)._cafeteriaObj,
        // @ts-ignore
        items: invitation.items,
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
                          From: <span className="text-slate-900">{invitation.initiatorName}</span>  {invitation.cafeteria}
                        </p>
                        <p className="text-sm text-slate-500">
                          {getSplitMethodLabel(invitation.splitMethod)}  Total: RM {invitation.totalAmount.toFixed(2)}
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

      {/* Ongoing Payments (includes accepted/pending in sessions) */}
      {ongoingInvitations.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Ongoing Payments</CardTitle>
            <CardDescription>Split bills you’re part of</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ongoingInvitations.map((invitation) => (
                <Card key={invitation.id} className="border-green-200 bg-green-50/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm text-slate-900">{invitation.orderId}</p>
                          {getStatusBadge(invitation.status)}
                        </div>
                        <p className="text-sm text-slate-600">
                          {invitation.cafeteria}  Your Share: RM {invitation.myShare.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleTrackPayment(invitation)}>
                          Track Payment
                        </Button>
                      </div>
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
                    <p className="text-sm text-slate-900">{invitation.orderId}  {invitation.cafeteria}</p>
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
