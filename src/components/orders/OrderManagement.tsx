import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card.js";
import { Badge } from "../ui/badge.js";
import { Button } from "../ui/button.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.js";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabaseClient.js";
import {
  calculateEstimatedPickupTime,
  formatEstimatedPickupTime,
  calculateAverageWaitTime,
  getQueueLength,
  isBulkOrder,
} from "../../utils/queueCalculations";

interface Order {
  id: string;
  customer: string;
  items: { name: string; quantity: number }[];
  total: number;
  status: "Pending" | "Cooking" | "Ready for Pickup" | "Completed";
  createdAt: string;
  paidAt: string | null;
  paymentMethod?: string | null;
  queueNumber: string;
  estimatedTime?: number;
}

const parseItems = (raw: any): Order["items"] => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      name: item.name ?? "Item",
      quantity: Number(item.quantity) || 1,
    }));
  } catch {
    return [];
  }
};

const normalizeStatus = (value: string | null | undefined): Order["status"] => {
  const allowed: Order["status"][] = [
    "Pending",
    "Cooking",
    "Ready for Pickup",
    "Completed",
  ];
  if (value && allowed.includes(value as Order["status"])) {
    return value as Order["status"];
  }
  return "Pending";
};

interface OrderManagementProps {
  cafeteriaId?: string | null;
}

export default function OrderManagement({ cafeteriaId }: OrderManagementProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const notifiedRef = useRef<Record<string, boolean>>({});
  const [avgWait, setAvgWait] = useState(0);
  const [queueLen, setQueueLen] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      if (!cafeteriaId) {
        setOrders([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("cafeteria_id", cafeteriaId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!isMounted) return;

        const mapped: Order[] = (data || []).map((order: any) => {
          const items = parseItems(order.items);
          return {
            id: order.id,
            customer:
              order.customer_name || order.user_id?.slice(0, 8) || "Customer",
            items,
            total: Number(order.total_amount) || 0,
            status: normalizeStatus(order.status),
            createdAt: order.created_at,
            paidAt: order.paid_at,
            paymentMethod: order.payment_method,
            queueNumber: order.queue_number || "—",
            estimatedTime: calculateEstimatedPickupTime(
              {
                id: order.id,
                status: normalizeStatus(order.status),
                items,
                createdAt: new Date(order.created_at),
              } as any,
              data.length
            ),
          };
        });

        setOrders(mapped);
        setQueueLen(getQueueLength(mapped));
        setAvgWait(calculateAverageWaitTime(mapped));
        setHasError(false);

        mapped.forEach((o) => {
          const key = `${o.id}-${o.status}`;
          if (!notifiedRef.current[key]) {
            if (o.status === "Cooking") {
              toast.info(`Order ${o.id} is now being cooked!`, { icon: "🍳" });
            }
            if (o.status === "Ready for Pickup") {
              toast.success(`Order ${o.id} is ready for pickup!`, {
                icon: "📦",
              });
            }
            notifiedRef.current[key] = true;
          }
        });
      } catch (error) {
        if (!isMounted) return;
        setHasError(true);
        toast.error("Unable to process requests. Please try again later.");
        setOrders([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadOrders();

    const channel = supabase
      .channel("orders-management")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, [cafeteriaId]);

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: Order["status"]
  ) => {
    const previousOrders = orders;
    setOrders(
      orders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      setOrders(previousOrders);
      toast.error("Unable to process requests. Please try again later.");
      return;
    }

    toast.success(`Order ${orderId} status updated to ${newStatus}`);
  };

  const getStatusColor = (status: string) => {
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

  const activeOrders = orders.filter((order) => order.status !== "Completed");
  const completedOrders = orders.filter(
    (order) => order.status === "Completed"
  );

  const renderPaymentBadge = (order: Order) =>
    order.paidAt ? (
      <Badge className="bg-emerald-100 text-emerald-700">Paid</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-700">Unpaid</Badge>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-slate-900 mb-2">Manage Pre-Orders</h1>
        <p className="text-slate-600">
          Update order status and track customer pre-orders in real-time
        </p>
      </div>

      <Card className="mb-6 border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <Clock size={18} /> Smart Queue Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 mb-1">
            Queue Length: <b>{queueLen}</b>
          </p>
          <p className="text-sm text-slate-700">
            Average Wait Time: <b>{avgWait} mins</b>
          </p>
        </CardContent>
      </Card>

      {!cafeteriaId && !isLoading && (
        <p className="text-center text-slate-500 mb-6">
          No cafeteria assigned to your profile. Link your cafeteria to start
          receiving orders here.
        </p>
      )}
      {isLoading && (
        <p className="text-center text-slate-500 mb-6">Loading orders...</p>
      )}
      {hasError && !isLoading && (
        <p className="text-center text-slate-500 mb-6">
          Unable to process requests. Please try again later.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-900">
              {orders.filter((o) => o.status === "Pending").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Cooking</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-900">
              {orders.filter((o) => o.status === "Cooking").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-900">
              {orders.filter((o) => o.status === "Ready for Pickup").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Active Orders</CardTitle>
          <CardDescription>Orders that need attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeOrders.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                No active orders
              </p>
            ) : (
              activeOrders.map((order) => (
                <Card key={order.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-slate-900">{order.id}</p>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                          <Badge variant="outline">#{order.queueNumber}</Badge>
                          {renderPaymentBadge(order)}
                        </div>
                        <p className="text-sm text-slate-600 mb-1">
                          {order.customer}
                        </p>
                        <p className="text-sm text-slate-500">
                          {order.items.length === 0
                            ? "No items recorded"
                            : order.items
                                .map((item) => `${item.quantity}x ${item.name}`)
                                .join(", ")}
                        </p>
                        <p className="text-sm text-purple-700 mt-1">
                          RM {order.total.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={order.status}
                          onValueChange={(value: string) =>
                            handleStatusUpdate(
                              order.id,
                              value as Order["status"]
                            )
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Cooking">Cooking</SelectItem>
                            <SelectItem value="Ready for Pickup">
                              Ready for Pickup
                            </SelectItem>

                          </SelectContent>
                        </Select>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleTimeString()
                            : ""}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {completedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Orders</CardTitle>
            <CardDescription>Recently completed orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm text-slate-900">
                      {order.id} • {order.customer}
                    </p>
                    <p className="text-xs text-slate-500">
                      RM {order.total.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderPaymentBadge(order)}
                    <Badge variant="secondary">Completed</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !hasError && orders.length === 0 && (
        <div className="text-center text-slate-500 mt-8">
          <p>No menu orders have been placed yet.</p>
        </div>
      )}
    </div>
  );
}
