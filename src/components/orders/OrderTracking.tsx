import { useEffect, useMemo, useState } from "react";
import { Clock, CheckCircle, ChefHat, Package, Bell, Star, Upload, X, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.js";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog.js";
import { Textarea } from "../ui/textarea.js";
import { Label } from "../ui/label.js";
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
  feedbackSubmitted?: boolean;
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

const mapRowToOrder = (row: any, queueLength: number = 0): Order => ({
  id: row.id,
  orderNumber: row.order_number,
  cafeteria: row.cafeteria_name || "Cafeteria",
  items: parseItems(row.items),
  total: Number(row.total_amount) || 0,
  status: (row.status as OrderStatus) ?? "Pending",
  createdAt: row.created_at,
  queueNumber: row.queue_number || "-",
  feedbackSubmitted: row.feedback_submitted,
  estimatedTime: calculateEstimatedPickupTime(
    {
      id: row.id,
      items: parseItems(row.items),
      status: row.status,
      createdAt: new Date(row.created_at),
    },
    queueLength
  ),
});

export default function OrderTracking({ userId }: OrderTrackingProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Feedback State
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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

      // Remove duplicates
      const uniqueOrders = Array.from(
        new Map(allRawOrders.map((o) => [o.id, o])).values()
      );

      // 5. Manual Join for Cafeteria Names
      // Collect all cafeteria_ids
      const cafeteriaIds = Array.from(
        new Set(
          uniqueOrders
            .map((o) => o.cafeteria_id)
            .filter((id) => id) // filter out null/undefined
        )
      );

      // Fetch cafeterias
      let cafeteriaMap: Record<string, string> = {};
      let queuePositionsMap: Record<string, string[]> = {}; // cafId -> [orderId, orderId...] sorted by time

      if (cafeteriaIds.length > 0) {
        // Fetch names
        const { data: cafData, error: cafError } = await supabase
          .from("cafeterias")
          .select("id, name")
          .in("id", cafeteriaIds);

        if (!cafError && cafData) {
          cafData.forEach((c) => {
            cafeteriaMap[c.id] = c.name;
          });
        }
        
        // Fetch ALL active orders for these cafeterias to determine position
        const { data: activeOrdersData } = await supabase
          .from("orders")
            .select("id, cafeteria_id, created_at")
            .in("cafeteria_id", cafeteriaIds)
            .in("status", ["Pending", "Cooking"])
            .order("created_at", { ascending: true });
            
        if (activeOrdersData) {
           activeOrdersData.forEach(o => {
               if (!queuePositionsMap[o.cafeteria_id]) {
                   queuePositionsMap[o.cafeteria_id] = [];
               }
               queuePositionsMap[o.cafeteria_id]!.push(o.id);
           });
        }
      }

      // Sort by created_at ASC (oldest first)
      uniqueOrders.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Calculate order numbers sequentially and map cafeteria name
      const mappedOrders = uniqueOrders.map((row) => {
        // Use mapped name if available, fallback to existing logic
        const cafName = cafeteriaMap[row.cafeteria_id] || row.cafeteria_name || "Cafeteria";
        
        // Find position in global queue
        let qPos = 0;
        if (queuePositionsMap[row.cafeteria_id]) {
            const idx = queuePositionsMap[row.cafeteria_id]!.indexOf(row.id);
            if (idx !== -1) {
                qPos = idx;
            } else {
                // If not found in active list (e.g. it's completed or not Pending/Cooking), 0 overhead
                qPos = 0; 
            }
        }
        
        return {
           ...mapRowToOrder({ ...row, cafeteria_name: cafName }, qPos),
        };
      });
      
      // Override orderNumber with sequential index (1, 2, 3...)
      const ordersWithNumbers = mappedOrders.map((order, index) => ({
        ...order,
        orderNumber: index + 1,
      }));

      // Final display sort: Oldest first (1, 2, 3...)
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

    const { data, error } = await supabase
      .from("orders")
      .update({ status: "Completed" })
      .eq("id", orderId)
      .select();

    if (error || (data && data.length === 0)) {
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

  // UC033 - NF: Open feedback dialog
  const handleOpenFeedback = (order: Order) => {
    // UC033 - AF1: Check if feedback already submitted
    if (order.feedbackSubmitted) {
      toast.error('You have already submitted feedback for this order.');
      return;
    }
    setSelectedOrder(order);
    setFeedbackDialogOpen(true);
    setRating(0);
    setComment('');
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // UC033 - NF: Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo size must be less than 5MB');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // UC033 - NF: Submit feedback
  const handleSubmitFeedback = async () => {
    if (!selectedOrder) return;
    
    // Validation
    if (rating === 0) {
      toast.error('Please select a star rating');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please provide a comment');
      return;
    }
    
    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to submit feedback');
        return;
      }

      // Handle photo upload if exists
      let photoUrl = null;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user.id}/${selectedOrder.id}_${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('feedback-photos')
          .upload(fileName, photoFile);

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
          toast.error('Photo upload failed', {
            description: 'Storage bucket may not exist. Feedback will be saved without photo.',
          });
          // Continue without photo if upload fails
        } else if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('feedback-photos')
            .getPublicUrl(fileName);
          photoUrl = publicUrl;
        }
      }

      // Insert feedback into database
      const { error: feedbackError } = await supabase
        .from('feedback')
        .insert({
          order_id: selectedOrder.id,
          user_id: user.id,
          customer_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Customer',
          customer_email: user.email || '',
          rating: rating,
          comment: comment.trim(),
          photo_url: photoUrl,
          order_items: selectedOrder.items,
          cafeteria_name: selectedOrder.cafeteria,
          has_reply: false,
        });

      if (feedbackError) throw feedbackError;

      // Update order with feedback submitted flag
      const { error: orderError } = await supabase
        .from('orders')
        .update({ feedback_submitted: true })
        .eq('id', selectedOrder.id);

      if (orderError) throw orderError;

      // Update local state
      setOrders(orders.map(order =>
        order.id === selectedOrder.id
          ? { ...order, feedbackSubmitted: true }
          : order
      ));
      
      // UC033 - NF: Confirmation message
      toast.success('Thank you for your feedback!', {
        description: 'Your review helps us improve our service',
      });
      
      // Close dialog and reset form
      setFeedbackDialogOpen(false);
      setSelectedOrder(null);
      setRating(0);
      setComment('');
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback', {
        description: 'Please try again later',
      });
    }
  };

  // Handle notification toggle
  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      // Request permission to enable notifications
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          toast.success('Notifications enabled!', {
            description: 'You will receive updates about your orders',
          });
        } else {
          toast.error('Notification permission denied', {
            description: 'Please enable notifications in your browser settings',
          });
        }
      } else {
        toast.error('Notifications not supported', {
          description: 'Your browser does not support notifications',
        });
      }
    } else {
      // Disable notifications
      setNotificationsEnabled(false);
      toast.info('Notifications disabled', {
        description: 'You can re-enable them anytime',
      });
    }
  };

  // Render star rating
  const renderStars = (interactive: boolean = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-8 h-8 cursor-pointer transition-all ${
              star <= (interactive ? (hoverRating || rating) : rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-300'
            } ${interactive ? 'hover:scale-110' : ''}`}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
          />
        ))}
      </div>
    );
  };

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
          onClick={handleToggleNotifications}
          className={`rounded-full gap-2 transition-all ${
            notificationsEnabled
              ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-300'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
          }`}
        >
          <Bell className={`w-4 h-4 ${
            notificationsEnabled ? 'text-white' : 'text-slate-700'
          }`} />
          <span>
            Notifications {notificationsEnabled ? 'On' : 'Off'}
          </span>
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
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="active">
                Active Orders ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                Order History ({completedOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activeOrders.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500">No active orders found.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {activeOrders.map((order) => {
                    const progress = getStatusProgress(order.status);
                    return (
                      <Card
                        key={order.id}
                        className="overflow-hidden border border-slate-200 bg-white shadow-sm"
                      >
                        <CardHeader className="bg-[#FFF5F5] border-b border-[#800000]/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                ORD-{order.orderNumber.toString().padStart(3, "0")}
                                <Badge className={getStatusColor(order.status)}>
                                  {getStatusIcon(order.status)}
                                  <span className="ml-1">{order.status}</span>
                                </Badge>
                              </CardTitle>
                              <CardDescription className="mt-1 text-slate-500">
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
                              <p className="text-[#800000] font-bold">
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
              )}
            </TabsContent>

            <TabsContent value="history">
              <div className="space-y-4">
                {completedOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden border border-slate-200">
                    <CardContent className="p-6">
                      {/* Header: ID, Status, Total */}
                      <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-3">
                            <span className="text-slate-900 font-medium">
                                ORD-{order.orderNumber.toString().padStart(3, '0')}
                            </span>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal">
                                Completed
                            </Badge>
                            {order.feedbackSubmitted && (
                              <Badge className="bg-[#800000]/10 text-[#800000] border-none shadow-none font-normal">
                                <Star className="w-3 h-3 mr-1 fill-[#800000]" />
                                Feedback Submitted
                              </Badge>
                            )}
                         </div>
                         <span className="text-[#800000] font-semibold">
                            RM {order.total.toFixed(2)}
                         </span>
                      </div>

                      {/* Subheader: Cafeteria & Date */}
                      <div className="text-xs text-slate-500 mb-6">
                        {order.cafeteria} • {order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>

                      {/* Items List */}
                      <div className="space-y-2 mb-6">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg text-sm">
                                <span className="text-slate-700">
                                    {item.quantity}x {item.name}
                                </span>
                                <span className="text-slate-500">
                                    RM {(item.price * item.quantity).toFixed(2)}
                                </span>
                            </div>
                        ))}
                      </div>
                      
                      {/* Feedback Button */}
                      {!order.feedbackSubmitted ? (
                        <Button
                          onClick={() => handleOpenFeedback(order)}
                          variant="outline"
                          className="w-full border-[#800000]/20 text-[#800000] hover:bg-[#800000]/5 h-10"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Submit Feedback
                        </Button>
                      ) : (
                        <div className="text-center py-2 text-sm text-slate-500">
                          Thank you for your feedback!
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {completedOrders.length === 0 && (
                   <div className="text-center py-10 text-slate-500">
                       No completed orders found.
                   </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* UC033 - Feedback Submission Dialog */}
          <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Submit Order Feedback</DialogTitle>
                <DialogDescription>
                  Share your experience with {selectedOrder?.cafeteria}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Order Summary */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-2">Order: {selectedOrder?.id}</p>
                  <div className="space-y-1">
                    {selectedOrder?.items.map((item, index) => (
                      <p key={index} className="text-sm text-slate-700">
                        {item.quantity}x {item.name}
                      </p>
                    ))}
                  </div>
                </div>

                {/* UC033 - NF: Star Rating */}
                <div>
                  <Label className="mb-3 block">Rate your experience *</Label>
                  <div className="flex items-center gap-4">
                    {renderStars(true)}
                    {rating > 0 && (
                      <span className="text-sm text-slate-600">
                        {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : 'Excellent'}
                      </span>
                    )}
                  </div>
                </div>

                {/* UC033 - NF: Comment Field */}
                <div>
                  <Label htmlFor="comment" className="mb-2 block">
                    Your feedback *
                  </Label>
                  <Textarea
                    id="comment"
                    placeholder="Tell us about your experience with the food, service, and overall satisfaction..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

                {/* UC033 - NF: Optional Photo Upload */}
                <div>
                  <Label className="mb-2 block">Add a photo (optional)</Label>
                  {!photoPreview ? (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors cursor-pointer">
                      <input
                        type="file"
                        id="photo-upload"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <label htmlFor="photo-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <p className="text-sm text-slate-600">Click to upload a photo</p>
                        <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Feedback photo"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={handleRemovePhoto}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSubmitFeedback}
                    className="flex-1 bg-[#800000] hover:bg-[#600000] text-white"
                  >
                    Submit Feedback
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setFeedbackDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
