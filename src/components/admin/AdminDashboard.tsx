import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  LogOut,
} from "lucide-react";
import PendingRegistrations from "./PendingRegistrations";
import UserManagement from "./UserManagement";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  accountStatus?: string;
  businessName?: string;
}

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function AdminDashboard({
  user,
  onLogout,
}: AdminDashboardProps) {
  const [stats, setStats] = useState({
    pendingRegistrations: 3,
    totalUsers: 48,
    activeUsers: 45,
    suspendedUsers: 2,
  });

  const updateStats = (newStats: Partial<typeof stats>) => {
    setStats({ ...stats, ...newStats });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-purple-700" />
                <h1 className="text-slate-900">Admin Dashboard</h1>
              </div>
              <p className="text-slate-600">
                Manage cafeteria owner registrations and user accounts
              </p>
            </div>
            <Button variant="outline" onClick={onLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Pending Approvals</CardDescription>
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-slate-900">
                  {stats.pendingRegistrations}
                </span>
                <Badge
                  variant="outline"
                  className="text-orange-600 border-orange-200"
                >
                  Needs Review
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Users</CardDescription>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-slate-900">{stats.totalUsers}</span>
                <span className="text-xs text-slate-500">registered</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Active Users</CardDescription>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-slate-900">{stats.activeUsers}</span>
                <span className="text-xs text-slate-500">verified</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Suspended</CardDescription>
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-slate-900">{stats.suspendedUsers}</span>
                <span className="text-xs text-slate-500">accounts</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Account Management</CardTitle>
            <CardDescription>
              Review pending registrations and manage user accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending" className="relative">
                  Pending Registrations
                  {stats.pendingRegistrations > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-2 h-5 min-w-5 rounded-full px-1 text-xs"
                    >
                      {stats.pendingRegistrations}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="users">User Management</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-6">
                <PendingRegistrations onStatsUpdate={updateStats} />
              </TabsContent>

              <TabsContent value="users" className="mt-6">
                <UserManagement onStatsUpdate={updateStats} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
