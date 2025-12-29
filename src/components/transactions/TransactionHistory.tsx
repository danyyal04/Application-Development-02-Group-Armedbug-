import { useState, useEffect } from "react";
import {
  Receipt,
  Eye,
  CreditCard,
  Clock,
  Calendar,
  Filter,
  X,
  AlertCircle,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { toast } from "sonner";
import DigitalReceipt from "./DigitalReceipt";
import { supabase } from "../../lib/supabaseClient";

interface Transaction {
  id: string;
  transactionId: string;
  orderId: string;
  cafeteriaName: string;
  cafeteriaLocation: string;
  date: string;
  time: string;
  queueNumber: string; // Not in DB yet, will mock or derive
  items: { name: string; quantity: number; price: number; subtotal: number }[];
  subtotal: number;
  tax: number;
  serviceFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: "Completed" | "Pending" | "Failed" | "Split Bill In Progress";
  customerName: string;
  customerEmail: string;
  isSplitBill?: boolean;
  splitBillParticipants?: number;
  splitBillPaid?: number;
}

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(
    null
  );

  // UC032 - NF: Filter state management
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Orders
      console.log("Fetching orders for user:", user.id);
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      console.log("Orders data:", ordersData);
      console.log("Orders error:", ordersError);

      if (ordersError) throw ordersError;

      // Fetch all cafeterias to map names manually (avoids FK dependency issues)
      const { data: cafeteriasData } = await supabase
        .from("cafeterias")
        .select("id, name, location");

      const cafeteriasMap = (cafeteriasData || []).reduce(
        (acc: any, cafe: any) => {
          acc[cafe.id] = cafe;
          return acc;
        },
        {}
      );

      if (ordersError) throw ordersError;

      // 2. Fetch Active Split Bills (where I am initiator)
      // Note: fetching sessions where I am initiator.
      // If I am a participant, I should probably also see it?
      // For now, simpler to just show what I initiated or if I am in 'split_bill_participants'.
      // Let's stick to initiator for "My Transactions" view as simplified scope,
      // or join with participants if we want comprehensive.
      // Given the requirement, let's just check sessions I initiated for now.
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("split_bill_sessions")
        .select("*")
        .eq("initiator_user_id", user.id)
        .eq("status", "active"); // Only show active ones here, completed ones become orders?

      // Actually, completed split bills usually result in an order being created for the total
      // by the initiator (based on SplitBillPage logic).
      // So we only need to fetch 'active' sessions to show "Split Bill In Progress".

      if (sessionsError) {
        console.error("Error fetching sessions", sessionsError);
        // Don't fail entire view if split bills fail
      }

      const mappedOrders: Transaction[] = (ordersData || []).map(
        (order: any) => {
          let items = [];
          try {
            items =
              typeof order.items === "string"
                ? JSON.parse(order.items)
                : order.items;
          } catch (e) {
            items = [];
          }

          return {
            id: order.id,
            transactionId: `TXN-${order.id.slice(0, 8).toUpperCase()}`,
            orderId: `ORD-${order.id.slice(-6).toUpperCase()}`,
            cafeteriaName:
              cafeteriasMap[order.cafeteria_id]?.name || "Unknown Cafeteria",
            cafeteriaLocation:
              cafeteriasMap[order.cafeteria_id]?.location || "Unknown Location",
            date: new Date(order.created_at || new Date())
              .toISOString()
              .split("T")[0] as string,
            time: new Date(order.created_at || new Date()).toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            ),
            queueNumber: order.queue_number || "A00",
            items: items.map((i: any) => ({
              name: i.name,
              quantity: i.quantity,
              price: i.price,
              subtotal: i.price * i.quantity,
            })),
            subtotal:
              order.subtotal ||
              order.total_amount - (order.service_fee || 0) - (order.tax || 0),
            tax: order.tax || 0,
            serviceFee: order.service_fee || 0,
            total: order.total_amount,
            paymentMethod: order.payment_method || "Unknown",
            paymentStatus:
              order.status === "Pending"
                ? "Pending"
                : order.status === "Paid" || order.status === "Completed"
                ? "Completed"
                : "Failed",
            // Database might use 'Paid', component uses 'Completed'
            customerName: user.user_metadata?.full_name || user.email || "Me",
            customerEmail: user.email || "",
          };
        }
      );

      const mappedSessions: Transaction[] = (sessionsData || []).map(
        (session: any) => ({
          id: session.id,
          transactionId: `SB-${session.id.slice(0, 8).toUpperCase()}`,
          orderId: "PENDING",
          cafeteriaName: "Split Bill Group", // We might not have cafe name in session easily without join, or parse from somewhere
          cafeteriaLocation: "-",
          date: new Date(session.created_at || new Date())
            .toISOString()
            .split("T")[0],
          time: new Date(session.created_at || new Date()).toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
          queueNumber: "-",
          items: [], // We might not have items in session record easily
          subtotal: session.total_amount,
          tax: 0,
          serviceFee: 0,
          total: session.total_amount,
          paymentMethod: "Split Bill",
          paymentStatus: "Split Bill In Progress",
          customerName: user.user_metadata?.full_name || "Me",
          customerEmail: user.email || "",
          isSplitBill: true,
          splitBillParticipants: 0, // Would need another query to count
          splitBillPaid: 0,
        })
      );

      console.log("Mapped transactions:", [...mappedSessions, ...mappedOrders]);
      setTransactions([...mappedSessions, ...mappedOrders]);
    } catch (error) {
      console.error("Error loading transactions:", error);
      toast.error("Failed to load transaction history");
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = (transaction: Transaction) => {
    // UC031 - EF1: Prevent viewing receipt for non-completed payments
    if (transaction.paymentStatus !== "Completed") {
      if (transaction.paymentStatus === "Failed") {
        toast.error("Receipt not available. Payment failed.");
      } else if (transaction.paymentStatus === "Pending") {
        toast.info(
          "Receipt not available yet. Payment is still pending confirmation."
        );
      } else if (transaction.paymentStatus === "Split Bill In Progress") {
        // UC031 - AF1: Split Bill - No receipt until all participants complete payment
        const paid = transaction.splitBillPaid || 0;
        const total = transaction.splitBillParticipants || 0;
        toast.info(
          `Receipt not available yet. Waiting for all participants to complete payment.`
        );
      }
      return;
    }

    // UC031 - AF1: View saved receipt from transaction history
    setSelectedReceipt(transaction);
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "completed")
      return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
    if (s === "pending")
      return <Badge className="bg-orange-100 text-orange-700">Pending</Badge>;
    if (s === "failed")
      return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
    if (status === "Split Bill In Progress")
      return (
        <Badge className="bg-blue-100 text-blue-700">
          Split Bill In Progress
        </Badge>
      );
    return <Badge variant="outline">{status}</Badge>;
  };

  // UC032 - NF: Apply filters to transactions
  const getFilteredTransactions = () => {
    try {
      let filtered = [...transactions];

      // Filter by status
      if (filterStatus !== "all") {
        filtered = filtered.filter((t) => t.paymentStatus === filterStatus);
      }

      // Filter by payment method
      if (filterMethod !== "all") {
        filtered = filtered.filter((t) => t.paymentMethod === filterMethod);
      }

      // Filter by date range
      if (filterDateFrom) {
        filtered = filtered.filter(
          (t) => new Date(t.date) >= new Date(filterDateFrom)
        );
      }
      if (filterDateTo) {
        filtered = filtered.filter(
          (t) => new Date(t.date) <= new Date(filterDateTo)
        );
      }

      return filtered;
    } catch (error) {
      // UC032 - EF2: Failed to retrieve filtered records
      toast.error("Unable to apply filters. Please try again later.");
      return transactions;
    }
  };

  // UC032 - NF: Clear all filters
  const handleClearFilters = () => {
    setFilterStatus("all");
    setFilterMethod("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setIsFiltering(false);
    toast.success("Filters cleared");
  };

  // UC032 - NF: Apply filters
  const handleApplyFilters = () => {
    setIsFiltering(true);
    const filtered = getFilteredTransactions();

    if (filtered.length === 0) {
      toast.info("No transactions found for the selected filters");
    } else {
      toast.success(
        `Found ${filtered.length} transaction${
          filtered.length !== 1 ? "s" : ""
        }`
      );
    }
  };

  const filteredTransactions = isFiltering
    ? getFilteredTransactions()
    : transactions;
  const hasActiveFilters =
    filterStatus !== "all" ||
    filterMethod !== "all" ||
    filterDateFrom ||
    filterDateTo;

  // If viewing a specific receipt
  if (selectedReceipt) {
    return (
      <DigitalReceipt
        receipt={selectedReceipt as any}
        onClose={() => setSelectedReceipt(null)}
      />
    );
  }

  return (
    <div className="w-full">
      {/* Header removed as it overlaps with PaymentPage header */}

      {/* UC032 - NF: Filter Controls */}
      <div className="mb-6 bg-white border rounded-lg p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Filter Label */}
          <div className="flex items-center gap-2 text-slate-600">
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filters:</span>
          </div>

          {/* UC032 - NF: Filter by Payment Method */}
          <Select value={filterMethod} onValueChange={setFilterMethod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Credit Card">Credit Card</SelectItem>
              <SelectItem value="Debit Card">Debit Card</SelectItem>
              <SelectItem value="E-Wallet">E-Wallet</SelectItem>
              <SelectItem value="Split Bill">Split Bill</SelectItem>
            </SelectContent>
          </Select>

          {/* UC032 - NF: Filter by Status */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
              <SelectItem value="Split Bill In Progress">
                Split Bill In Progress
              </SelectItem>
            </SelectContent>
          </Select>

          {/* UC032 - NF: Filter by Date Range - From */}
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            max={filterDateTo || undefined}
            className="w-[160px]"
            placeholder="Date From"
          />

          {/* UC032 - NF: Filter by Date Range - To */}
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            min={filterDateFrom || undefined}
            className="w-[160px]"
            placeholder="Date To"
          />

          {/* UC032 - NF: Filter Actions */}
          <div className="flex gap-2 ml-auto">
            <Button
              onClick={handleApplyFilters}
              className="bg-[#800000] text-white hover:bg-[#6b0000] hover:text-white"
              size="sm"
            >
              Apply
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClearFilters} size="sm">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Indicator */}
        {hasActiveFilters && isFiltering && (
          <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
            {filterStatus !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Status: {filterStatus}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setFilterStatus("all")}
                />
              </Badge>
            )}
            {filterMethod !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Method: {filterMethod}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setFilterMethod("all")}
                />
              </Badge>
            )}
            {filterDateFrom && (
              <Badge variant="secondary" className="gap-1">
                From: {filterDateFrom}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setFilterDateFrom("")}
                />
              </Badge>
            )}
            {filterDateTo && (
              <Badge variant="secondary" className="gap-1">
                To: {filterDateTo}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => setFilterDateTo("")}
                />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Transaction List */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Your Transactions
          </CardTitle>
          <CardDescription>
            {loading
              ? "Loading..."
              : isFiltering && hasActiveFilters
              ? `${filteredTransactions.length} of ${
                  transactions.length
                } transaction${transactions.length !== 1 ? "s" : ""} (filtered)`
              : `${transactions.length} transaction${
                  transactions.length !== 1 ? "s" : ""
                } found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">
              Loading transactions...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                {isFiltering && hasActiveFilters
                  ? "No transactions found for the selected filter."
                  : "No Transaction History Available"}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-white border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-slate-900">
                          {transaction.transactionId}
                        </p>
                        {getStatusBadge(transaction.paymentStatus)}
                      </div>
                      <p className="text-sm text-slate-600">
                        {transaction.cafeteriaName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-900">
                        RM {transaction.total.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {transaction.orderId}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{transaction.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{transaction.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      <span>{transaction.paymentMethod}</span>
                    </div>
                    {transaction.isSplitBill && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>Split Bill Group</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReceipt(transaction)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Receipt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-900">
              RM{" "}
              {transactions
                .filter((t) => t.paymentStatus === "Completed")
                .reduce((sum, t) => sum + t.total, 0)
                .toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Completed transactions only
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Completed Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-900">
              {
                transactions.filter((t) => t.paymentStatus === "Completed")
                  .length
              }
            </p>
            <p className="text-xs text-slate-500 mt-1">Successful payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-900">
              {transactions.filter((t) => t.paymentStatus === "Pending").length}
            </p>
            <p className="text-xs text-slate-500 mt-1">Awaiting confirmation</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
