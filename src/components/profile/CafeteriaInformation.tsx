import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Upload,
  Calendar,
} from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";

interface CafeteriaInformationProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    businessName?: string;
    accountStatus?: string;
  };
}

export default function CafeteriaInformation({
  user,
}: CafeteriaInformationProps) {
  // Mock data - would come from database in real application
  const [cafeteriaData] = useState({
    businessName: user.businessName || "Cafe Angkasa",
    ownerName: user.name,
    email: user.email,
    contactNumber: "012-345-6789",
    businessAddress: "Faculty of Computing, UTM Johor Bahru",
    registrationDate: "2024-11-15",
    approvalStatus: user.accountStatus || "approved", // approved, pending, rejected
    ssmNumber: "SSM-1234567890",
    businessLicenseNumber: "BL-2024-UTM-001",
    documents: {
      ssmCertificate: {
        name: "SSM_Certificate_CafeAngkasa.pdf",
        uploadDate: "2024-11-15",
        status: "valid",
        expiryDate: "2025-11-15",
      },
      businessLicense: {
        name: "Business_License_CafeAngkasa.pdf",
        uploadDate: "2024-11-15",
        status: "valid",
        expiryDate: "2025-11-15",
      },
      ownerIdentification: {
        name: "Owner_IC_Ahmad.pdf",
        uploadDate: "2024-11-15",
        status: "valid",
        expiryDate: "2030-12-31",
      },
    },
  });

  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // UC015 - Get approval status details
  const getApprovalStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  // UC015 - Check document status
  const checkDocumentExpiry = (
    expiryDate: string
  ): "valid" | "expiring-soon" | "expired" => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 3600 * 24)
    );

    if (daysUntilExpiry < 0) return "expired";
    if (daysUntilExpiry <= 30) return "expiring-soon";
    return "valid";
  };

  const handleUpdateDocuments = () => {
    setShowUploadDialog(true);
    toast.info("Document upload feature will be available soon");
  };

  // UC015 - AF1: Missing or Expired Business Documents
  const hasExpiredDocuments = Object.values(cafeteriaData.documents).some(
    (doc) => checkDocumentExpiry(doc.expiryDate) === "expired"
  );

  const hasExpiringSoonDocuments = Object.values(cafeteriaData.documents).some(
    (doc) => checkDocumentExpiry(doc.expiryDate) === "expiring-soon"
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-900 mb-2">Cafeteria Information</h1>
            <p className="text-slate-600">
              View and manage your business profile and verification documents
            </p>
          </div>
          {getApprovalStatusBadge(cafeteriaData.approvalStatus)}
        </div>
      </div>

      {/* UC015 - AF1: Alert for Expired Documents */}
      {hasExpiredDocuments && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Your documents are incomplete or expired. Please update your
            documents.
            <Button
              variant="link"
              className="text-red-600 hover:text-red-800 p-0 ml-2"
              onClick={handleUpdateDocuments}
            >
              Upload Updated Documents
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* UC015 - Alert for Expiring Soon Documents */}
      {hasExpiringSoonDocuments && !hasExpiredDocuments && (
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Some of your documents will expire soon. Please prepare updated
            documents.
          </AlertDescription>
        </Alert>
      )}

      {/* UC015 - AF2: Documents Rejected */}
      {cafeteriaData.approvalStatus === "rejected" && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            The verification documents were rejected. Please resubmit valid
            business documents.
            <Button
              variant="link"
              className="text-red-600 hover:text-red-800 p-0 ml-2"
              onClick={handleUpdateDocuments}
            >
              Resubmit Documents
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* UC015 - Pending Review Message */}
      {cafeteriaData.approvalStatus === "pending" && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Your registration is currently under review. You will be notified of
            the approval result within 48 hours.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-700" />
              Business Details
            </CardTitle>
            <CardDescription>
              Basic information about your cafeteria
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-600">Business Name</p>
              <p className="text-slate-900">{cafeteriaData.businessName}</p>
            </div>

            <div>
              <p className="text-sm text-slate-600">Owner Name</p>
              <p className="text-slate-900">{cafeteriaData.ownerName}</p>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <p className="text-sm text-slate-600">Business Address</p>
                <p className="text-slate-900">
                  {cafeteriaData.businessAddress}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <p className="text-sm text-slate-600">Contact Number</p>
                <p className="text-slate-900">{cafeteriaData.contactNumber}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <p className="text-sm text-slate-600">Email</p>
                <p className="text-slate-900">{cafeteriaData.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-slate-400 mt-1" />
              <div>
                <p className="text-sm text-slate-600">Registration Date</p>
                <p className="text-slate-900">
                  {new Date(
                    cafeteriaData.registrationDate
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-700" />
              Registration Information
            </CardTitle>
            <CardDescription>Business registration details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-600">Account Approval Status</p>
              <p className="text-slate-900 capitalize">
                {cafeteriaData.approvalStatus === "pending"
                  ? "Pending Review"
                  : cafeteriaData.approvalStatus}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-600">SSM Registration Number</p>
              <p className="text-slate-900">{cafeteriaData.ssmNumber}</p>
            </div>

            <div>
              <p className="text-sm text-slate-600">Business License Number</p>
              <p className="text-slate-900">
                {cafeteriaData.businessLicenseNumber}
              </p>
            </div>

            <Button
              onClick={handleUpdateDocuments}
              variant="outline"
              className="w-full mt-4"
            >
              <Upload className="w-4 h-4 mr-2" />
              Update Business Information
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Business Verification Documents */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-700" />
            Business Verification Documents
          </CardTitle>
          <CardDescription>
            View and manage your uploaded business documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* SSM Certificate */}
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-slate-900">SSM Certificate</p>
                  <p className="text-sm text-slate-600">
                    {cafeteriaData.documents.ssmCertificate.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Uploaded:{" "}
                    {new Date(
                      cafeteriaData.documents.ssmCertificate.uploadDate
                    ).toLocaleDateString()}{" "}
                    | Expires:{" "}
                    {new Date(
                      cafeteriaData.documents.ssmCertificate.expiryDate
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {checkDocumentExpiry(
                  cafeteriaData.documents.ssmCertificate.expiryDate
                ) === "valid" && (
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    Valid
                  </Badge>
                )}
                {checkDocumentExpiry(
                  cafeteriaData.documents.ssmCertificate.expiryDate
                ) === "expiring-soon" && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                    Expiring Soon
                  </Badge>
                )}
                {checkDocumentExpiry(
                  cafeteriaData.documents.ssmCertificate.expiryDate
                ) === "expired" && (
                  <Badge className="bg-red-100 text-red-800 border-red-300">
                    Expired
                  </Badge>
                )}
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            </div>

            {/* Business License */}
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-slate-900">Business License</p>
                  <p className="text-sm text-slate-600">
                    {cafeteriaData.documents.businessLicense.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Uploaded:{" "}
                    {new Date(
                      cafeteriaData.documents.businessLicense.uploadDate
                    ).toLocaleDateString()}{" "}
                    | Expires:{" "}
                    {new Date(
                      cafeteriaData.documents.businessLicense.expiryDate
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {checkDocumentExpiry(
                  cafeteriaData.documents.businessLicense.expiryDate
                ) === "valid" && (
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    Valid
                  </Badge>
                )}
                {checkDocumentExpiry(
                  cafeteriaData.documents.businessLicense.expiryDate
                ) === "expiring-soon" && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                    Expiring Soon
                  </Badge>
                )}
                {checkDocumentExpiry(
                  cafeteriaData.documents.businessLicense.expiryDate
                ) === "expired" && (
                  <Badge className="bg-red-100 text-red-800 border-red-300">
                    Expired
                  </Badge>
                )}
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            </div>

            {/* Owner Identification */}
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-slate-900">Owner Identification</p>
                  <p className="text-sm text-slate-600">
                    {cafeteriaData.documents.ownerIdentification.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Uploaded:{" "}
                    {new Date(
                      cafeteriaData.documents.ownerIdentification.uploadDate
                    ).toLocaleDateString()}{" "}
                    | Expires:{" "}
                    {new Date(
                      cafeteriaData.documents.ownerIdentification.expiryDate
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {checkDocumentExpiry(
                  cafeteriaData.documents.ownerIdentification.expiryDate
                ) === "valid" && (
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    Valid
                  </Badge>
                )}
                {checkDocumentExpiry(
                  cafeteriaData.documents.ownerIdentification.expiryDate
                ) === "expiring-soon" && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                    Expiring Soon
                  </Badge>
                )}
                {checkDocumentExpiry(
                  cafeteriaData.documents.ownerIdentification.expiryDate
                ) === "expired" && (
                  <Badge className="bg-red-100 text-red-800 border-red-300">
                    Expired
                  </Badge>
                )}
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            </div>

            <Button
              onClick={handleUpdateDocuments}
              className="w-full bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-800 hover:to-pink-800"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Updated Documents
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
