import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ChangeEvent,
} from "react";
import {
  Users,
  CreditCard,
  Check,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Wallet,
  AlertTriangle,
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
import { Separator } from "../ui/separator";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Progress } from "../ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Alert, AlertDescription } from "../ui/alert";
import { toast } from "sonner";
import { supabase } from "../../lib/supabaseClient";
import { generateQueueNumber } from "../../utils/queueCalculations";
import DigitalReceipt from "../transactions/DigitalReceipt";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  amount: number;
  paid: boolean;
  paymentTime?: string | undefined;
  paymentMethod?: string | undefined;
  paymentStatus: "pending" | "paid" | "failed";
  invitationStatus: "pending" | "accepted" | "rejected";
}

interface PaymentMethod {
  id: string;
  type: "fpx" | "ewallet" | "card";
  name: string;
  details: string;
  is_default?: boolean;
}

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface ReceiptData {
  transactionId: string;
  orderId: string;
  cafeteriaName: string;
  cafeteriaLocation: string;
  date: string;
  time: string;
  queueNumber: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  serviceFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: "Completed" | "Pending" | "Failed" | "Split Bill In Progress";
  customerName: string;
  customerEmail: string;
}

interface SplitBillPageProps {
  splitBillId: string;
  cartItems: CartItem[];
  totalAmount: number;
  cafeteria: {
    id?: string;
    name: string;
    location: string;
  };
  pickupTime: string;
  initiatorName: string;
  currentUserEmail?: string;
  onPaymentComplete: (participantId: string) => void;
  onCancel: () => void;
  onCompleteSplitBill?: () => void;
}

