import { useEffect, useMemo, useState } from "react";
import { Clock, CheckCircle, ChefHat, Package, Bell } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card.js";
import { Badge } from "../ui/badge.js";
import { Progress } from "../ui/progress.js";
import { Button } from "../ui/button.js";
import { toast } from "sonner";
import { supabase } from "../../lib/supabaseClient.js";
import {
  calculateEstimatedPickupTime,
  formatEstimatedPickupTime,
} from "../../utils/queueCalculations.js";

interface OrderTrackingProps {
  userId: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

type OrderStatus = "Pending" | "Cooking" | "Ready for Pickup" | "Completed";

interface Order {
  id: string;
  orderNumber: number;
  cafeteria: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  queueNumber: string;
  estimatedTime?: number;
}

const parseItems = (raw: any): OrderItem[] => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      name: item.name ?? "Item",
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
    }));
  } catch {
    return [];
  }
};

const mapRowToOrder = (row: any): Order => ({
  id: row.id,
  orderNumber: row.order_number,
  cafeteria: row.cafeteria_name || "Cafeteria",
  items: parseItems(row.items),
  total: Number(row.total_amount) || 0,
  status: (row.status as OrderStatus) ?? "Pending",
  createdAt: row.created_at,
  queueNumber: row.queue_number || "-",
  estimatedTime: calculateEstimatedPickupTime(
    {
      id: row.id,
      items: parseItems(row.items),
      status: row.status,
      createdAt: new Date(row.created_at),
    },
    0
  ),
});

