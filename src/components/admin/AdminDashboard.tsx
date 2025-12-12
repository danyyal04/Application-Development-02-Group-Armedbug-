import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { AlarmClock, Users, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

export default function AdminDashboard() {
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [suspendedUsers, setSuspendedUsers] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    // Load pending list
    const { data: pendingRows, error: pendingErr } = await supabase
      .from("registration_request")
      .select("*")
      .eq("status", "pending");

    setPendingList(pendingRows || []);
    setPendingCount(pendingRows?.length || 0);

    // Load total users
    const { data: usersData } = await supabase.from("profiles").select("id");
    setTotalUsers(usersData?.length || 0);

    // Active users
    const { data: activeData } = await supabase
      .from("profiles")
      .select("id")
      .eq("status", "active");
    setActiveUsers(activeData?.length || 0);

    // Suspended users
    const { data: suspendedData } = await supabase
      .from("profiles")
      .select("id")
      .eq("status", "suspended");
    setSuspendedUsers(suspendedData?.length || 0);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-purple-600">🛡️</span> Admin Dashboard
        </h1>
        <p className="text-slate-600">
          Manage cafeteria owner registrations and user accounts
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              Pending Approvals <AlarmClock className="w-4 h-4 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingCount}</p>
            <Badge variant="outline" className="mt-2 text-orange-600 border-orange-400">
              Needs Review
            </Badge>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              Total Users <Users className="w-4 h-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalUsers}</p>
            <p className="text-xs text-slate-500">registered</p>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              Active Users <CheckCircle className="w-4 h-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeUsers}</p>
            <p className="text-xs text-slate-500">verified</p>
          </CardContent>
        </Card>

        {/* Suspended */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              Suspended <XCircle className="w-4 h-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{suspendedUsers}</p>
            <p className="text-xs text-slate-500">accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Management */}
      <Card>
        <CardHeader>
          <CardTitle>Account Management</CardTitle>
          <p className="text-slate-600 text-sm">
            Review pending registrations and manage user accounts
          </p>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="pending">Pending Registrations</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
            </TabsList>

            {/* Pending List */}
            <TabsContent value="pending">
              {pendingList.length === 0 ? (
                <div className="text-center text-slate-500 p-6">
                  No pending registrations yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingList.map((owner: any) => (
                    <div
                      key={owner.id}
                      className="border p-4 rounded-md shadow-sm bg-white"
                    >
                      <div className="font-semibold text-lg">{owner.business_name}</div>
                      <div className="text-sm text-slate-600">
                        Address: {owner.business_address}
                      </div>
                      <div className="text-sm">Email: {owner.email}</div>
                      <div className="text-sm">Contact: {owner.contact_number}</div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="users">
              <div className="p-4 text-center text-sm text-slate-500">
                User management page is coming soon.
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
