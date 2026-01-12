import { CheckCircle, MapPin, Clock, CreditCard } from "lucide-react";
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

interface DigitalReceiptProps {
  receipt: ReceiptData;
  onClose?: () => void;
}

export default function DigitalReceipt({
  receipt,
  onClose,
}: DigitalReceiptProps) {
  // UC031 - NF: Display digital receipt with all order and payment details
  const normalizedMethod = receipt.paymentMethod.trim().toLowerCase();
  const formattedPaymentMethod = normalizedMethod.startsWith("split bill")
    ? "SPLIT BILL"
    : normalizedMethod === "e-wallet" || normalizedMethod === "ewallet"
    ? "E-WALLET"
    : normalizedMethod === "fpx" || normalizedMethod === "fpx banking"
    ? "FPX"
    : normalizedMethod === "debit/credit card" ||
      normalizedMethod === "credit/debit card"
    ? "CREDIT/DEBIT CARD"
    : receipt.paymentMethod;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Card className="shadow-lg">
        <CardHeader className="text-center border-b bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-slate-900 mb-2">Payment Successful! 🎉</h1>
            <CardDescription>Your order has been confirmed</CardDescription>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
            <Clock className="w-4 h-4" />
            <span>Estimated pickup: {receipt.time}</span>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Transaction Details */}
          <div className="mb-6">
            <h3 className="text-slate-900 mb-3">Transaction Details</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Transaction ID:</span>
                <span className="text-slate-900 font-mono">
                  {receipt.transactionId}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Order ID:</span>
                <span className="text-slate-900 font-mono">
                  {receipt.orderId}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Date & Time:</span>
                <span className="text-slate-900">
                  {receipt.date} at {receipt.time}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Payment Method:</span>
                <span className="text-slate-900">{formattedPaymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Queue Number:</span>
                <span className="text-slate-900 font-mono">
                  {receipt.queueNumber}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Status:</span>
                <Badge className="bg-green-100 text-green-700">
                  {receipt.paymentStatus}
                </Badge>
              </div>
            </div>
          </div>

          {/* Cafeteria Information */}
          <div className="mb-6">
            <h3 className="text-slate-900 mb-3">Pickup Location</h3>
            <div className="flex items-start gap-3 bg-slate-50 rounded-lg p-4">
              <MapPin className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-900">{receipt.cafeteriaName}</p>
                <p className="text-sm text-slate-600">
                  {receipt.cafeteriaLocation}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <h3 className="text-slate-900 mb-3">Order Summary</h3>
            <div className="space-y-3">
              {receipt.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-600">
                      Qty: {item.quantity} × RM {item.price.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-slate-900">
                    RM {item.subtotal.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Payment Breakdown */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal:</span>
              <span className="text-slate-900">
                RM {receipt.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Service Fee:</span>
              <span className="text-slate-900">
                RM {receipt.serviceFee.toFixed(2)}
              </span>
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between">
              <span className="text-slate-900">Total Paid:</span>
              <span className="text-slate-900">
                RM {receipt.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-purple-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-600 mb-1">Customer</p>
            <p className="text-slate-900">{receipt.customerName}</p>
            <p className="text-sm text-slate-600">{receipt.customerEmail}</p>
          </div>

          {/* Close Button */}
          {onClose && (
            <Button
              onClick={onClose}
              className="w-full bg-[#800000] text-white hover:bg-[#6b0000] hover:text-white"
            >
              Close Receipt
            </Button>
          )}

          {/* Footer Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Thank you for using UTMMunch! This receipt is stored in your
              Transaction History.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
