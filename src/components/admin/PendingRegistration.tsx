import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  FileText,
  Phone,
  MapPin,
  Building2,
  Eye,
  Download,
  Mail,
} from "lucide-react";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { supabase } from "../../lib/supabaseClient";

interface PendingRegistration {
  id: string;
  user_id: string;
  business_name: string;
  business_address: string;
  contact_number: string | null;
  email?: string | null;
  submitted_at: string;
  documents: Record<string, string>;
  status: string;
}

interface PendingRegistrationsProps {
  onStatsUpdate: (stats: any) => void;
  onApprovedOrRejected?: () => void;
}

export default function PendingRegistrations({
  onStatsUpdate,
  onApprovedOrRejected,
}: PendingRegistrationsProps) {
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [selectedRegistration, setSelectedRegistration] =
    useState<PendingRegistration | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const fetchPending = async () => {
    const { data, error } = await supabase
      .from("registration_request")
      .select("*")
      .eq("status", "pending")
      .order("submitted_at", { ascending: true });
    if (error) {
      toast.error("Failed to load pending registrations: " + error.message);
      return;
    }
    const safe =
      data?.map((d: any) => ({
        ...d,
        documents: d.documents || {},
      })) || [];
    setRegistrations(safe);
    onStatsUpdate?.({ pendingRegistrations: safe.length });
  };

  useEffect(() => {
    fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDistanceToNow = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatKey = (key: string) =>
    key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  const handleApprove = async () => {
    if (!selectedRegistration) return;
    setProcessing(true);
    // 1) Mark as approved
    const { error: approveError } = await supabase
      .from("registration_request")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", selectedRegistration.id)
      .select()
      .maybeSingle();
    if (approveError) {
      toast.error("Failed to approve: " + approveError.message);
      setProcessing(false);
      return;
    }

    // 2) Create cafeteria listing via RPC (security definer)
    const { error: cafeError } = await supabase.rpc("create_cafeteria_for_owner", {
      registration_id: selectedRegistration.id,
    });
    if (cafeError) {
      toast.error("Approved, but failed to create cafeteria listing: " + cafeError.message);
      setProcessing(false);
      return;
    }

    setRegistrations((prev) =>
      prev.filter((item) => item.id !== selectedRegistration.id)
    );
    onStatsUpdate?.({
      pendingRegistrations: Math.max(0, registrations.length - 1),
    });
    onApprovedOrRejected?.();
    await fetchPending();
    setProcessing(false);
    setShowApproveDialog(false);
    setSelectedRegistration(null);
    toast.success("Registration approved");
  };

  const handleReject = async () => {
    if (!selectedRegistration || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setProcessing(true);
    const { error } = await supabase
      .from("registration_request")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selectedRegistration.id)
      .select()
      .maybeSingle();
    if (error) {
      toast.error("Failed to reject: " + error.message);
      setProcessing(false);
      return;
    }
    setRegistrations((prev) =>
      prev.filter((item) => item.id !== selectedRegistration.id)
    );
    onStatsUpdate?.({
      pendingRegistrations: Math.max(0, registrations.length - 1),
    });
    onApprovedOrRejected?.();
    await fetchPending();
    setProcessing(false);
    setShowRejectDialog(false);
    setSelectedRegistration(null);
    setRejectionReason("");
    toast.success("Registration rejected");
  };

  return (
    <div className="space-y-4">
      {registrations.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-lg p-6 text-center text-slate-500">
          No pending registrations yet.
        </div>
      ) : (
        registrations.map((registration) => (
          <Card
            key={registration.id}
            className="hover:shadow-md transition-shadow border-slate-200"
          >
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-slate-900 text-lg font-semibold">
                  {registration.business_name || "Pending applicant"}
                </h3>
                <Badge variant="destructive" className="bg-red-600 text-white">
                  Pending
                </Badge>
                <span className="text-xs text-slate-500">
                  {formatDistanceToNow(registration.submitted_at)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span>{registration.business_name || "Not provided"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>{registration.business_address || "Not provided"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span>{registration.email || "Applicant email not captured"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span>{registration.contact_number || "Not provided"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Submitted Documents</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(registration.documents).map(([key, url]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <div className="min-w-0">
                          <p className="text-sm text-slate-900">{formatKey(key)}</p>
                          <a 
                            href={String(url)} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline truncate max-w-[140px] block"
                          >
                            View Document
                          </a>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={String(url)} target="_blank" rel="noreferrer">
                           <Download className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                  {Object.keys(registration.documents).length === 0 && (
                    <p className="text-sm text-slate-500">No documents uploaded.</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-amber-700 flex items-center gap-2">
                  <span>Please review and approve/reject.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedRegistration(registration);
                      setShowDetailsDialog(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Documents
                  </Button>
                  <Button
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => {
                      setSelectedRegistration(registration);
                      setShowRejectDialog(true);
                      setRejectionReason("");
                    }}
                    disabled={processing}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      setSelectedRegistration(registration);
                      setShowApproveDialog(true);
                    }}
                    disabled={processing}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Registration Details</DialogTitle>
            <DialogDescription>
              Review the full details and submitted documents for this registration
            </DialogDescription>
          </DialogHeader>

          {selectedRegistration && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">Business Name</p>
                  <p className="text-slate-900">
                    {selectedRegistration.business_name || "Not provided"}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">Contact Number</p>
                  <p className="text-slate-900">
                    {selectedRegistration.contact_number || "Not provided"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm text-slate-500">Business Address</p>
                <p className="text-slate-900">{selectedRegistration.business_address}</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm text-slate-500">Submitted Documents</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(selectedRegistration.documents).map(
                    ([key, url]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-slate-500" />
                          <div className="min-w-0">
                            <p className="text-sm text-slate-900">{formatKey(key)}</p>
                            <a 
                                href={String(url)} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:underline truncate max-w-[140px] block"
                            >
                                View Document
                            </a>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <a href={String(url)} target="_blank" rel="noreferrer">
                                <Download className="w-4 h-4" />
                            </a>
                        </Button>
                      </div>
                    )
                  )}
                  {Object.keys(selectedRegistration.documents).length === 0 && (
                    <p className="text-sm text-slate-500">No documents uploaded.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Registration</DialogTitle>
            <DialogDescription>
              Confirm approval of this cafeteria owner registration
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={processing}
            >
              {processing ? "Processing..." : "Approve Registration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this registration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="rejectionReason">Reason for Rejection *</Label>
            <Textarea
              id="rejectionReason"
              placeholder="Please provide a clear reason for rejection"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              required
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? "Processing..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
