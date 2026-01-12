import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle,
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
import { Separator } from "../ui/separator";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { toast } from "sonner";
import DigitalReceipt from "../transactions/DigitalReceipt";
import { supabase } from "../../lib/supabaseClient";
import {
  calculateEstimatedPickupTime,
  formatEstimatedPickupTime,
  generateQueueNumber,
} from "../../utils/queueCalculations";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PaymentMethod {
  id: string;
  type: "fpx" | "ewallet" | "card";
  name: string;
  details: string;
  pin: string;
  is_default: boolean;
  balance: number | null;
  credit_limit: number | null;
}

interface CheckoutPageProps {
  cafeteria: {
    id?: string;
    name: string;
    location: string;
  };
  cartItems: CartItem[];
  pickupTime: string;
  onBack: () => void;
  onSuccess: () => void;
  onSplitBill?: (participantCount: number) => void;
  initialMode?: "normal" | "split";
}

export default function CheckoutPage({
  cafeteria,
  cartItems,
  pickupTime,
  onBack,
  onSuccess,
  onSplitBill,
  initialMode = "normal",
}: CheckoutPageProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [paymentCredentials, setPaymentCredentials] = useState("");
  const [newPaymentData, setNewPaymentData] = useState({
    type: "fpx" as "fpx" | "ewallet" | "card",
    name: "",
    details: "",
    cardNumber: "",
    expiry: "",
    securityCode: "",
    pin: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState({
    amount: 0,
    method: "",
  });
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<"normal" | "split">(
    initialMode
  );
  const [splitMethod, setSplitMethod] = useState<"even" | "items">("even");
  const [participantCount, setParticipantCount] = useState<number>(2);
  const [generatedQueueNum, setGeneratedQueueNum] = useState<string>("");

  const safeCafeteriaId = useMemo(() => {
    const id = cafeteria?.id;
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return id && uuidPattern.test(id) ? id : null;
  }, [cafeteria?.id]);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const serviceFee = 0.5;
  const total = subtotal + serviceFee;
  const selectedPayment = paymentMethods.find(
    (pm) => pm.id === selectedPaymentId
  );
  const requiresManualCredentials = selectedPayment?.type !== "card";
  const placeOrderLabel =
    isProcessing && checkoutMode === "normal"
      ? "Processing..."
      : selectedPayment?.type === "card"
      ? "Charge Card & Place Order"
      : "Place Order";
  const confirmButtonLabel = requiresManualCredentials
    ? "Confirm Payment"
    : "Charge Card";
  const splitPerPerson = useMemo(
    () => (participantCount > 0 ? total / participantCount : total),
    [total, participantCount]
  );

  const fetchPayments = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("payment")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) return toast.error("Failed to load payment methods");
    if (data) setPaymentMethods(data as PaymentMethod[]);

    const defaultMethod = (data as PaymentMethod[]).find((pm) => pm.is_default);
    if (defaultMethod) setSelectedPaymentId(defaultMethod.id);
  };

  useEffect(() => {
    fetchPayments();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel("payment-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "payment",
            filter: `user_id=eq.${user.id}`,
          },
          () => fetchPayments()
        )
        .subscribe();

      return () => channel.unsubscribe();
    })();
  }, []);

  useEffect(() => {
    setCheckoutMode(initialMode);
  }, [initialMode]);

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case "fpx":
        return "FPX";
      case "ewallet":
        return "E-WALLET";
      case "card":
        return "CREDIT/DEBIT CARD";
      default:
        return type;
    }
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

  const handleAddNewPayment = async () => {
    const expiryPattern = /^(0[1-9]|1[0-2])\/\d{2}$/;
    const cvvPattern = /^\d{3}$/;
    const sixDigitPinPattern = /^\d{6}$/;
    const sanitizedCard = newPaymentData.cardNumber.replace(/\D/g, "");
    const sanitizedDetails = newPaymentData.details.replace(/\D/g, "");

    if (newPaymentData.type === "card") {
      if (
        !newPaymentData.name ||
        sanitizedCard.length < 12 ||
        !expiryPattern.test(newPaymentData.expiry) ||
        !cvvPattern.test(newPaymentData.securityCode)
      ) {
        toast.error("Invalid payment information.");
        return;
      }
    } else if (newPaymentData.type === "fpx") {
      if (
        !newPaymentData.name ||
        sanitizedDetails.length < 10 ||
        !sixDigitPinPattern.test(newPaymentData.pin)
      ) {
        toast.error("Invalid payment information.");
        return;
      }
    } else if (newPaymentData.type === "ewallet") {
      if (
        !newPaymentData.name ||
        sanitizedDetails.length < 9 ||
        !sixDigitPinPattern.test(newPaymentData.pin)
      ) {
        toast.error("Invalid payment information.");
        return;
      }
    } else if (!newPaymentData.name || !newPaymentData.details) {
      toast.error("Invalid payment information.");
      return;
    }

    const detailsValue =
      newPaymentData.type === "card"
        ? `${sanitizedCard.slice(-4)}|${newPaymentData.expiry}`
        : sanitizedDetails;

    const duplicateExists = paymentMethods.some(
      (pm) =>
        pm.type === newPaymentData.type &&
        pm.name === newPaymentData.name &&
        pm.details === detailsValue
    );
    if (duplicateExists) {
      toast.error("This payment method is already exist");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return toast.error("User not logged in");

    const payload = {
      user_id: user.id,
      type: newPaymentData.type,
      name: newPaymentData.name,
      details: detailsValue,
      pin:
        newPaymentData.type === "card"
          ? newPaymentData.securityCode
          : newPaymentData.pin,
      is_default: paymentMethods.length === 0,
      balance: newPaymentData.type === "card" ? null : 100,
      credit_limit: newPaymentData.type === "card" ? 500 : null,
    };

    const { data, error } = await supabase
      .from("payment")
      .insert([payload])
      .select()
      .single();
    if (error)
      return toast.error(
        "Unable to save payment method. Please try again later."
      );

    const addedMethod = data as PaymentMethod;
    setPaymentMethods([...paymentMethods, addedMethod]);
    setSelectedPaymentId(addedMethod.id);

    setShowAddPaymentDialog(false);
    setNewPaymentData({
      type: "fpx",
      name: "",
      details: "",
      cardNumber: "",
      expiry: "",
      securityCode: "",
      pin: "",
    });
    toast.success("Payment method added successfully.");
  };

  const handlePlaceOrderClick = () => {
    if (isProcessing) return;
    if (checkoutMode === "split") {
      onSplitBill?.(participantCount);
      return;
    }
    if (!selectedPaymentId) {
      toast.error("Please select a payment method");
      return;
    }
    const method = paymentMethods.find((pm) => pm.id === selectedPaymentId);
    if (!method) {
      toast.error("Payment method not found");
      return;
    }
    setPaymentCredentials("");
    if (method.type === "card") {
      handleConfirmPayment();
      return;
    }
    setShowPaymentDialog(true);
  };

  const handleSuccessDialogChange = (open: boolean) => {
    if (!open) {
      setShowSuccessDialog(false);
      onSuccess();
    } else {
      setShowSuccessDialog(true);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedPaymentId)
      return toast.error("Please select a payment method");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return toast.error(
        "Unable to connect to payment service. Please try again later."
      );

    setIsProcessing(true);
    try {
      const payment = paymentMethods.find((pm) => pm.id === selectedPaymentId);
      if (!payment) {
        toast.error(
          "Unable to connect to payment service. Please try again later."
        );
        return;
      }

      const requiresCredentials = payment.type !== "card";
      if (
        requiresCredentials &&
        (!paymentCredentials || payment.pin !== paymentCredentials)
      ) {
        toast.error("Invalid payment details. Please check and try again.");
        return;
      }

      if (
        payment.type === "card" &&
        typeof payment.credit_limit === "number" &&
        total > payment.credit_limit
      ) {
        toast.error("Payment failed or cancelled");
        return;
      }
      if (
        (payment.type === "fpx" || payment.type === "ewallet") &&
        typeof payment.balance === "number" &&
        total > payment.balance
      ) {
        toast.error("Payment failed or cancelled");
        return;
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

      const qNum = generateQueueNumber(cafeteria.name, count || 0);

      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            user_id: user.id,
            cafeteria_id: safeCafeteriaId,
            total_amount: total,
            payment_id: payment.id,
            payment_method: payment.type,
            status: "Pending",
            paid_at: new Date().toISOString(),
            items: cartItems, // Pass object directly for JSONB
            queue_number: qNum,
            subtotal: subtotal,
            tax: 0,
            service_fee: serviceFee,
          },
        ])
        .select()
        .single();

      if (orderError) {
        console.error("Order insertion failed:", orderError);
        toast.error(
          orderError.message ||
            "Unable to connect to payment service. Please try again later."
        );
        return;
      }

      setGeneratedQueueNum(qNum);

      const { error: updateError } = await supabase
        .from("payment")
        .update({
          balance:
            typeof payment.balance === "number"
              ? payment.balance - total
              : payment.balance,
          credit_limit:
            typeof payment.credit_limit === "number"
              ? payment.credit_limit - total
              : payment.credit_limit,
        })
        .eq("id", selectedPaymentId);
      if (updateError) {
        toast.error(updateError.message || "Payment failed or cancelled");
        return;
      }

      if (newOrder?.id) {
        const receiptInsert = {
          order_id: newOrder.id,
          user_id: user.id,
          cafeteria_id: safeCafeteriaId,
          cafeteria_name: cafeteria.name,
          cafeteria_location: cafeteria.location || "UTM",
          queue_number: qNum,
          items: cartItems,
          subtotal: subtotal,
          tax: 0,
          service_fee: serviceFee,
          total_amount: total,
          payment_method: payment.name || payment.type,
          payment_status: "Completed",
          customer_name: user.user_metadata?.full_name || user.email || "Me",
          customer_email: user.email || "",
        };

        const { error: receiptError } = await supabase
          .from("receipts")
          .upsert([receiptInsert], { onConflict: "order_id" });
        if (receiptError) {
          console.warn("Failed to save receipt", receiptError);
        }
      }

      // Construct Receipt Data
      const receiptData: any = {
        transactionId: `TXN-${(newOrder?.id || "").slice(0, 8).toUpperCase()}`,
        orderId: `ORD-${(newOrder?.id || "").slice(-6).toUpperCase()}`,
        cafeteriaName: cafeteria.name,
        cafeteriaLocation: cafeteria.location || "UTM",
        date: new Date().toLocaleDateString(), // Use local time for receipt
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        queueNumber: qNum,
        items: cartItems.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          subtotal: i.price * i.quantity,
        })),
        subtotal: subtotal,
        tax: 0,
        serviceFee: serviceFee,
        total: total,
        paymentMethod: payment.name || payment.type,
        paymentStatus: "Completed",
        customerName: user.user_metadata?.full_name || user.email || "Me",
        customerEmail: user.email,
      };

      setReceiptData(receiptData);
      toast.success("Payment successful. Your order is being prepared.");
      setShowPaymentDialog(false);
      setPaymentCredentials("");
      setShowReceipt(true);
    } catch {
      toast.error(
        "Unable to connect to payment service. Please try again later."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Menu
        </Button>
        <h1 className="text-slate-900 mb-1">Checkout</h1>
        <p className="text-slate-600 mb-3">
          {checkoutMode === "normal"
            ? "Review your order and complete payment"
            : "Review your order and start split bill"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pickup Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Cafeteria</span>
                <span className="text-slate-900">{cafeteria.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Location</span>
                <span className="text-slate-900">{cafeteria.location}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Pickup Time</span>
                <Badge className="bg-[oklch(40.8%_0.153_2.432)] text-white">
                  <Clock className="w-3 h-3 mr-1" />
                  {getPickupTimeLabel(pickupTime)}
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-[#fbf4fa] border border-[#e8c7d6]">
                <div className="flex items-center gap-2 text-[oklch(40.8%_0.153_2.432)]">
                  <Clock className="w-4 h-4" />
                  <p className="text-sm font-medium">
                    Estimated Preparation Time
                  </p>
                </div>
                <p className="text-sm text-[oklch(40.8%_0.153_2.432)] mt-1">
                  Ready in approximately 24 minutes
                </p>
                <p className="text-xs text-[oklch(40.8%_0.153_2.432)]">
                  Based on current queue and order volume
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>{cartItems.length} items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between py-2">
                  <div>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Checkout Options</CardTitle>
              <CardDescription>Choose how you want to pay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-100 rounded-full p-1 flex items-center gap-1">
                <button
                  type="button"
                  className={`flex-1 text-sm py-2 rounded-full transition ${
                    checkoutMode === "normal"
                      ? "bg-white shadow-sm font-semibold text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  onClick={() => setCheckoutMode("normal")}
                >
                  Normal Checkout
                </button>
                <button
                  type="button"
                  className={`flex-1 text-sm py-2 rounded-full transition ${
                    checkoutMode === "split"
                      ? "bg-white shadow-sm font-semibold text-[oklch(40.8%_0.153_2.432)]"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  onClick={() => {
                    setCheckoutMode("split");
                  }}
                  disabled={!onSplitBill}
                >
                  Split Bill
                </button>
              </div>
              <p className="text-sm text-slate-600">
                {checkoutMode === "normal"
                  ? "Pay the full amount by yourself."
                  : "Split the cost with your dining companions. Each person pays their portion."}
              </p>
            </CardContent>
          </Card>

          {checkoutMode === "normal" ? (
            <Card>
              <CardHeader className="flex justify-between">
                <div>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>
                    Select your preferred payment option
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddPaymentDialog(true)}
                >
                  Add New
                </Button>
              </CardHeader>
              <CardContent>
                {paymentMethods.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500 mb-4">
                      No payment methods found.
                    </p>
                    <Button onClick={() => setShowAddPaymentDialog(true)}>
                      Add Payment Method
                    </Button>
                  </div>
                ) : (
                  <RadioGroup
                    value={selectedPaymentId}
                    onValueChange={setSelectedPaymentId}
                    className="space-y-3"
                  >
                    {paymentMethods.map((pm) => (
                      <div
                        key={pm.id}
                        className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer ${
                          selectedPaymentId === pm.id
                            ? "border-[oklch(40.8%_0.153_2.432)] bg-[#fbf4fa]"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                        onClick={() => setSelectedPaymentId(pm.id)}
                      >
                        <RadioGroupItem value={pm.id} id={pm.id} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={pm.id}
                              className="cursor-pointer text-slate-900"
                            >
                              {pm.name}
                            </Label>
                            {pm.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">
                            {getPaymentTypeLabel(pm.type)} -{" "}
                            {pm.type === "fpx" || pm.type === "ewallet"
                              ? `Balance: RM ${pm.balance?.toFixed(2)}`
                              : `Limit: RM ${pm.credit_limit?.toFixed(2)}`}
                          </p>
                        </div>
                        <CreditCard className="w-5 h-5 text-slate-400" />
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Split Bill</CardTitle>
                <CardDescription>
                  Set up how the bill will be divided
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-[#f9eef2] border border-[#e8c7d6]">
                  <p className="text-[#7a0c3b] font-medium">
                    Split the bill with friends!
                  </p>
                  <p className="text-sm text-[#8a0f46]">
                    Share the cost with your dining companions. Each person pays
                    their portion.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Split Method</Label>
                  <select
                    className="w-full rounded-md border bg-input-background px-3 py-2 text-sm"
                    value={splitMethod}
                    onChange={(e) =>
                      setSplitMethod(e.target.value as "even" | "items")
                    }
                  >
                    <option value="even">Split Evenly</option>
                    <option value="items">Split by Items (coming soon)</option>
                  </select>
                  <p className="text-xs text-slate-600">
                    {splitMethod === "even"
                      ? "Total bill will be divided equally among all participants"
                      : "Assign items per participant (coming soon)"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Number of Participants</Label>
                  <select
                    className="w-full rounded-md border bg-input-background px-3 py-2 text-sm"
                    value={participantCount}
                    onChange={(e) =>
                      setParticipantCount(Math.max(1, Number(e.target.value)))
                    }
                  >
                    {[2, 3, 4, 5, 6].map((count) => (
                      <option key={count} value={count}>
                        {count} people
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-600">
                    Each person pays: RM {splitPerPerson.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Price Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>RM {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Service Fee</span>
                  <span>RM {serviceFee.toFixed(2)}</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between text-slate-900">
                <span>Total</span>
                <span>RM {total.toFixed(2)}</span>
              </div>
              <Button
                className="w-full text-white hover:opacity-90"
                style={{
                  backgroundColor:
                    checkoutMode === "normal"
                      ? "oklch(40.8% 0.153 2.432)"
                      : "oklch(40.8% 0.153 2.432)",
                }}
                onClick={
                  checkoutMode === "normal"
                    ? handlePlaceOrderClick
                    : () => onSplitBill?.(participantCount)
                }
                disabled={
                  checkoutMode === "normal"
                    ? !selectedPaymentId || isProcessing
                    : isProcessing
                }
              >
                {checkoutMode === "normal" ? (
                  placeOrderLabel
                ) : (
                  <span className="flex items-center gap-2 justify-center">
                    <Users className="w-4 h-4" />
                    Create Split Bill
                  </span>
                )}
              </Button>
              {checkoutMode === "normal" &&
                selectedPayment?.type === "card" && (
                  <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5" />
                    <p className="text-xs text-emerald-800">
                    CREDIT/DEBIT CARDS are auto-charged when you place your
                    order.
                  </p>
                </div>
              )}
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-800">
                  {checkoutMode === "normal"
                    ? "Your payment will be processed securely. Please collect your order at the specified pickup time."
                    : "Split bill will be created; participants pay individually after you proceed."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={showPaymentDialog}
        onOpenChange={(open) => {
          setShowPaymentDialog(open);
          if (!open) setPaymentCredentials("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              {requiresManualCredentials
                ? "Enter your PIN / credentials to process payment"
                : "This card will be charged automatically once you confirm."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Amount</span>
                <span className="text-slate-900">RM {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Payment Method</span>
                <span className="text-slate-900">
                  {paymentMethods.find((m) => m.id === selectedPaymentId)?.name}
                </span>
              </div>
            </div>

            {requiresManualCredentials ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="credentials">
                    Enter PIN to confirm payment
                  </Label>
                  <Input
                    id="credentials"
                    type="password"
                    placeholder="Enter PIN"
                    value={paymentCredentials}
                    onChange={(e) => setPaymentCredentials(e.target.value)}
                  />
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Demo mode: Enter your PIN / credentials to simulate payment
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5" />
                <p className="text-xs text-emerald-800">
                  This card supports auto-pay. We will charge it instantly once
                  you confirm.
                </p>
              </div>
            )}
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
              disabled={isProcessing}
              className="flex-1 text-white hover:opacity-90"
              style={{ backgroundColor: "oklch(40.8% 0.153 2.432)" }}
            >
              {isProcessing ? "Processing..." : confirmButtonLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAddPaymentDialog}
        onOpenChange={setShowAddPaymentDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Payment Method</DialogTitle>
            <DialogDescription>
              Add a payment method to use for your orders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <select
                className="w-full rounded-md border bg-input-background px-3 py-2 text-sm"
                value={newPaymentData.type}
                onChange={(e) =>
                  setNewPaymentData({
                    ...newPaymentData,
                    type: e.target.value as any,
                    name: "",
                    details: "",
                    cardNumber: "",
                    expiry: "",
                    securityCode: "",
                    pin: "",
                  })
                }
              >
                <option value="fpx">FPX</option>
                <option value="ewallet">E-WALLET</option>
                <option value="card">CREDIT/DEBIT CARD</option>
              </select>
            </div>

            {newPaymentData.type === "fpx" && (
              <>
                <div className="space-y-2">
                  <Label>Bank</Label>
                  <select
                    className="w-full rounded-md border bg-input-background px-3 py-2 text-sm"
                    value={newPaymentData.name}
                    onChange={(e) =>
                      setNewPaymentData({
                        ...newPaymentData,
                        name: e.target.value,
                      })
                    }
                  >
                    <option value="">Select bank</option>
                    <option value="Maybank">Maybank</option>
                    <option value="CIMB">CIMB</option>
                    <option value="Public Bank">Public Bank</option>
                    <option value="RHB">RHB</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    placeholder="e.g. 123456789012"
                    inputMode="numeric"
                    maxLength={16}
                    value={newPaymentData.details}
                    onChange={(e) =>
                      setNewPaymentData({
                        ...newPaymentData,
                        details: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>6-digit PIN</Label>
                  <Input
                    type="password"
                    placeholder="Enter your 6-digit PIN"
                    maxLength={6}
                    value={newPaymentData.pin}
                    onChange={(e) =>
                      setNewPaymentData({
                        ...newPaymentData,
                        pin: e.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}

            {newPaymentData.type === "ewallet" && (
              <>
                <div className="space-y-2">
                  <Label>E-WALLET</Label>
                  <select
                    className="w-full rounded-md border bg-input-background px-3 py-2 text-sm"
                    value={newPaymentData.name}
                    onChange={(e) =>
                      setNewPaymentData({
                        ...newPaymentData,
                        name: e.target.value,
                      })
                    }
                  >
                    <option value="">Select provider</option>
                    <option value="TnG">Touch 'n Go</option>
                    <option value="GrabPay">GrabPay</option>
                    <option value="ShopeePay">ShopeePay</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="012-345-6789"
                    value={newPaymentData.details}
                    onChange={(e) =>
                      setNewPaymentData({
                        ...newPaymentData,
                        details: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>6-digit PIN</Label>
                  <Input
                    type="password"
                    placeholder="Enter your 6-digit PIN"
                    maxLength={6}
                    value={newPaymentData.pin}
                    onChange={(e) =>
                      setNewPaymentData({
                        ...newPaymentData,
                        pin: e.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}

            {newPaymentData.type === "card" && (
              <>
                <div className="space-y-2">
                  <Label>Card Number</Label>
                  <Input
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    value={newPaymentData.cardNumber}
                    onChange={(e) =>
                      setNewPaymentData({
                        ...newPaymentData,
                        cardNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expiry (MM/YY)</Label>
                    <Input
                      placeholder="MM/YY"
                      maxLength={5}
                      value={newPaymentData.expiry}
                      onChange={(e) =>
                        setNewPaymentData({
                          ...newPaymentData,
                          expiry: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Security Code</Label>
                    <Input
                      type="password"
                      placeholder="3-digit CVV"
                      maxLength={3}
                      value={newPaymentData.securityCode}
                      onChange={(e) =>
                        setNewPaymentData({
                          ...newPaymentData,
                          securityCode: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowAddPaymentDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddNewPayment}
              className="flex-1 text-white hover:opacity-90"
              style={{ backgroundColor: "oklch(40.8% 0.153 2.432)" }}
            >
              Add Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showReceipt && receiptData && (
        <div className="fixed inset-0 z-50 bg-slate-100/90 backdrop-blur-sm overflow-y-auto pt-10">
          <DigitalReceipt
            receipt={receiptData}
            onClose={() => {
              setShowReceipt(false);
              setShowSuccessDialog(true);
            }}
          />
        </div>
      )}

      <Dialog
        open={showSuccessDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowSuccessDialog(false);
            onSuccess();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Successful</DialogTitle>
            <DialogDescription>Your order has been placed.</DialogDescription>
          </DialogHeader>


          <div className="mt-6 mb-6 text-center">
            <div className="bg-gradient-to-r from-[oklch(40.8%_0.153_2.432)] to-[oklch(40.8%_0.153_2.432)] rounded-xl p-6 text-white shadow-lg mx-auto max-w-sm">
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
            <div className="flex flex-col gap-2">
              <Button
                className="w-full text-white"
                style={{ backgroundColor: "oklch(40.8% 0.153 2.432)" }}
                onClick={() => {
                  setShowSuccessDialog(false);
                  onSuccess();
                }}
              >
                View My Orders
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
