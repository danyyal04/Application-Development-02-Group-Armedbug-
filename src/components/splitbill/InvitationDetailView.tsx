import {
  ArrowLeft,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Alert, AlertDescription } from "../ui/alert";

interface SplitBillInvitation {
  id: string;
  splitBillId: string;
  orderId: string;
  cafeteria: string;
  initiatorName: string;
  initiatorEmail: string;
  totalAmount: number;
  myShare: number;
  splitMethod: "evenly" | "byItems" | "custom";
  participants: number;
  items: { name: string; quantity: number; price: number }[];
  status: "pending" | "accepted" | "declined" | "paid";
  sessionStatus: "active" | "expired" | "cancelled" | "completed";
  invitedAt: string;
  expiresAt: string;
}

interface InvitationDetailViewProps {
  invitation: SplitBillInvitation;
  onAccept: (invitationId: string) => void;
  onDecline: (invitationId: string) => void;
  onBack: () => void;
  onPayMyShare: (splitBillId: string) => void;
}

export default function InvitationDetailView({
  invitation,
  onAccept,
  onDecline,
  onBack,
  onPayMyShare,
}: InvitationDetailViewProps) {
  const getSplitMethodLabel = (method: string) => {
    switch (method) {
      case "evenly":
        return "Split Evenly";
      case "byItems":
        return "Split by Items";
      case "custom":
        return "Custom Split";
      default:
        return method;
    }
  };

  const getSessionStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700">Active</Badge>;
      case "expired":
        return <Badge className="bg-red-100 text-red-700">Expired</Badge>;
      case "cancelled":
        return <Badge className="bg-slate-100 text-slate-700">Cancelled</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-700">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isSessionInactive =
    invitation.sessionStatus === "expired" ||
    invitation.sessionStatus === "cancelled";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Invitations
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-900 mb-2">
              Split Bill Invitation Details
            </h1>
            <p className="text-slate-600">
              Review the order details and decide to accept or decline
            </p>
          </div>
          {getSessionStatusBadge(invitation.sessionStatus)}
        </div>
      </div>

      {/* EF1: Session Expired/Cancelled Alert */}
      {isSessionInactive && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <span>This split bill session is no longer active.</span>
            <p className="text-sm mt-1">
              {invitation.sessionStatus === "expired"
                ? "The session has expired and can no longer be joined."
                : "The order has been cancelled by the initiator."}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Invitation Info */}
      <Card className="mb-6">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {invitation.orderId}
                <Badge variant="outline" className="bg-white">
                  <Users className="w-3 h-3 mr-1" />
                  {invitation.participants} people
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                {invitation.cafeteria}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Total Amount</p>
              <p className="text-purple-700 font-bold">
                RM {invitation.totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Initiated by</span>
              <span className="text-slate-900">{invitation.initiatorName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Email</span>
              <span className="text-slate-900 text-sm">
                {invitation.initiatorEmail}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Split Method</span>
              <Badge variant="outline">
                {getSplitMethodLabel(invitation.splitMethod)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Invited</span>
              <div className="flex items-center gap-1 text-sm text-slate-600">
                <Clock className="w-3 h-3" />
                <span>{invitation.invitedAt}</span>
              </div>
            </div>
            {invitation.expiresAt !== "N/A" && (
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Expires</span>
                <span className="text-sm text-orange-600">
                  {invitation.expiresAt}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
          <CardDescription>
            {invitation.items.length} item(s) in this order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invitation.items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-slate-600">
                  RM {(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Payment Share</CardTitle>
          <CardDescription>
            Amount you need to pay if you accept
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-slate-600">
              <span>Total Order Amount</span>
              <span>RM {invitation.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Number of Participants</span>
              <span>{invitation.participants} people</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-slate-900">Your Share</span>
              <span className="text-purple-700 font-bold">
                RM {invitation.myShare.toFixed(2)}
              </span>
            </div>

            {invitation.splitMethod === "evenly" && (
              <p className="text-xs text-slate-500 bg-blue-50 p-2 rounded">
                The total amount is split equally among all{" "}
                {invitation.participants} participants.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {invitation.status === "pending" && !isSessionInactive && (
          <>
            <Button
              variant="outline"
              onClick={() => onDecline(invitation.id)}
              className="flex-1 border-[#7a0c3b]/20 text-[#7a0c3b] hover:bg-[#7a0c3b]/10"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Decline Invitation
            </Button>
            <Button
              onClick={() => onAccept(invitation.id)}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept Invitation
            </Button>
          </>
        )}

        {invitation.status === "accepted" && (
          <Button
            onClick={() => onPayMyShare(invitation.splitBillId)}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            Proceed to Pay My Share (RM {invitation.myShare.toFixed(2)})
          </Button>
        )}

        {invitation.status === "declined" && (
          <Alert className="border-slate-200 bg-slate-50">
            <AlertCircle className="w-4 h-4 text-slate-600" />
            <AlertDescription className="text-slate-700">
              You have declined this invitation. You will not be charged.
            </AlertDescription>
          </Alert>
        )}

        {isSessionInactive && (
          <Button variant="outline" onClick={onBack} className="w-full">
            Return to Invitations
          </Button>
        )}
      </div>

      {/* Information Alert */}
      {invitation.status === "pending" && !isSessionInactive && (
        <Alert className="mt-6 border-blue-200 bg-blue-50">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            By accepting this invitation, you agree to pay your share of RM{" "}
            {invitation.myShare.toFixed(2)}
            for this group order. You can proceed to payment after accepting.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
