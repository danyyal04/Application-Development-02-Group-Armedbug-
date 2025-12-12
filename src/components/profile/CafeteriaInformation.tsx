import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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

import { toast } from "sonner";

interface CafeteriaUser {
  id: string;
  name: string;
  email: string;
  role: string;
  businessName?: string;
  accountStatus?: string;
}

interface CafeteriaDocument {
  name: string;
  uploadDate: string;
  expiryDate: string;
}

interface CafeteriaInformationProps {
  user: CafeteriaUser;
}

export default function CafeteriaInformation({ user }: CafeteriaInformationProps) {
  const [cafeteriaData] = useState({
    businessName: user.businessName || "Your Cafeteria",
    ownerName: user.name,
    email: user.email,
    contactNumber: "012-345-6789",
    businessAddress: "Faculty of Computing, UTM Johor Bahru",
    registrationDate: "2024-11-15",
    approvalStatus: user.accountStatus || "pending",

    documents: {
      ssmCertificate: {
        name: "SSM_Certificate.pdf",
        uploadDate: "2024-11-15",
        expiryDate: "2025-11-15",
      },
      businessLicense: {
        name: "Business_License.pdf",
        uploadDate: "2024-11-15",
        expiryDate: "2025-11-15",
      },
      ownerIdentification: {
        name: "Owner_IC.pdf",
        uploadDate: "2024-11-15",
        expiryDate: "2030-12-31",
      },
    } as Record<string, CafeteriaDocument>,
  });

  const getDocumentStatus = (expiry: string) => {
    const today = new Date();
    const exp = new Date(expiry);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 86400));

    if (diffDays < 0) return "expired";
    if (diffDays <= 30) return "expiring";
    return "valid";
  };

  const renderStatusBadge = (status: string) => {
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

  const handleUploadDocuments = () => {
    toast.info("Document upload feature coming soon.");
  };

  const expiredDocs = Object.values(cafeteriaData.documents).some(
    (doc) => getDocumentStatus(doc.expiryDate) === "expired"
  );

  const expiringDocs = Object.values(cafeteriaData.documents).some(
    (doc) => getDocumentStatus(doc.expiryDate) === "expiring"
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">Cafeteria Information</h1>
          <p className="text-slate-600">Cafeteria details and verification</p>
        </div>
        {renderStatusBadge(cafeteriaData.approvalStatus)}
      </div>

      {expiredDocs && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Some documents have expired. Please upload updated versions.
            <Button variant="link" onClick={handleUploadDocuments}>
              Upload Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!expiredDocs && expiringDocs && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Some documents will expire soon. Prepare updated versions.
          </AlertDescription>
        </Alert>
      )}

      {cafeteriaData.approvalStatus === "rejected" && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Your verification documents were rejected. Please upload valid replacements.
            <Button variant="link" onClick={handleUploadDocuments}>
              Resubmit Documents
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* CAFETERIA DETAILS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-700" />
            Cafeteria Details
          </CardTitle>
          <CardDescription>Cafeteria information on record</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <p><strong>Cafeteria Name:</strong> {cafeteriaData.businessName}</p>
          <p><strong>Owner:</strong> {cafeteriaData.ownerName}</p>

          <div className="flex gap-2 items-start">
            <MapPin className="w-4 h-4 text-slate-400 mt-1" />
            <div>
              <p className="text-sm text-slate-600">Cafeteria Address</p>
              <p className="text-slate-900">{cafeteriaData.businessAddress}</p>
            </div>
          </div>

          <div className="flex gap-2 items-start">
            <Phone className="w-4 h-4 text-slate-400 mt-1" />
            <div>
              <p className="text-sm text-slate-600">Contact Number</p>
              <p className="text-slate-900">{cafeteriaData.contactNumber}</p>
            </div>
          </div>

          <div className="flex gap-2 items-start">
            <Mail className="w-4 h-4 text-slate-400 mt-1" />
            <div>
              <p className="text-sm text-slate-600">Email</p>
              <p className="text-slate-900">{cafeteriaData.email}</p>
            </div>
          </div>

          <div className="flex gap-2 items-start">
            <Calendar className="w-4 h-4 text-slate-400 mt-1" />
            <div>
              <p className="text-sm text-slate-600">Registration Date</p>
              <p className="text-slate-900">
                {new Date(cafeteriaData.registrationDate).toLocaleDateString()}
              </p>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* DOCUMENT SECTION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-700" />
            Verification Documents
          </CardTitle>
          <CardDescription>Your uploaded cafeteria documents</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {Object.entries(cafeteriaData.documents).map(([key, doc]) => {
            const status = getDocumentStatus(doc.expiryDate);

            return (
              <div
                key={key}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
              >
                <div>
                  <p className="text-slate-900 capitalize">
                    {key.replace(/([A-Z])/g, " $1")}
                  </p>
                  <p className="text-sm text-slate-600">{doc.name}</p>
                  <p className="text-xs text-slate-500">
                    Uploaded: {new Date(doc.uploadDate).toLocaleDateString()} | Expires:{" "}
                    {new Date(doc.expiryDate).toLocaleDateString()}
                  </p>
                </div>

                <Badge
                  className={
                    status === "valid"
                      ? "bg-green-100 text-green-800 border-green-300"
                      : status === "expiring"
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-red-100 text-red-800 border-red-300"
                  }
                >
                  {status === "expiring" ? "Expiring Soon" : status}
                </Badge>
              </div>
            );
          })}

          <Button
            onClick={handleUploadDocuments}
            className="w-full bg-gradient-to-r from-purple-700 to-pink-700 text-white hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Updated Documents
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
