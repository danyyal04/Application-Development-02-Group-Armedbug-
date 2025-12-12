import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { supabase } from "../../lib/supabaseClient";

export default function PendingRegistration() {
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("registration_request")
      .select("*")
      .eq("status", "pending")
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Error loading pending:", error);
    } else {
      setPendingList(data || []);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {loading && (
        <p className="text-center text-slate-500 py-4">Loading pending registrations...</p>
      )}

      {!loading && pendingList.length === 0 && (
        <p className="text-center text-slate-500 py-4">No pending registrations.</p>
      )}

      {pendingList.map((item) => (
        <Card key={item.id} className="border border-slate-300 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {item.business_name}
              <Badge variant="outline" className="border-orange-500 text-orange-600">
                Pending
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2 text-sm">
            <p><strong>Address:</strong> {item.business_address}</p>
            <p><strong>Contact:</strong> {item.contact_number}</p>
            <p><strong>Email:</strong> {item.email}</p>
            <p><strong>Submitted:</strong> {item.submitted_at || "Not recorded"}</p>

            {item.documents && (
              <div className="mt-3">
                <strong>Documents:</strong>
                <ul className="list-disc ml-6 text-slate-700">
                  <li>Owner ID: {item.documents.owner_identification}</li>
                  <li>SSM Certificate: {item.documents.ssm_certificate}</li>
                  <li>Business License: {item.documents.business_license}</li>
                  <li>Logo: {item.documents.business_logo || "No logo uploaded"}</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