export default function OrderTracking({ userId }: OrderTrackingProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      // 1. Get current user email for split bill lookup
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userEmail = user?.email?.toLowerCase();
      let splitBillPaymentMethods: string[] = [];

      if (userEmail) {
        // Find all sessions I am part of
        const { data: participation } = await supabase
          .from("split_bill_participants")
          .select("session_id")
          .eq("identifier", userEmail);

        if (participation && participation.length > 0) {
          splitBillPaymentMethods = participation.map(
            (p) => `Split Bill ${p.session_id}`
          );
        }
      }

      // 2. Fetch Personal Orders
      const personalOrdersHelp = supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId);

      // 3. Fetch Split Bill Orders (if any)
      const splitOrdersPromise =
        splitBillPaymentMethods.length > 0
          ? supabase
              .from("orders")
              .select("*")
              .in("payment_method", splitBillPaymentMethods)
          : Promise.resolve({ data: [], error: null });

      const [personalRes, splitRes] = await Promise.all([
        personalOrdersHelp,
        splitOrdersPromise,
      ]);

      if (personalRes.error) throw personalRes.error;
      if (splitRes.error) throw splitRes.error;

      // 4. Merge and Deduplicate
      const allRawOrders = [
        ...(personalRes.data || []),
        ...(splitRes.data || []),
      ];

      // Remove duplicates (in case I am the initiator, I might get it twice)
      const uniqueOrders = Array.from(
        new Map(allRawOrders.map((o) => [o.id, o])).values()
      );

      // Sort by created_at desc (newest first)
      uniqueOrders.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Calculate order numbers
      const mappedOrders = uniqueOrders.map(mapRowToOrder);
      // We can just use the DB order number or re-index.
      // Re-indexing might be confusing if they change position.
      // Let's use the actual order number from DB if reasonable, or index.
      // preserving existing logic:
      const ordersWithNumbers = mappedOrders.map((order, index) => ({
        ...order,
        orderNumber: order.orderNumber || index + 1, // Fallback to index if 0
      }));

      // Re-sort ascending if desired (original code was ascending)
      // Original: .order("created_at", { ascending: true });
      // Let's stick to original sort order: Oldest first?
      // Typically history is Newest first. But original was Ascending.
      // Let's reverse to match original "ascending" intent if that's what user had.
      ordersWithNumbers.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setOrders(ordersWithNumbers);
      setHasError(false);
    } catch (err) {
      console.error(err);
      setHasError(true);
      toast.error("Unable to retrieve orders. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("orders-tracking")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== "Completed"),
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === "Completed"),
    [orders]
  );

  const getStatusProgress = (status: OrderStatus) => {
    switch (status) {
      case "Pending":
        return 25;
      case "Cooking":
        return 50;
      case "Ready for Pickup":
        return 75;
      case "Completed":
        return 100;
      default:
        return 0;
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "Pending":
        return <Clock className="w-5 h-5" />;
      case "Cooking":
        return <ChefHat className="w-5 h-5" />;
      case "Ready for Pickup":
        return <Package className="w-5 h-5" />;
      case "Completed":
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "Pending":
        return "bg-orange-100 text-orange-700";
      case "Cooking":
        return "bg-blue-100 text-blue-700";
      case "Ready for Pickup":
        return "bg-green-100 text-green-700";
      case "Completed":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const handleConfirmPickup = async (orderId: string) => {
    const previous = orders;
    setOrders(
      orders.map((o) => (o.id === orderId ? { ...o, status: "Completed" } : o))
    );

    const { error } = await supabase
      .from("orders")
      .update({ status: "Completed" })
      .eq("id", orderId)
      .eq("user_id", userId);

    if (error) {
      setOrders(previous);
      toast.error("Unable to confirm pickup. Please try again later.");
      return;
    }

    toast.success("Your order has been marked as completed!");
  };

  const stages: OrderStatus[] = [
    "Pending",
    "Cooking",
    "Ready for Pickup",
    "Completed",
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-slate-900 mb-1">My Orders</h1>
          <p className="text-slate-600">Track your orders in real-time</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-slate-300 text-slate-50 bg-slate-900 hover:bg-slate-800 gap-2"
        >
          <Bell className="w-4 h-4 text-white" />
          <span className="text-white">Notifications On</span>
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Loading your orders...
          </CardContent>
        </Card>
      ) : hasError ? (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="py-4 text-center text-red-700">
            Unable to retrieve orders.
          </CardContent>
        </Card>
      ) : (
        <>
          {activeOrders.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No active orders found.</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-6">
            {activeOrders.map((order) => {
              const progress = getStatusProgress(order.status);
              return (
                <Card
                  key={order.id}
                  className="overflow-hidden border border-slate-200 bg-white shadow-sm"
                >
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          ORD-{order.orderNumber.toString().padStart(3, "0")}
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{order.status}</span>
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {order.cafeteria} • Queue #{order.queueNumber}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </p>
                        <p className="text-purple-700">
                          RM {order.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-6">
                    {order.status === "Ready for Pickup" ? (
                      <div className="border border-emerald-400 bg-emerald-50 text-emerald-800 rounded-lg p-3 text-sm">
                        Your Order is Ready! Please proceed to {order.cafeteria}{" "}
                        to collect your order.
                      </div>
                    ) : (
                      <div className="border border-blue-200 bg-blue-50 text-blue-800 rounded-lg p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Estimated Pickup Time</span>
                        </div>
                        <p className="text-xs mt-1">
                          Ready in approximately{" "}
                          {order.estimatedTime
                            ? `${order.estimatedTime} minutes`
                            : formatEstimatedPickupTime(0)}
                        </p>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">
                          Order Progress
                        </span>
                        <span className="text-sm text-slate-900">
                          {progress}%
                        </span>
                      </div>
                      <Progress
                        value={progress}
                        className="h-2 bg-slate-200 [&>div]:bg-slate-900"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-slate-600">Items:</p>
                      {order.items.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          No items recorded.
                        </p>
                      ) : (
                        order.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded"
                          >
                            <span className="text-sm text-slate-900">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="text-sm text-slate-600">
                              RM {(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="grid grid-cols-4 text-center text-xs text-slate-600">
                      {stages.map((label) => (
                        <div
                          key={label}
                          className="flex flex-col items-center gap-2 py-3"
                        >
                          <span
                            className={`h-9 w-9 rounded-full flex items-center justify-center border ${
                              order.status === label
                                ? "border-purple-600 text-purple-700 bg-purple-50"
                                : "border-slate-200 text-slate-400 bg-white"
                            }`}
                          >
                            {getStatusIcon(label)}
                          </span>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>

                    {order.status === "Ready for Pickup" && (
                      <Button
                        onClick={() => handleConfirmPickup(order.id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Confirm Pickup
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {completedOrders.length > 0 && (
            <div className="mt-12">
              <h2 className="text-slate-900 mb-4">Order History</h2>
              <div className="space-y-4">
                {completedOrders.map((order) => (
                  <Card key={order.id} className="opacity-80">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-900">
                            ORD-{order.orderNumber.toString().padStart(3, "0")}
                          </p>
                          <p className="text-sm text-slate-600">
                            {order.cafeteria} • {order.items.length} items
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">Completed</Badge>
                          <p className="text-sm text-slate-600 mt-1">
                            RM {order.total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
