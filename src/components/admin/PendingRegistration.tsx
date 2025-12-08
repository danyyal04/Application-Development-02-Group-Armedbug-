import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
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
import { Alert, AlertDescription } from "../ui/alert";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Building2,
  Eye,
  AlertCircle,
  Download,
} from "lucide-react";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";

interface PendingRegistration {
  id: string;
  name: string;
  email: string;
  businessName: string;
  businessAddress: string;
  contactNumber: string;
  submittedAt: string;
  documents: {
    ssmCertificate: string;
    businessLicense: string;
    ownerIdentification: string;
  };
}

interface PendingRegistrationsProps {
  onStatsUpdate: (stats: any) => void;
}

export default function PendingRegistrations({
  onStatsUpdate,
}: PendingRegistrationsProps) {
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([
    {
      id: "1",
      name: "Ahmad bin Ibrahim",
      email: "ahmadOwner@gmail.com",
      businessName: "Cafe Angkasa",
      businessAddress: "Block A, Level 2, Faculty of Computing, UTM Skudai",
      contactNumber: "+60123456789",
      submittedAt: "2025-12-07T10:30:00Z",
      documents: {
        ssmCertificate: "ssm-cert-001.pdf",
        businessLicense: "business-license-001.pdf",
        ownerIdentification: "ic-001.pdf",
      },
    },
    {
      id: "2",
      name: "Siti Nurhaliza",
      email: "sitiOwner@gmail.com",
      businessName: "Warung Siti",
      businessAddress: "Block C, Level 1, Kolej Tun Dr. Ismail, UTM Skudai",
      contactNumber: "+60198765432",
      submittedAt: "2025-12-06T14:15:00Z",
      documents: {
        ssmCertificate: "ssm-cert-002.pdf",
        businessLicense: "business-license-002.pdf",
        ownerIdentification: "ic-002.pdf",
      },
    },
    {
      id: "3",
      name: "Lee Wei Ming",
      email: "leeOwner@gmail.com",
      businessName: "Lee's Kitchen",
      businessAddress: "Block B, Level 1, Student Activity Center, UTM Skudai",
      contactNumber: "+60167654321",
      submittedAt: "2025-12-05T09:00:00Z",
      documents: {
        ssmCertificate: "ssm-cert-003.pdf",
        businessLicense: "business-license-003.pdf",
        ownerIdentification: "ic-003.pdf",
      },
    },
  ]);

  const [selectedRegistration, setSelectedRegistration] =
    useState<PendingRegistration | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleViewDetails = (registration: PendingRegistration) => {
    setSelectedRegistration(registration);
    setShowDetailsDialog(true);
  };

  const handleApproveClick = (registration: PendingRegistration) => {
    setSelectedRegistration(registration);
    setShowApproveDialog(true);
  };

  const handleRejectClick = (registration: PendingRegistration) => {
    setSelectedRegistration(registration);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  const handleApprove = () => {
    if (!selectedRegistration) return;

    setProcessing(true);
    // Simulate API call
    setTimeout(() => {
      // Remove from pending list
      const updatedRegistrations = registrations.filter(
        (r) => r.id !== selectedRegistration.id
      );
      setRegistrations(updatedRegistrations);

      // Update stats
      onStatsUpdate({
        pendingRegistrations: updatedRegistrations.length,
        totalUsers: 49,
        activeUsers: 46,
      });

      // UC013 - Notify user of approval (within 48 hours)
      toast.success(
        `Registration approved! ${selectedRegistration.name} has been notified via email.`,
        { duration: 5000 }
      );

      setProcessing(false);
      setShowApproveDialog(false);
      setSelectedRegistration(null);
    }, 1000);
  };

  const handleReject = () => {
    if (!selectedRegistration) return;

    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    setProcessing(true);
    // Simulate API call
    setTimeout(() => {
      // Remove from pending list
      const updatedRegistrations = registrations.filter(
        (r) => r.id !== selectedRegistration.id
      );
      setRegistrations(updatedRegistrations);

      // Update stats
      onStatsUpdate({
        pendingRegistrations: updatedRegistrations.length,
      });

      // UC013 - Notify user of rejection (within 48 hours)
      toast.success(
        `Registration rejected. ${selectedRegistration.name} has been notified with the reason.`,
        { duration: 5000 }
      );

      setProcessing(false);
      setShowRejectDialog(false);
      setSelectedRegistration(null);
      setRejectionReason("");
    }, 1000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

    if (diffHours < 48) {
      return `${diffHours}h ago`;
    }
    return date.toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getUrgencyBadge = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

    // UC013 - EF1: System must review within 48 hours
    if (diffHours >= 40) {
      return (
        <Badge variant="destructive" className="text-xs">
          Urgent - {48 - diffHours}h left
        </Badge>
      );
    } else if (diffHours >= 24) {
      return (
        <Badge
          variant="outline"
          className="text-orange-600 border-orange-200 text-xs"
        >
          Review Soon
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="text-green-600 border-green-200 text-xs"
      >
        Within SLA
      </Badge>
    );
  };

  if (registrations.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <p className="text-slate-600 mb-2">No pending registrations</p>
        <p className="text-sm text-slate-500">
          All cafeteria owner registrations have been reviewed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* UC013 - EF1: Reminder for reviews within 48 hours */}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>SLA Reminder:</strong> All registrations must be reviewed
          within 48 hours of submission.
        </AlertDescription>
      </Alert>

      {registrations.map((registration) => (
        <Card
          key={registration.id}
          className="hover:shadow-md transition-shadow"
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-lg">{registration.name}</CardTitle>
                  {getUrgencyBadge(registration.submittedAt)}
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>{registration.businessName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="w-3 h-3" />
                    <span>
                      Submitted {formatDate(registration.submittedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-slate-500 mt-0.5" />
                <div className="text-sm">
                  <p className="text-slate-500">Email</p>
                  <p className="text-slate-900">{registration.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-slate-500 mt-0.5" />
                <div className="text-sm">
                  <p className="text-slate-500">Contact</p>
                  <p className="text-slate-900">{registration.contactNumber}</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 mb-4">
              <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
              <div className="text-sm">
                <p className="text-slate-500">Business Address</p>
                <p className="text-slate-900">{registration.businessAddress}</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex flex-wrap gap-2 justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewDetails(registration)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Documents
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRejectClick(registration)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApproveClick(registration)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* View Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registration Details</DialogTitle>
            <DialogDescription>
              Review all submitted information and documents
            </DialogDescription>
          </DialogHeader>

          {selectedRegistration && (
            <div className="space-y-6">
              {/* Business Information */}
              <div>
                <h3 className="text-sm text-slate-900 mb-3">
                  Business Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Owner Name</p>
                    <p className="text-slate-900">
                      {selectedRegistration.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Business Name</p>
                    <p className="text-slate-900">
                      {selectedRegistration.businessName}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Email</p>
                    <p className="text-slate-900">
                      {selectedRegistration.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Contact Number</p>
                    <p className="text-slate-900">
                      {selectedRegistration.contactNumber}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">Business Address</p>
                    <p className="text-slate-900">
                      {selectedRegistration.businessAddress}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Documents */}
              <div>
                <h3 className="text-sm text-slate-900 mb-3">
                  Submitted Documents
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-slate-900">
                          SSM Certificate
                        </p>
                        <p className="text-xs text-slate-500">
                          {selectedRegistration.documents.ssmCertificate}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-slate-900">
                          Business License
                        </p>
                        <p className="text-xs text-slate-500">
                          {selectedRegistration.documents.businessLicense}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-slate-900">
                          Owner Identification
                        </p>
                        <p className="text-xs text-slate-500">
                          {selectedRegistration.documents.ownerIdentification}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsDialog(false)}
            >
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

          {selectedRegistration && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  By approving this registration,{" "}
                  <strong>{selectedRegistration.name}</strong> will be able to:
                  <ul className="mt-2 text-sm space-y-1 ml-4">
                    <li>• Access the cafeteria owner dashboard</li>
                    <li>• Manage their menu and orders</li>
                    <li>• Start accepting pre-orders from students</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="text-sm text-slate-600">
                An approval notification will be sent to{" "}
                <strong>{selectedRegistration.email}</strong>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
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

          {selectedRegistration && (
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>{selectedRegistration.name}</strong> will be notified
                  of this rejection and can reapply with corrected information.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Reason for Rejection *</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Please provide a clear reason for rejection (e.g., incomplete documents, invalid business license, etc.)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? "Processing..." : "Reject Registration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
