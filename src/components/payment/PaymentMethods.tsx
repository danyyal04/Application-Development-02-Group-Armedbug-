import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Plus,
  Trash2,
  Star,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card.js";
import { Button } from "../ui/button.js";
import { Badge } from "../ui/badge.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "../ui/dialog.js";
import { Label } from "../ui/label.js";
import { Input } from "../ui/input.js";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui/select.js";
import { toast } from "sonner";
import { supabase } from "../../lib/supabaseClient.js";

interface PaymentMethod {
  id: string;
  type: "fpx" | "ewallet" | "card";
  name: string;
  details: string;
  pin: string;
  is_default: boolean;
  balance?: number;
  credit_limit?: number;
}

export default function PaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTopUpDialogOpen, setIsTopUpDialogOpen] = useState(false);
  const [topUpMethodId, setTopUpMethodId] = useState<string>("");
  const [topUpAmount, setTopUpAmount] = useState<string>("50");
  const [formData, setFormData] = useState({
    type: "fpx" as "fpx" | "ewallet" | "card",
    name: "",
    details: "",
    pin: "",
    cardNumber: "",
    expiry: "",
    securityCode: "",
  });

  const getPaymentTypeLabel = (type: PaymentMethod["type"]) => {
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

  const getFormattedDetails = (method: PaymentMethod) => {
    if (!method.details) return "";
    if (method.type === "card") {
      const [last4, expiry] = method.details.split("|");
      const formattedLast4 = last4 || "----";
      return `Card **** ${formattedLast4}${expiry ? ` · Exp ${expiry}` : ""}`;
    }
    if (method.type === "ewallet") {
      const phoneDigits = method.details.replace(/\D/g, "") || method.details;
      return `Phone ${phoneDigits}`;
    }
    const digits = method.details.replace(/\D/g, "") || method.details;
    const last4 = digits.slice(-4) || digits;
    return `Account **** ${last4}`;
  };

  const defaultMethod = paymentMethods.find((pm) => pm.is_default);
  const preferredBalance = defaultMethod?.balance ?? 0;
  const hasPreferredBalance = typeof defaultMethod?.balance === "number";
  const topUpEligibleMethods = paymentMethods.filter(
    (pm) => pm.type !== "card" && typeof pm.balance === "number"
  );
  const selectedTopUpMethod = topUpEligibleMethods.find(
    (pm) => pm.id === topUpMethodId
  );
  const parsedTopUpAmount = Number(topUpAmount);
  const isValidTopUpAmount =
    Number.isFinite(parsedTopUpAmount) && parsedTopUpAmount > 0;
  const topUpPreviewBalance = selectedTopUpMethod
    ? (selectedTopUpMethod.balance ?? 0) +
      (isValidTopUpAmount ? parsedTopUpAmount : 0)
    : 0;
  const recentMethod = paymentMethods[paymentMethods.length - 1];
  const supportedOptions = [
    {
      id: "fpx",
      title: "FPX",
      description:
        "Link Maybank, CIMB, Public Bank, RHB and more for instant transfers.",
    },
    {
      id: "ewallet",
      title: "E-WALLETS",
      description:
        "Connect Touch 'n Go, GrabPay or Boost for faster repeat checkouts.",
    },
    {
      id: "card",
      title: "CREDIT/DEBIT CARDS",
      description:
        "Use Visa or Mastercard with secure OTP verification and a RM500 instant limit.",
    },
  ];
  const safetyReminders = [
    {
      id: "encrypt",
      icon: ShieldCheck,
      title: "Bank-grade security",
      description:
        "Every PIN is encrypted and never stored in plain text on your device.",
    },
    {
      id: "backup",
      icon: Wallet,
      title: "Always have a backup",
      description:
        "Keep at least two payment methods so you can still pay if a channel is down.",
    },
  ];

  const fetchPayments = useCallback(async () => {
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
    setPaymentMethods(data as PaymentMethod[]);
  }, []);

  // Fetch payment methods
  useEffect(() => {
    fetchPayments();

    // Subscribe to real-time payment method changes
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
          () => {
            fetchPayments();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    })();
  }, [fetchPayments]);

  const handleAddPaymentMethod = async () => {
    const sanitizedCard = formData.cardNumber.replace(/\D/g, "");
    const sanitizedAccount = formData.details.replace(/\D/g, "");
    const sanitizedPhone = formData.details.replace(/\D/g, "");
    const expiryPattern = /^(0[1-9]|1[0-2])\/\d{2}$/;
    const cvvPattern = /^\d{3}$/;
    const sixDigitPinPattern = /^\d{6}$/;

    if (formData.type === "card") {
      if (
        sanitizedCard.length < 12 ||
        !expiryPattern.test(formData.expiry) ||
        !cvvPattern.test(formData.securityCode)
      ) {
        toast.error("Invalid payment information.");
        return;
      }
    } else if (formData.type === "fpx") {
      if (
        !formData.name ||
        sanitizedAccount.length < 10 ||
        !sixDigitPinPattern.test(formData.pin)
      ) {
        toast.error("Invalid payment information.");
        return;
      }
    } else if (formData.type === "ewallet") {
      if (
        !formData.name ||
        sanitizedPhone.length < 9 ||
        !sixDigitPinPattern.test(formData.pin)
      ) {
        toast.error("Invalid payment information.");
        return;
      }
    } else if (!formData.name || !formData.details || !formData.pin) {
      toast.error("Invalid payment information.");
      return;
    }

    const resolvedName =
      formData.type === "card" && !formData.name.trim()
        ? "Credit/Debit Card"
        : formData.name;

    const candidateDetails =
      formData.type === "card"
        ? `${sanitizedCard.slice(-4)}|${formData.expiry}`
        : formData.type === "fpx"
        ? sanitizedAccount
        : sanitizedPhone || formData.details;

    const duplicateExists = paymentMethods.some(
      (pm) =>
        pm.type === formData.type &&
        pm.name === resolvedName &&
        pm.details === candidateDetails
    );
    if (duplicateExists) {
      toast.error("This payment method is already exist");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return toast.error("User not logged in");

    const payload: any = {
      user_id: user.id,
      type: formData.type,
      name: resolvedName,
      details: candidateDetails,
      pin: formData.type === "card" ? formData.securityCode : formData.pin,
      is_default: paymentMethods.length === 0,
      balance: formData.type === "card" ? null : 100,
      credit_limit: formData.type === "card" ? 500 : null,
    };

    try {
      const { data, error } = await supabase
        .from("payment")
        .insert([payload])
        .select()
        .single();

      if (error) {
        toast.error("Unable to save payment method. Please try again later.");
        return;
      }

      setPaymentMethods([...paymentMethods, data as PaymentMethod]);
      setIsAddDialogOpen(false);
      setFormData({
        type: "fpx",
        name: "",
        details: "",
        pin: "",
        cardNumber: "",
        expiry: "",
        securityCode: "",
      });
      toast.success("Payment method added successfully.");
    } catch (err) {
      toast.error("Unable to save payment method. Please try again later.");
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    const { error } = await supabase.from("payment").delete().eq("id", id);
    if (error)
      return toast.error(
        "Unable to process changes at the moment. Please try again later."
      );
    setPaymentMethods(paymentMethods.filter((pm) => pm.id !== id));
    toast.success("Payment method updated successfully.");
  };

  const handleSetDefault = async (id: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: clearError } = await supabase
      .from("payment")
      .update({ is_default: false })
      .eq("user_id", user.id);
    if (clearError)
      return toast.error(
        "Unable to process changes at the moment. Please try again later."
      );
    const { error: setError } = await supabase
      .from("payment")
      .update({ is_default: true })
      .eq("id", id);
    if (setError)
      return toast.error(
        "Unable to process changes at the moment. Please try again later."
      );
    setPaymentMethods(
      paymentMethods.map((pm) => ({ ...pm, is_default: pm.id === id }))
    );
    toast.success("Payment method updated successfully.");
  };

  const handleOpenTopUp = () => {
    if (topUpEligibleMethods.length === 0) {
      toast.error("No FPX or E-WALLET accounts available for top up.");
      return;
    }
    const preferred =
      topUpEligibleMethods.find((pm) => pm.is_default) ||
      topUpEligibleMethods[0];
    setTopUpMethodId(preferred?.id || "");
    setTopUpAmount("50");
    setIsTopUpDialogOpen(true);
  };

  const handleConfirmTopUp = async () => {
    if (!selectedTopUpMethod) {
      toast.error("Please select an account to top up.");
      return;
    }
    if (!isValidTopUpAmount) {
      toast.error("Please enter a valid top up amount.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("User not logged in");
      return;
    }

    const newBalance = (selectedTopUpMethod.balance ?? 0) + parsedTopUpAmount;
    const { error: updateError } = await supabase
      .from("payment")
      .update({ balance: newBalance })
      .eq("id", selectedTopUpMethod.id);

    if (updateError) {
      toast.error("Unable to top up at the moment. Please try again later.");
      return;
    }

    setPaymentMethods((prev) =>
      prev.map((pm) =>
        pm.id === selectedTopUpMethod.id ? { ...pm, balance: newBalance } : pm
      )
    );

    const { error: topUpError } = await supabase.from("payment_topups").insert([
      {
        user_id: user.id,
        payment_id: selectedTopUpMethod.id,
        amount: parsedTopUpAmount,
        balance_before: selectedTopUpMethod.balance ?? 0,
        balance_after: newBalance,
      },
    ]);

    if (topUpError) {
      console.warn("Failed to log top up", topUpError);
    }

    toast.success("Top up successful.");
    setIsTopUpDialogOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 mb-2">Payment Methods</h1>
          <p className="text-slate-600">
            Manage every saved option for faster checkout
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleOpenTopUp}
            className="text-white hover:opacity-90"
            style={{ backgroundColor: "oklch(40.8% 0.153 2.432)" }}
          >
            <Plus className="w-4 h-4 mr-2" /> Top Up Balance
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="text-white hover:opacity-90"
                style={{ backgroundColor: "oklch(40.8% 0.153 2.432)" }}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Payment Method
              </Button>
            </DialogTrigger>
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
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) =>
                      setFormData({
                        ...formData,
                        type: value,
                        name: "",
                        details: "",
                        pin: "",
                        cardNumber: "",
                        expiry: "",
                        securityCode: "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fpx">FPX</SelectItem>
                      <SelectItem value="ewallet">E-WALLET</SelectItem>
                      <SelectItem value="card">CREDIT/DEBIT CARD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === "fpx" && (
                  <>
                    <div className="space-y-2">
                      <Label>Bank</Label>
                      <Select
                        value={formData.name}
                        onValueChange={(val: string) =>
                          setFormData({ ...formData, name: val })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Maybank">Maybank</SelectItem>
                          <SelectItem value="CIMB">CIMB</SelectItem>
                          <SelectItem value="Public Bank">
                            Public Bank
                          </SelectItem>
                          <SelectItem value="RHB">RHB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input
                        placeholder="e.g. 123456789012"
                        inputMode="numeric"
                        maxLength={16}
                        value={formData.details}
                        onChange={(e) =>
                          setFormData({ ...formData, details: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>6-digit PIN</Label>
                      <Input
                        type="password"
                        placeholder="Enter your 6-digit PIN"
                        maxLength={6}
                        value={formData.pin}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pin: e.target.value.slice(0, 6),
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {formData.type === "ewallet" && (
                  <>
                    <div className="space-y-2">
                      <Label>E-WALLET</Label>
                      <Select
                        value={formData.name}
                        onValueChange={(val: string) =>
                          setFormData({ ...formData, name: val })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TnG">Touch 'n Go</SelectItem>
                          <SelectItem value="GrabPay">GrabPay</SelectItem>
                          <SelectItem value="Boost">Boost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        placeholder="012-345-6789"
                        inputMode="numeric"
                        value={formData.details}
                        onChange={(e) =>
                          setFormData({ ...formData, details: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>6-digit PIN</Label>
                      <Input
                        type="password"
                        placeholder="Enter your 6-digit PIN"
                        maxLength={6}
                        value={formData.pin}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pin: e.target.value.slice(0, 6),
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {formData.type === "card" && (
                  <>
                    <div className="space-y-2">
                      <Label>Card Number</Label>
                      <Input
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        value={formData.cardNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
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
                          value={formData.expiry}
                          onChange={(e) =>
                            setFormData({ ...formData, expiry: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Security Code</Label>
                        <Input
                          type="password"
                          placeholder="3-digit CVV"
                          maxLength={3}
                          value={formData.securityCode}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              securityCode: e.target.value.slice(0, 3),
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="text-white hover:opacity-90"
                  style={{ backgroundColor: "oklch(40.8% 0.153 2.432)" }}
                  onClick={handleAddPaymentMethod}
                >
                  Add Method
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-slate-200 bg-slate-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">
              Saved methods
            </CardTitle>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              {paymentMethods.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {paymentMethods.length
                ? "Ready for one-tap checkout"
                : "Add one to start placing orders"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">
              Default method
            </CardTitle>
            <Star className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-slate-900 font-semibold">
              {defaultMethod ? defaultMethod.name : "Not set yet"}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {defaultMethod
                ? getPaymentTypeLabel(defaultMethod.type)
                : "Pick your go-to option"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">
              Stored balance
            </CardTitle>
            <Wallet className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-slate-900">
              RM {preferredBalance.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {hasPreferredBalance
                ? `Linked to ${defaultMethod?.name ?? "preferred method"}`
                : "Set a default FPX or e-wallet to track available funds"}
            </p>
          </CardContent>
        </Card>
      </div>

      {paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-6">
            <div>
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h2 className="text-slate-900 text-lg mb-2">
                No payment methods found. Please add one before managing.
              </h2>
              <p className="text-slate-500">
                Link your first method to unlock seamless payments across UTM
                cafeterias.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              {[
                "Select a payment type",
                "Add the last 4 digits or phone",
                "Protect it with a PIN",
              ].map((step, index) => (
                <div
                  key={step}
                  className="p-4 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <p className="text-sm text-slate-500 mb-1">
                    Step {index + 1}
                  </p>
                  <p className="text-sm text-slate-800 font-medium">{step}</p>
                </div>
              ))}
            </div>
            <Button
              className="text-white hover:opacity-90"
              style={{ backgroundColor: "oklch(40.8% 0.153 2.432)" }}
              onClick={() => setIsAddDialogOpen(true)}
            >
              Link a payment method
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paymentMethods.map((pm) => (
            <Card
              key={pm.id}
              className={pm.is_default ? "border-slate-300 bg-slate-50" : ""}
            >
              <CardContent className="py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2 items-center mb-1">
                      <p className="font-medium text-slate-900">{pm.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {getPaymentTypeLabel(pm.type)}
                      </Badge>
                      {pm.is_default && (
                        <Badge className="text-white bg-purple-600">
                          <Star className="w-3 h-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                    {pm.details && (
                      <p className="text-sm text-slate-600">
                        {getFormattedDetails(pm)}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
                      {pm.balance != null && (
                        <span>Balance: RM {pm.balance.toFixed(2)}</span>
                      )}
                      {pm.type === "card" && pm.credit_limit != null && (
                        <span>
                          Credit limit: RM {pm.credit_limit.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!pm.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(pm.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeletePaymentMethod(pm.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
        {safetyReminders.map((reminder) => {
          const Icon = reminder.icon;
          return (
            <Card key={reminder.id} className="border-slate-200">
              <CardContent className="flex gap-4 items-start pt-6">
                <div className="p-3 rounded-full bg-slate-50 border border-slate-100">
                  <Icon className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-slate-900 font-medium mb-1">
                    {reminder.title}
                  </p>
                  <p className="text-sm text-slate-600">
                    {reminder.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-10">
        <h2 className="text-slate-900 mb-4">Supported payment partners</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {supportedOptions.map((option) => (
            <Card key={option.id} className="border-slate-200">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-slate-500 mb-2">
                  {option.id.toUpperCase()}
                </p>
                <p className="text-slate-900 font-semibold">{option.title}</p>
                <p className="text-sm text-slate-600 mt-2">
                  {option.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isTopUpDialogOpen} onOpenChange={setIsTopUpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top Up Balance</DialogTitle>
            <DialogDescription>
              Add money to your FPX or E-WALLET account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Account to Top Up</Label>
              <Select value={topUpMethodId} onValueChange={setTopUpMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {topUpEligibleMethods.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.name} ({getPaymentTypeLabel(pm.type)}) - RM{" "}
                      {(pm.balance ?? 0).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTopUpMethod && (
              <Card className="border-[#e8c7d6] bg-[#f9eef2]">
                <CardContent className="pt-4">
                  <p className="text-xs text-[#7a0c3b] mb-1">Current Balance</p>
                  <p className="text-2xl text-[#7a0c3b]">
                    RM {(selectedTopUpMethod.balance ?? 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-[#7a0c3b] mt-1">
                    {selectedTopUpMethod.name}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>Top Up Amount (RM)</Label>
              <Input
                type="number"
                min="1"
                inputMode="decimal"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Quick Amounts</Label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 50, 100].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => setTopUpAmount(String(amount))}
                  >
                    RM {amount}
                  </Button>
                ))}
              </div>
            </div>

            {selectedTopUpMethod && isValidTopUpAmount && (
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="pt-4">
                  <p className="text-xs text-emerald-700 mb-1">
                    New Balance After Top Up
                  </p>
                  <p className="text-2xl text-emerald-900">
                    RM {topUpPreviewBalance.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsTopUpDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="text-white hover:opacity-90"
              style={{ backgroundColor: "oklch(40.8% 0.153 2.432)" }}
              onClick={handleConfirmTopUp}
              disabled={!selectedTopUpMethod || !isValidTopUpAmount}
            >
              <Plus className="w-4 h-4 mr-2" /> Top Up Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
