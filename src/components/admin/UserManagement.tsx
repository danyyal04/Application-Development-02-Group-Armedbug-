import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { toast } from "sonner";
import {
  Search,
  Ban,
  CheckCircle,
  AlertTriangle,
  Mail,
  Calendar,
  Filter,
} from "lucide-react";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { supabase } from "../../lib/supabaseClient";

interface User {
  id: string;
  name: string;
  email: string;
  role: "customer" | "cafeteria_owner";
  accountStatus: "active" | "suspended" | "pending";
  registeredAt: string;
  businessName?: string;
  suspensionReason?: string;
}

interface UserManagementProps {
  onStatsUpdate: (stats: any) => void;
  refreshKey?: number;
}

export default function UserManagement({
  onStatsUpdate,
  refreshKey = 0,
}: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const activeCount = users.filter((u) => u.accountStatus === "active").length;
    const suspendedCount = users.filter(
      (u) => u.accountStatus === "suspended"
    ).length;
    // Avoid infinite loops by not depending on onStatsUpdate identity
    onStatsUpdate?.({
      totalUsers: users.length,
      activeUsers: activeCount,
      suspendedUsers: suspendedCount,
    });
  }, [users, onStatsUpdate]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("registration_request")
        .select(
          "id, user_id, business_name, business_address, contact_number, email, status, submitted_at, rejection_reason"
        )
        .order("submitted_at", { ascending: false });

      if (error) {
        toast.error("Failed to load users: " + error.message);
        setLoading(false);
        return;
      }

      const mapped: User[] =
        data?.map((row: any) => ({
          id: row.user_id || row.id,
          name: row.business_name || "Cafeteria Owner",
          email: row.email || "Not provided",
          role: "cafeteria_owner",
          accountStatus:
            row.status === "approved"
              ? "active"
              : row.status === "rejected"
              ? "suspended"
              : "pending",
          registeredAt: row.submitted_at,
          businessName: row.business_name || undefined,
          suspensionReason: row.rejection_reason || undefined,
        })) || [];

      setUsers(mapped);
      setLoading(false);
    };

    fetchUsers();
  }, [refreshKey]);

  const handleSuspendClick = (user: User) => {
    setSelectedUser(user);
    setSuspensionReason("");
    setShowSuspendDialog(true);
  };

  const handleActivateClick = (user: User) => {
    setSelectedUser(user);
    setShowActivateDialog(true);
  };

  const handleSuspend = async () => {
    if (!selectedUser) return;

    if (!suspensionReason.trim()) {
      toast.error("Please provide a reason for suspension.");
      return;
    }

    setProcessing(true);
    const { error } = await supabase
      .from("registration_request")
      .update({
        status: "rejected",
        rejection_reason: suspensionReason,
        reviewed_at: new Date().toISOString(),
      })
      .eq("user_id", selectedUser.id)
      .select()
      .maybeSingle();

    if (error) {
      toast.error("Failed to suspend user: " + error.message);
      setProcessing(false);
      return;
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id
          ? { ...u, accountStatus: "suspended" as const, suspensionReason }
          : u
      )
    );

    toast.success(
      `Account suspended. ${selectedUser.name} has been notified via email.`,
      { duration: 5000 }
    );

    setProcessing(false);
    setShowSuspendDialog(false);
    setSelectedUser(null);
    setSuspensionReason("");
  };

  const handleActivate = async () => {
    if (!selectedUser) return;

    setProcessing(true);
    const { error } = await supabase
      .from("registration_request")
      .update({
        status: "approved",
        rejection_reason: null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("user_id", selectedUser.id)
      .select()
      .maybeSingle();

    if (error) {
      toast.error("Failed to activate user: " + error.message);
      setProcessing(false);
      return;
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id
          ? {
              ...u,
              accountStatus: "active" as const,
              suspensionReason: undefined,
            }
          : u
      )
    );

    toast.success(
      `Account reactivated. ${selectedUser.name} has been notified via email.`,
      { duration: 5000 }
    );

      setProcessing(false);
    setShowActivateDialog(false);
    setSelectedUser(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getRoleBadge = (role: string) => {
    if (role === "cafeteria_owner") {
      return (
        <Badge variant="outline" className="text-purple-600 border-purple-200">
          Cafeteria Owner
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-blue-600 border-blue-200">
        Customer
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return (
        <Badge variant="outline" className="text-green-600 border-green-200">
          Active
        </Badge>
      );
    }
    if (status === "suspended") {
      return (
        <Badge variant="outline" className="text-red-600 border-red-200">
          Suspended
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-200">
        Pending
      </Badge>
    );
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter((user) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      (user.businessName || "").toLowerCase().includes(q);

    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesStatus =
      filterStatus === "all" || user.accountStatus === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by name, email, or business name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="customer">Customers</SelectItem>
              <SelectItem value="cafeteria_owner">Cafeteria Owners</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12 border border-slate-200 rounded-lg">
          <p className="text-slate-600 mb-2">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 border border-slate-200 rounded-lg">
          <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-2">No users found</p>
          <p className="text-sm text-slate-500">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="text-slate-900">{user.name}</p>
                      {user.businessName && (
                        <p className="text-xs text-slate-500">
                          {user.businessName}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getStatusBadge(user.accountStatus)}
                      {user.suspensionReason && (
                        <p className="text-xs text-slate-500 max-w-xs">
                          {user.suspensionReason}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-4 h-4" />
                      {formatDate(user.registeredAt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.accountStatus === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleSuspendClick(user)}
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleActivateClick(user)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    ) : user.accountStatus === "active" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleSuspendClick(user)}
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleActivateClick(user)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Activate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Suspend User Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User Account</DialogTitle>
            <DialogDescription>
              This action will prevent the user from accessing their account
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>{selectedUser.name}</strong> will be unable to:
                  <ul className="mt-2 text-sm space-y-1 ml-4">
                    {selectedUser.role === "cafeteria_owner" ? (
                      <>
                        <li>• Access the cafeteria owner dashboard</li>
                        <li>• Manage their menu and orders</li>
                        <li>• Receive new orders from customers</li>
                      </>
                    ) : (
                      <>
                        <li>• Browse and order from cafeterias</li>
                        <li>• Access their order history</li>
                        <li>• Use the UTMMunch platform</li>
                      </>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="suspensionReason">
                  Reason for Suspension *
                </Label>
                <Textarea
                  id="suspensionReason"
                  placeholder="Please provide a clear reason for suspension (e.g., policy violations, fraudulent activities, customer complaints, etc.)"
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="text-sm text-slate-600">
                A suspension notification will be sent to{" "}
                <strong>{selectedUser.email}</strong>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSuspendDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={processing}
            >
              {processing ? "Processing..." : "Suspend Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate User Dialog */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate User Account</DialogTitle>
            <DialogDescription>
              Confirm reactivation of this user account
            </DialogDescription>
          </DialogHeader>

        {selectedUser && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  By reactivating this account,{" "}
                  <strong>{selectedUser.name}</strong> will regain full access
                  to the platform.
                </AlertDescription>
              </Alert>

              {selectedUser.suspensionReason && (
                <div className="text-sm">
                  <p className="text-slate-500 mb-1">
                    Previous suspension reason:
                  </p>
                  <p className="text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {selectedUser.suspensionReason}
                  </p>
                </div>
              )}

              <div className="text-sm text-slate-600">
                An activation notification will be sent to{" "}
                <strong>{selectedUser.email}</strong>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowActivateDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleActivate}
              disabled={processing}
            >
              {processing ? "Processing..." : "Reactivate Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