export default function SplitBillPage({
  splitBillId,
  cartItems,
  totalAmount,
  cafeteria,
  pickupTime,
  initiatorName,
  currentUserEmail,
  onPaymentComplete,
  onCancel,
  onCompleteSplitBill,
}: SplitBillPageProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [paymentCredentials, setPaymentCredentials] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [generatedQueueNum, setGeneratedQueueNum] = useState<string>("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const receiptShownRef = useRef(false);

  const normalizedEmail = (currentUserEmail || "").toLowerCase();
  const currentParticipant = participants.find(
    (p) => (p.email || "").toLowerCase() === normalizedEmail
  );
  const paidCount = participants.filter((p) => p.paid).length;
  const totalPaid = participants
    .filter((p) => p.paid)
    .reduce((sum, p) => sum + p.amount, 0);
  const unpaidAmount = totalAmount - totalPaid;
  const progressPercentage = (totalPaid / totalAmount) * 100;
  const allPaid = participants.length > 0 && participants.every((p) => p.paid);
  const isInitiator = currentUserEmail === participants[0]?.email;

  const parseReceiptItems = (rawItems: any) => {
    if (!rawItems) return [];
    if (Array.isArray(rawItems)) {
      return rawItems.map((item: any) => ({
        name: item.name,
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 0),
      }));
    }
    if (typeof rawItems === "string") {
      try {
        const parsed = JSON.parse(rawItems);
        return parseReceiptItems(parsed);
      } catch (err) {
        return [];
      }
    }
    return [];
  };

  const buildReceiptData = async (order: any) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const items = parseReceiptItems(order?.items);
    const fallbackItems = cartItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity,
    }));

    const receiptItems = items.length > 0 ? items : fallbackItems;
    const subtotal =
      typeof order?.subtotal === "number"
        ? order.subtotal
        : receiptItems.reduce((sum, item) => sum + item.subtotal, 0);
    const serviceFee =
      typeof order?.service_fee === "number" ? order.service_fee : 0;
    const tax = typeof order?.tax === "number" ? order.tax : 0;
    const total =
      typeof order?.total_amount === "number" ? order.total_amount : totalAmount;

    const createdAt = order?.created_at ? new Date(order.created_at) : new Date();
    const date = createdAt.toISOString().split("T")[0] as string;
    const time = createdAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      transactionId: order?.id
        ? `TXN-${order.id.slice(0, 8).toUpperCase()}`
        : `TXN-${splitBillId.slice(0, 8).toUpperCase()}`,
      orderId: order?.id
        ? `ORD-${order.id.slice(-6).toUpperCase()}`
        : "PENDING",
      cafeteriaName: cafeteria.name || "Cafeteria",
      cafeteriaLocation: cafeteria.location || "Unknown",
      date,
      time,
      queueNumber: order?.queue_number || generatedQueueNum || "-",
      items: receiptItems,
      subtotal,
      tax,
      serviceFee,
      total,
      paymentMethod: order?.payment_method || "Split Bill",
      paymentStatus: "Completed" as const,
      customerName:
        user?.user_metadata?.full_name ||
        user?.email ||
        initiatorName ||
        "Customer",
      customerEmail: user?.email || currentUserEmail || "",
    } as ReceiptData;
  };

  const saveReceipt = async (order: any) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !order?.id) return;

    const items = parseReceiptItems(order?.items);
    const fallbackItems = cartItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity,
    }));
    const receiptItems = items.length > 0 ? items : fallbackItems;

    const subtotal =
      typeof order?.subtotal === "number"
        ? order.subtotal
        : receiptItems.reduce((sum, item) => sum + item.subtotal, 0);
    const serviceFee =
      typeof order?.service_fee === "number" ? order.service_fee : 0;
    const tax = typeof order?.tax === "number" ? order.tax : 0;
    const total =
      typeof order?.total_amount === "number" ? order.total_amount : totalAmount;

    const receiptInsert = {
      order_id: order.id,
      user_id: user.id,
      cafeteria_id: order.cafeteria_id || (cafeteria as any).id || null,
      cafeteria_name: cafeteria.name || "Cafeteria",
      cafeteria_location: cafeteria.location || "Unknown",
      queue_number: order.queue_number || generatedQueueNum || "-",
      items: receiptItems,
      subtotal: subtotal,
      tax: tax,
      service_fee: serviceFee,
      total_amount: total,
      payment_method: "Split Bill",
      payment_status: "Completed",
      customer_name:
        user?.user_metadata?.full_name ||
        user?.email ||
        initiatorName ||
        "Customer",
      customer_email: user?.email || currentUserEmail || "",
    };

    const { error: receiptError } = await supabase
      .from("receipts")
      .upsert([receiptInsert], { onConflict: "order_id" });
    if (receiptError) {
      console.warn("Failed to save receipt", receiptError);
    }
  };

  const openReceipt = async (order: any) => {
    if (receiptShownRef.current) return;
    const data = await buildReceiptData(order);
    setReceiptData(data);
    setShowReceipt(true);
    receiptShownRef.current = true;
  };

  const getPickupTimeLabel = (value: string) => {
    switch (value) {
      case "asap":
        return "ASAP";
      case "30min":
        return "In 30 minutes";
      case "1hour":
        return "In 1 hour";
      case "1.5hour":
        return "In 1.5 hours";
      case "2hour":
        return "In 2 hours";
      default:
        return value;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-amber-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-600">Paid</Badge>;
      case "failed":
        return <Badge className="bg-red-600">Failed</Badge>;
      default:
        return <Badge className="bg-amber-600">Pending</Badge>;
    }
  };

  const getInvitationBadge = (status: Participant["invitationStatus"]) => {
    if (status === "accepted")
      return (
        <Badge className="bg-green-100 text-green-700 border border-green-200">
          Accepted
        </Badge>
      );
    if (status === "rejected")
      return (
        <Badge className="bg-red-100 text-red-700 border border-red-200">
          Rejected
        </Badge>
      );
    return (
      <Badge className="bg-amber-100 text-amber-700 border border-amber-200">
        Pending Invite
      </Badge>
    );
  };

  // Load participants from DB
  const refreshParticipants = useCallback(async () => {
    const { data, error } = await supabase
      .from("split_bill_participants")
      .select("id, identifier, amount_due, status")
      .eq("session_id", splitBillId);

    if (error) {
      toast.error("Failed to load participants");
      return;
    }

    if (!data || data.length === 0) {
      // fallback to at least show the initiator
      setParticipants([
        {
          id: "initiator",
          name: initiatorName,
          email: currentUserEmail || "you",
          amount: totalAmount,
          paid: false,
          paymentStatus: "pending",
          invitationStatus: "accepted",
        },
      ]);
      return;
    }

    const mapped: Participant[] = data.map((row) => ({
      id: row.id,
      name: row.identifier,
      email: row.identifier,
      amount: Number(row.amount_due) || totalAmount / data.length,
      paid: row.status === "paid",
      paymentStatus: (row.status as Participant["paymentStatus"]) || "pending",
      invitationStatus:
        row.status === "paid" || row.status === "accepted"
          ? "accepted"
          : (row.status as Participant["invitationStatus"]) || "pending",
    }));

    setParticipants(mapped);
  }, [splitBillId, initiatorName, currentUserEmail, totalAmount]);

  useEffect(() => {
    refreshParticipants();

    // Poll for updates (in case other participants pay)
    const interval = setInterval(refreshParticipants, 3000);
    return () => clearInterval(interval);
  }, [refreshParticipants]);

  // Load saved payment methods for current user
  useEffect(() => {
    const loadPaymentMethods = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("payment")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) {
        toast.error("Failed to load payment methods");
        return;
      }

      const methods = (data || []) as PaymentMethod[];
      setPaymentMethods(methods);
    };

    loadPaymentMethods();
  }, []);

  // Pick default payment selection whenever methods load/change
  useEffect(() => {
    const defaultMethod = paymentMethods.find((m) => m.is_default);
    const methodToSelect = defaultMethod || paymentMethods[0];
    if (!selectedPaymentId && methodToSelect) {
      setSelectedPaymentId(methodToSelect.id);
    }
  }, [paymentMethods, selectedPaymentId]);

  const handlePayMyPortion = () => {
    if (!currentParticipant) {
      toast.error("Unable to identify your payment portion");
      return;
    }

    if (currentParticipant.invitationStatus !== "accepted") {
      toast.error("Please accept the invitation before paying.");
      return;
    }

    if (currentParticipant.paid) {
      toast.info("You have already paid your portion");
      return;
    }

    if (paymentMethods.length === 0) {
      toast.error("Please add a payment method first (Payments page).");
      return;
    }

    setShowPaymentDialog(true);
  };

  const handleUpdateParticipantStatus = async (status: "accepted" | "rejected") => {
    if (!currentParticipant?.id) {
      toast.error("Participant not found");
      return;
    }

    const { error } = await supabase
      .from("split_bill_participants")
      .update({ status })
      .eq("id", currentParticipant.id);

    if (error) {
      toast.error(error.message || `Failed to ${status} invitation`);
      return;
    }

    toast.success(`Invitation ${status} successfully`);
    refreshParticipants();
  };

  const handleConfirmPayment = () => {
    if (!paymentCredentials) {
      toast.error("Invalid payment details. Please check and try again.");
      return;
    }

    if (!selectedPaymentId) {
      toast.error("Please select a payment method");
      return;
    }

    const selectedMethod = paymentMethods.find(
      (m) => m.id === selectedPaymentId
    );
    if (!selectedMethod) {
      toast.error("Invalid payment method. Please choose another.");
      return;
    }

    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(async () => {
      const isSuccess = Math.random() > 0.1; // 90% success rate

      if (isSuccess) {
        // Update participant payment status
        setParticipants((prev) =>
          prev.map((p) =>
            p.email === currentUserEmail
              ? {
                  ...p,
                  paid: true,
                  paymentStatus: "paid",
                  paymentTime: new Date().toLocaleTimeString(),
                  paymentMethod: selectedMethod?.name,
                }
              : p
          )
        );

        // Persist to DB so reloads stay paid
        if (currentParticipant?.id) {
          const { error } = await supabase
            .from("split_bill_participants")
            .update({ status: "paid" })
            .eq("id", currentParticipant.id);

          if (error) {
            console.error("split_bill_participants update error", error);
            toast.error(
              error.message || "Unable to record payment. Please try again."
            );
            setIsProcessing(false);
            return;
          }

          await refreshParticipants();
        }

        toast.success("Payment successful! Thank you for your contribution.");
        setShowPaymentDialog(false);

        if (currentParticipant) {
          onPaymentComplete(currentParticipant.id);
        }
      } else {
        // Simulate payment failure
        setParticipants((prev) =>
          prev.map((p) =>
            p.email === currentUserEmail ? { ...p, paymentStatus: "failed" } : p
          )
        );
        toast.error("Payment failed. Please retry.");
      }

      setIsProcessing(false);
      setPaymentCredentials("");
    }, 2000);
  };

  const handleCancelSession = async () => {
    if (allPaid) {
      toast.error(
        "Cannot cancel split bill because all participants have paid."
      );
      return;
    }

    try {
      setIsProcessing(true);
      // Update session status to cancelled in Supabase
      const { error } = await supabase
        .from("split_bill_sessions")
        .update({ status: "cancelled" })
        .eq("id", splitBillId);

      if (error) {
        console.error("Failed to cancel session:", error);
        toast.error(`Failed to cancel split bill: ${error.message}`);
        setIsProcessing(false);
        return;
      }

      toast.success("Split bill cancelled.");
      onCancel(); // Navigate away
    } catch (err) {
      console.error("Error cancelling session:", err);
      toast.error("An error occurred.");
      setIsProcessing(false);
    }
  };

  const handleCoverRemainingAmount = () => {
    if (unpaidAmount <= 0) {
      toast.info("All payments have been completed");
      return;
    }

    setShowCompleteDialog(true);
  };

  const handleCompletePayment = () => {
    setIsProcessing(true);

    // Simulate payment processing for remaining amount
    setTimeout(async () => {
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
        // Mark all unpaid participants as paid (covered by initiator)
        setParticipants((prev) =>
          prev.map((p) => ({
            ...p,
            paid: true,
            paymentStatus: "paid",
            paymentTime: p.paid
              ? p.paymentTime
              : new Date().toLocaleTimeString(),
            paymentMethod: p.paid ? p.paymentMethod : "Covered by initiator",
            invitationStatus: "accepted",
          }))
        );

        // Persist paid status for pending participants
        const { error } = await supabase
          .from("split_bill_participants")
          .update({ status: "paid" })
          .eq("session_id", splitBillId)
          .eq("status", "pending");

        if (error) {
          console.warn("Failed to persist complete payment", error);
        } else {
          await refreshParticipants();
        }

        toast.success("Split bill payment completed successfully! ??");
        setShowCompleteDialog(false);

        if (onCompleteSplitBill) {
          setTimeout(() => {
            onCompleteSplitBill();
          }, 1500);
        }
      } else {
        toast.error("Payment failed. Please try again.");
      }

      setIsProcessing(false);
    }, 2000);
  };

  // Fetch Queue Number for all participants
  useEffect(() => {
    if (allPaid && !generatedQueueNum) {
      const fetchQueueNumber = async () => {
        const paymentMethodString = `Split Bill ${splitBillId}`;
        const { data: existingOrder } = await supabase
          .from("orders")
          .select("queue_number")
          .eq("payment_method", paymentMethodString)
          .maybeSingle();

        if (existingOrder?.queue_number) {
          setGeneratedQueueNum(existingOrder.queue_number);
        }
      };

      // Poll slightly or just run once? 
      // Running it inside an interval might be safer to catch it after creation
      const interval = setInterval(fetchQueueNumber, 2000);
      fetchQueueNumber();

      return () => clearInterval(interval);
    }
  }, [allPaid, generatedQueueNum, splitBillId]);

  // Order Creation Ref to prevent duplicates
  const orderCreatedRef = useRef(false);

  useEffect(() => {
    // Check if all participants have paid
    if (allPaid && participants.length > 0 && !orderCreatedRef.current) {
      const createOrder = async () => {
        try {
          // Get current user and session details
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          // Prevent double creation
          orderCreatedRef.current = true;

          // Check if order already exists for this split bill
          const paymentMethodString = `Split Bill ${splitBillId}`;
          const { data: existingOrder } = await supabase
            .from("orders")
            .select("id, queue_number")
            .eq("payment_method", paymentMethodString)
            .maybeSingle();

          if (existingOrder) {
            console.log("Order already exists for this split bill");
            if (existingOrder.queue_number) {
               setGeneratedQueueNum(existingOrder.queue_number);
            }
            await openReceipt(existingOrder);
            return;
          }

          // Resolve cafeteria ID
          let cafeId = (cafeteria as any).id || null;
          console.log(
            `[Order Creation] Initial Cafe ID from props: ${cafeId}`,
            cafeteria
          );

          if (!cafeId) {
            console.log(
              `[Order Creation] ID missing, attempting lookup by name: ${cafeteria.name}`
            );
            const { data: cafeData } = await supabase
              .from("cafeterias")
              .select("id")
              .eq("name", cafeteria.name)
              .maybeSingle();
            cafeId = cafeData?.id || null;
            console.log(`[Order Creation] Lookup result: ${cafeId}`);
          }

          if (!cafeId) {
            console.error(
              "[Order Creation] CRITICAL: Could not resolve Cafeteria ID. Order will not be visible to manager."
            );
            toast.error(
              "Warning: Cafeteria ID not found. Order may not appear in management view."
            );
          }

          // Generate Queue Number
          // 1. Get count of orders for this cafeteria today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const startOfDay = today.toISOString();

          const { count } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .gte("created_at", startOfDay);

          // Use safe access for cafeteria name
          const cafeName =
            (cafeteria as any).name ||
            (cafeteria as any).cafeteria_name ||
            "Cafeteria";
          const qNum = generateQueueNumber(cafeName, count || 0);

          // Create the order
          const { data: createdOrder, error: orderError } = await supabase
            .from("orders")
            .insert([
              {
                user_id: user.id,
                cafeteria_id: cafeId,
                total_amount: totalAmount,
                status: "Pending",
                paid_at: new Date().toISOString(),
                items: JSON.stringify(cartItems),
                payment_method: paymentMethodString,
                subtotal: totalAmount - 0.5,
                tax: 0,
                service_fee: 0.5,
                queue_number: qNum,
              },
            ])
            .select()
            .single();
          setGeneratedQueueNum(qNum);

          if (orderError) {
            console.error("Failed to create order from split bill", orderError);
            toast.error("Payment complete, but failed to create order record.");
          } else {
            // Show success dialog instead of just toast
            setShowSuccessDialog(true);
            if (createdOrder) {
              await saveReceipt(createdOrder);
              await openReceipt(createdOrder);
            }
          }
        } catch (err) {
          console.error(err);
        }
      };

      createOrder();
    }
  }, [
    allPaid,
    participants.length,
    cafeteria,
    cartItems,
    totalAmount,
    splitBillId,
    onCompleteSplitBill, // added dependency
  ]);

  // Simulate session expiry after 30 minutes (for demo, using shorter time)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!allPaid) {
        setSessionExpired(true);
      }
    }, 1800000); // 30 minutes

    return () => clearTimeout(timer);
  }, [allPaid]);

  useEffect(() => {
    if (!allPaid || receiptShownRef.current) return;
    let isMounted = true;
    const paymentMethodString = `Split Bill ${splitBillId}`;

    const fetchOrderForReceipt = async () => {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_method", paymentMethodString)
        .maybeSingle();

      if (existingOrder && isMounted) {
        await openReceipt(existingOrder);
      }
    };

    const interval = setInterval(fetchOrderForReceipt, 1500);
    fetchOrderForReceipt();

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [allPaid, splitBillId]);

  if (showReceipt && receiptData) {
    return (
      <DigitalReceipt
        receipt={receiptData}
        onClose={() => setShowReceipt(false)}
      />
    );
  }

  // UC020: Exception Flow - Session Expired
  if (sessionExpired) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-slate-900 mb-2">Split Bill Session Expired</h2>
            <p className="text-slate-600 mb-6">
              This split bill session is no longer active. The order may have
              been cancelled or expired.
            </p>
            <Button onClick={onCancel} variant="outline">
              Return to Order History
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header - UC020 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-6 h-6 text-purple-700" />
          <h1 className="text-slate-900">Split Bill Payment Tracking</h1>
        </div>
        <p className="text-slate-600">
          Real-time payment status for group order
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* UC020: Payment Progress */}
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700">Payment Progress</p>
                    <p className="text-2xl text-purple-900">
                      RM {totalPaid.toFixed(2)} / RM {totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <Badge className={allPaid ? "bg-green-600" : "bg-amber-600"}>
                    {paidCount} / {participants.length} paid
                  </Badge>
                </div>
                <Progress value={progressPercentage} className="h-2" />

                {/* UC020: All Paid Confirmation */}
                {allPaid && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      All split bill payments completed. Your order is now
                      confirmed and will be sent to the cafeteria!
                    </AlertDescription>
                    {generatedQueueNum && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-green-200 text-center shadow-sm max-w-xs mx-auto">
                        <p className="text-xs uppercase tracking-wider text-green-600 font-semibold mb-1">
                          Queue Number
                        </p>
                        <p className="text-4xl font-bold text-green-700">
                          {generatedQueueNum}
                        </p>
                      </div>
                    )}
                  </Alert>
                )}

                {/* UC020: Unpaid Balance Alert */}
                {!allPaid && unpaidAmount > 0 && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      Remaining unpaid balance: RM {unpaidAmount.toFixed(2)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* UC020: Participants Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle>
                Payment Status ({participants.length} Participants)
              </CardTitle>
              <CardDescription>
                Real-time status for each participant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      participant.paid
                        ? "bg-green-50 border-green-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          participant.paymentStatus === "paid"
                            ? "bg-green-100"
                            : participant.paymentStatus === "failed"
                            ? "bg-red-100"
                            : "bg-slate-100"
                        }`}
                      >
                        {getStatusIcon(participant.paymentStatus)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-slate-900">
                            {participant.name}
                            {participant.email === currentUserEmail && (
                              <span className="text-purple-700"> (You)</span>
                            )}
                          </p>
                          {participant.id === "1" && (
                            <Badge variant="secondary" className="text-xs">
                              Initiator
                            </Badge>
                          )}
                          {getInvitationBadge(participant.invitationStatus)}
                        </div>
                        <p className="text-sm text-slate-600">
                          {participant.email}
                        </p>
                        {participant.paymentTime && (
                          <p className="text-xs text-slate-500 mt-1">
                            Paid at {participant.paymentTime} via{" "}
                            {participant.paymentMethod}
                          </p>
                        )}
                        {participant.email === currentUserEmail &&
                          participant.invitationStatus === "pending" && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleUpdateParticipantStatus("accepted")}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500 text-red-600"
                                onClick={() => handleUpdateParticipantStatus("rejected")}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-900 mb-1">
                        RM {participant.amount.toFixed(2)}
                      </p>
                      {getStatusBadge(participant.paymentStatus)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>
                {cartItems.length} items in this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between py-2">
                    <div className="flex-1">
                      <p className="text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-slate-900">
                      RM {(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Bill Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pickup Details */}
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-900 mb-2">Pickup Details</p>
                <p className="text-slate-900">{cafeteria.name}</p>
                <p className="text-sm text-slate-600 mb-2">
                  {cafeteria.location}
                </p>
                <Badge className="bg-purple-600">
                  <Clock className="w-3 h-3 mr-1" />
                  {getPickupTimeLabel(pickupTime)}
                </Badge>
              </div>

              <Separator />

              {/* Payment Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Total Amount</span>
                  <span>RM {totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Paid</span>
                  <span className="text-green-600">
                    RM {totalPaid.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-900">
                  <span>Unpaid</span>
                  <span className="text-red-600">
                    RM {unpaidAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Your Portion */}
              {currentParticipant && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Your portion</span>
                      <span>RM {currentParticipant.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900">
                      <span>Status</span>
                      {getStatusBadge(currentParticipant.paymentStatus)}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Action Buttons */}
              <div className="space-y-2">
                {/* Pay My Portion Button */}
                {currentParticipant &&
                  !currentParticipant.paid &&
                  currentParticipant.invitationStatus === "accepted" && (
                    <Button
                      onClick={handlePayMyPortion}
                      className="w-full bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-800 hover:to-pink-800"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Pay My Portion
                    </Button>
                  )}

                {currentParticipant?.paid && (
                  <Button disabled className="w-full bg-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    Payment Complete
                  </Button>
                )}

                {/* UC021: Complete Split Bill Payment */}
                {!allPaid && unpaidAmount > 0 && (
                  <Button
                    onClick={handleCoverRemainingAmount}
                    variant="outline"
                    className="w-full border-purple-600 text-purple-700 hover:bg-purple-50"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Cover Remaining Balance
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleCancelSession}
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={isProcessing || allPaid}
                >
                  Cancel Split Bill (End Session)
                </Button>
              </div>

              {/* Info */}
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-800">
                  {allPaid
                    ? "All participants have paid. The order will be sent to the cafeteria."
                    : "Waiting for all participants to complete payment. The initiator can cover the remaining balance."}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Your Portion</DialogTitle>
            <DialogDescription>
              Complete payment for your share of the bill
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Amount Summary */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Your portion</span>
                <span className="text-slate-900">
                  RM {currentParticipant?.amount.toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-slate-900">Total to pay</span>
                <span className="text-slate-900">
                  RM {(currentParticipant?.amount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2">
              <Label>Select Payment Method</Label>
              {paymentMethods.length === 0 ? (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-800">
                    No payment methods found. Please add one on the Payments
                    page before paying.
                  </AlertDescription>
                </Alert>
              ) : (
                <RadioGroup
                  value={selectedPaymentId}
                  onValueChange={setSelectedPaymentId}
                >
                  <div className="space-y-2">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPaymentId === method.id
                            ? "border-purple-600 bg-purple-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                        onClick={() => setSelectedPaymentId(method.id)}
                      >
                        <RadioGroupItem value={method.id} id={method.id} />
                        <Label
                          htmlFor={method.id}
                          className="flex-1 cursor-pointer"
                        >
                          <p className="text-slate-900">{method.name}</p>
                          <p className="text-sm text-slate-600">
                            {method.details}
                          </p>
                        </Label>
                        <CreditCard className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
            </div>

            {/* Payment Credentials */}
            <div className="space-y-2">
              <Label htmlFor="credentials">
                {paymentMethods.find((m) => m.id === selectedPaymentId)
                  ?.type === "card"
                  ? "Card CVV"
                  : "PIN"}
              </Label>
              <Input
                id="credentials"
                type="password"
                placeholder="Enter credentials"
                value={paymentCredentials}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setPaymentCredentials(e.target.value)
                }
              />
            </div>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800">
                Demo mode: Enter any credentials to simulate payment
              </AlertDescription>
            </Alert>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={isProcessing || !selectedPaymentId}
              className="flex-1 bg-gradient-to-r from-purple-700 to-pink-700"
            >
              {isProcessing ? "Processing..." : "Confirm Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* UC021: Complete Split Bill Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Split Bill Payment</DialogTitle>
            <DialogDescription>
              Cover the remaining unpaid balance to complete the order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Unpaid Participants */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900 mb-2">Unpaid Participants:</p>
              <div className="space-y-1">
                {participants
                  .filter((p) => !p.paid)
                  .map((p) => (
                    <div key={p.id} className="flex justify-between text-sm">
                      <span className="text-red-800">{p.name}</span>
                      <span className="text-red-800">
                        RM {p.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Amount Summary */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Remaining unpaid amount</span>
                <span className="text-slate-900">
                  RM {unpaidAmount.toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-slate-900">Total to pay</span>
                <span className="text-slate-900">
                  RM {unpaidAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2">
              <Label>Select Payment Method</Label>
              {paymentMethods.length === 0 ? (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-800">
                    No payment methods found. Please add one on the Payments
                    page before paying.
                  </AlertDescription>
                </Alert>
              ) : (
                <RadioGroup
                  value={selectedPaymentId}
                  onValueChange={setSelectedPaymentId}
                >
                  <div className="space-y-2">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPaymentId === method.id
                            ? "border-purple-600 bg-purple-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                        onClick={() => setSelectedPaymentId(method.id)}
                      >
                        <RadioGroupItem value={method.id} id={method.id} />
                        <Label
                          htmlFor={method.id}
                          className="flex-1 cursor-pointer"
                        >
                          <p className="text-slate-900">{method.name}</p>
                          <p className="text-sm text-slate-600">
                            {method.details}
                          </p>
                        </Label>
                        <CreditCard className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-800">
                By covering the remaining balance, you agree to pay for the
                unpaid portions. The order will be confirmed and sent to the
                cafeteria.
              </AlertDescription>
            </Alert>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompletePayment}
              disabled={isProcessing || !selectedPaymentId}
              className="flex-1 bg-gradient-to-r from-purple-700 to-pink-700"
            >
              {isProcessing ? "Processing..." : "Complete Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={showSuccessDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowSuccessDialog(false);
            if (onCompleteSplitBill) onCompleteSplitBill();
          } else {
            setShowSuccessDialog(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Successful</DialogTitle>
            <DialogDescription>Your order has been placed.</DialogDescription>
          </DialogHeader>


          <div className="mt-6 mb-6 text-center">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white shadow-lg mx-auto max-w-sm">
              <div className="flex items-center justify-center gap-2 mb-2 opacity-90">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm font-medium">Your Queue Number</span>
              </div>
              <div className="text-5xl font-bold mb-2 tracking-wider">
                {generatedQueueNum}
              </div>
              <p className="text-sm opacity-90">
                Please remember this number for pickup
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-center text-slate-600">
              We will notify the cafeteria and update your order status shortly.
            </p>
            <Button
              className="w-full text-white"
              style={{ backgroundColor: "oklch(40.8% 0.153 2.432)" }}
              onClick={() => {
                setShowSuccessDialog(false);
                if (onCompleteSplitBill) onCompleteSplitBill();
              }}
            >
              View My Orders
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
