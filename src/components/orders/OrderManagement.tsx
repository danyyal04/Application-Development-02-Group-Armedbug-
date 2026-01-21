import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card.js";
import { Badge } from "../ui/badge.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.js";
import { Clock, Bell, Package, Sparkles, Layout, Check, ClipboardList, MessageSquare, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabaseClient.js";
import {
  calculateEstimatedPickupTime,
  calculateAverageWaitTime,
  getQueueLength,
} from "../../utils/queueCalculations";
import FeedbackDashboard from '../feedback/FeedbackDashboard';

interface Order {
  id: string; // UUID
  orderNumber: number; // Global Sequence ID
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

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  return date.toLocaleDateString();
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
  const [view, setView] = useState<'orders' | 'feedback'>('orders');

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
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (!isMounted) return;

        // Fetch customer names from profiles table
        let userMap: Record<string, string> = {};
        if (data && data.length > 0) {
            const userIds = Array.from(new Set(data.map(o => o.user_id).filter(Boolean)));
            if (userIds.length > 0) {
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, name')
                    .in('id', userIds);
                
                if (!profilesError && profiles) {
                    profiles.forEach(p => {
                        userMap[p.id] = p.name;
                    });
                }
            }
        }

        // Calculate queue position for each active order
        const queueItems = data
            .filter((o: any) => o.status === 'Pending' || o.status === 'Cooking')
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        const queueIndexMap = new Map<string, number>();
        queueItems.forEach((item: any, index: number) => {
            queueIndexMap.set(item.id, index);
        });

        const mapped: Order[] = data.map((order: any) => {
          const queuePosition = queueIndexMap.has(order.id) ? queueIndexMap.get(order.id)! : 0;
          
          return {
            id: order.id,
            orderNumber: order.order_number || 0, // integer from DB
            // Use name from profiles table, fallback to existing logic
            customer: userMap[order.user_id] || order.customer_name || order.user_id?.slice(0, 8) || "Customer",
            items: typeof order.items === 'string' 
              ? JSON.parse(order.items) 
              : order.items || [],
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
                items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [],
                createdAt: new Date(order.created_at),
              } as any,
              queuePosition
            ) // Estimate based on specific queue position
          };
        });

        // Ensure orders with identical ORD numbers are visually distinguished by Queue Number in the list if needed,
        // but order_number should likely be unique per database sequence.
        // Create a compatibility layer for utility functions that expect Date objects
        const utilsCompatibleOrders = mapped.map(o => ({
           ...o,
           createdAt: new Date(o.createdAt)
        }));

        setOrders(mapped);
        setQueueLen(getQueueLength(utilsCompatibleOrders));
        setAvgWait(calculateAverageWaitTime(utilsCompatibleOrders));
        setHasError(false);

        mapped.forEach((o) => {
          const key = `${o.id}-${o.status}`;
          if (!notifiedRef.current[key]) {
            if (o.status === "Cooking") {
              toast.info(`Order #${o.queueNumber} is now being cooked!`, { icon: "🍳" });
            }
            if (o.status === "Ready for Pickup") {
              toast.success(`Order #${o.queueNumber} is ready for pickup!`, {
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

    toast.success(`Status updated to ${newStatus}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "Cooking":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Ready for Pickup":
        return "bg-green-100 text-green-700 border-green-200";
      case "Completed":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const activeOrders = orders.filter((order) => order.status !== "Completed");
  const completedOrders = orders.filter(
    (order) => order.status === "Completed"
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-slate-900 mb-2">
            {view === 'orders' ? 'Manage Pre-Orders' : 'Customer Feedback'}
          </h1>
          <p className="text-slate-600">
            {view === 'orders' 
              ? 'Update order status and track customer pre-orders in real-time'
              : 'View and respond to customer reviews'}
          </p>
        </div>
        <div className="w-full md:w-auto">
          <Select value={view} onValueChange={(v: any) => setView(v)}>
            <SelectTrigger className="group w-full md:w-[220px] bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 text-slate-700 font-medium flex items-center justify-between [&>svg:last-of-type]:hidden focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="Select View" />
              <ChevronDown size={16} className="text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-slate-100 shadow-xl p-1">
              <SelectItem 
                value="orders" 
                className="rounded-lg focus:bg-[#800000]/5 focus:text-[#800000] data-[state=checked]:bg-[#800000]/5 data-[state=checked]:text-[#800000] cursor-pointer py-2.5 px-3"
              >
                <div className="flex items-center gap-2">
                   <ClipboardList size={16} className="text-[#800000] opacity-70" />
                   <span className="font-sans">Manage Orders</span>
                </div>
              </SelectItem>
              <SelectItem 
                value="feedback"
                className="rounded-lg focus:bg-[#800000]/5 focus:text-[#800000] data-[state=checked]:bg-[#800000]/5 data-[state=checked]:text-[#800000] cursor-pointer py-2.5 px-3"
              >
                <div className="flex items-center gap-2">
                   <MessageSquare size={16} className="text-[#800000] opacity-70" />
                   <span className="font-sans">Customer Feedback</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {view === 'orders' ? (
        <>

      <Card className="mb-6 border border-[#800000]/10 bg-[#FFF5F5] shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#800000]">
            <Clock size={18} /> Smart Queue Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8">
            <p className="text-sm text-slate-700">
              Queue Length: <b className="text-lg">{queueLen}</b>
            </p>
            <p className="text-sm text-slate-700">
              Average Wait Time: <b className="text-lg">{avgWait} mins</b>
            </p>
          </div>
        </CardContent>
      </Card>

      {!cafeteriaId && !isLoading && (
        <p className="text-center text-slate-500 mb-6">
          No cafeteria assigned. Link your cafeteria to view orders.
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



      <Card className="mb-8 border-none shadow-none bg-transparent">
        <div className="mb-4">
           <h2 className="text-lg font-semibold text-slate-900">Active Orders</h2>
           <p className="text-sm text-slate-500">Orders that need attention</p>
        </div>
        
        <div className="space-y-4">
            {activeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200 leading-none">
                <div className="bg-white p-4 rounded-full mb-3 shadow-sm">
                   <Package className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-slate-500 font-medium mb-1">No active orders</h3>
              </div>
            ) : (
              activeOrders.map((order) => (
                <Card key={order.id} className="border border-slate-200 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                      {/* Left: Order Info */}
                      <div className="flex-1 space-y-2">
                         {/* Header: ID + Badges */}
                         <div className="flex items-center gap-3">
                            <span className="text-slate-900 font-medium">
                                ORD-{order.orderNumber.toString().padStart(3, '0')}
                            </span>
                            <Badge variant="outline" className={`${getStatusColor(order.status)} border`}>
                               {order.status}
                            </Badge>
                            <Badge variant="outline" className="font-mono bg-slate-100 text-slate-700 border-slate-200">
                               #{order.queueNumber}
                            </Badge>
                         </div>

                         {/* Customer & Items */}
                         <div>
                            <p className="text-slate-900 mb-1">{order.customer}</p>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                            </p>
                         </div>

                         {/* Footer: Price & Time */}
                         <div className="flex items-center gap-4 text-sm mt-2">
                             <span className="font-bold text-[#800000]">RM {order.total.toFixed(2)}</span>
                             <div className="flex items-center text-slate-500 gap-1">
                                <Clock size={14} />
                                <span>Est: {order.estimatedTime} min</span>
                             </div>
                         </div>
                         
                         {/* Ready Notification Banner */}
                         {order.status === 'Ready for Pickup' && (
                            <div className="flex items-center gap-2 text-xs bg-green-50 text-green-700 px-3 py-2 rounded-md border border-green-100 mt-2 w-fit">
                               <Bell size={12} />
                               <span>Customer notified - Order ready for pickup</span>
                            </div>
                         )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end gap-3 justify-between lg:justify-start min-w-[200px]">
                         <Select
                              value={order.status}
                              onValueChange={(value: string) => handleStatusUpdate(order.id, value as Order["status"])}
                         >
                            <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200">
                               <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                               <SelectItem value="Pending">Pending</SelectItem>
                               <SelectItem value="Cooking">Cooking</SelectItem>
                               <SelectItem value="Ready for Pickup">Ready for Pickup</SelectItem>
                               <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                         </Select>
                         <span className="text-xs text-slate-400">
                             {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
      </Card>

      {completedOrders.length > 0 && (
        <Card className="border-none shadow-none bg-transparent mt-8">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Completed Orders</h2>
            </div>
            <div className="space-y-3">
              {completedOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-700">
                             ORD-{order.orderNumber.toString().padStart(3, '0')}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-sm text-slate-600">{order.customer}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                         {order.items.length} items • RM {order.total.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{formatTimeAgo(order.createdAt)}</span>
                    <Badge variant="secondary" className="bg-slate-200 text-slate-600 font-normal">Completed</Badge>
                  </div>
                </div>
              ))}
            </div>
        </Card>
      )}

      {!isLoading && !hasError && orders.length === 0 && (
        <div className="text-center text-slate-500 mt-8">
          <p>No menu orders have been placed yet.</p>
        </div>
      )}
        </>
      ) : (
        <FeedbackDashboard />
      )}
    </div>
  );
}
