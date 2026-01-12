import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { Button } from '../ui/button.js';
import { Separator } from '../ui/separator.js';
import { Badge } from '../ui/badge.js';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient.js';
import { RefreshCw } from 'lucide-react';

interface PaymentManagementProps {
  cafeteriaId?: string | null;
}

interface PaymentRecord {
  id: string;
  amount: number;
  paidAt: string;
  paymentMethod: string | null;
}

export default function PaymentManagement({ cafeteriaId }: PaymentManagementProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchPayments = async () => {
    if (!cafeteriaId) {
      setPayments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total_amount, paid_at, payment_method')
        .eq('cafeteria_id', cafeteriaId)
        .not('paid_at', 'is', null)
        .order('paid_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        amount: Number(row.total_amount) || 0,
        paidAt: row.paid_at,
        paymentMethod: row.payment_method,
      }));

      setPayments(mapped);
      setHasError(false);
    } catch (error) {
      setHasError(true);
      toast.error('Unable to load payment data. Please try again later.');
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cafeteriaId]);

  const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const todayRevenue = payments
    .filter(payment => {
      if (!payment.paidAt) return false;
      const paidDate = new Date(payment.paidAt);
      const today = new Date();
      return paidDate.getFullYear() === today.getFullYear()
        && paidDate.getMonth() === today.getMonth()
        && paidDate.getDate() === today.getDate();
    })
    .reduce((sum, payment) => sum + payment.amount, 0);

  const recentPayments = payments.slice(0, 5);

  const formatPaymentMethodLabel = (value: string | null) => {
    const normalized = (value || "Payment").trim().toLowerCase();
    if (normalized.startsWith("split bill")) return "SPLIT BILL";
    if (normalized === "e-wallet" || normalized === "ewallet") return "E-WALLET";
    if (normalized === "fpx" || normalized === "fpx banking") return "FPX";
    if (
      normalized === "debit/credit card" ||
      normalized === "credit/debit card"
    ) {
      return "CREDIT/DEBIT CARD";
    }
    return normalized.toUpperCase();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 mb-2">Manage Payments</h1>
          <p className="text-slate-600">Track tuition received for your cafeteria in real-time</p>
        </div>
        <Button
          variant="outline"
          onClick={fetchPayments}
          disabled={isLoading || !cafeteriaId}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {!cafeteriaId && (
        <Card className="mb-6">
          <CardContent className="py-6 text-center text-slate-600">
            No cafeteria is assigned to your profile yet. Link your cafeteria to start tracking real payments.
          </CardContent>
        </Card>
      )}

      {hasError && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">
            Unable to load payment information. Please try again later.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">RM {totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">All paid orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Today&apos;s Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">RM {todayRevenue.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">Paid today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Payments Received</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{payments.length}</p>
            <p className="text-xs text-slate-500 mt-1">Total paid orders</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>Latest paid orders</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-slate-500 py-6">Loading payments...</p>
          ) : recentPayments.length === 0 ? (
            <p className="text-center text-slate-500 py-6">No payments recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map(payment => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-3 border-b last:border-0 border-slate-100"
                >
                  <div>
                    <p className="text-sm text-slate-900">{`ORD-${payment.id.slice(-6).toUpperCase()}`}</p>
                    <p className="text-xs text-slate-500">
                      {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">RM {payment.amount.toFixed(2)}</p>
                    <Badge variant="secondary" className="mt-1">
                      {formatPaymentMethodLabel(payment.paymentMethod)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="my-6" />

      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
          <CardDescription>Complete list of paid orders</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-slate-500 py-6">Loading payments...</p>
          ) : payments.length === 0 ? (
            <p className="text-center text-slate-500 py-6">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="py-2">Order</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Paid At</th>
                    <th className="py-2">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(payment => (
                    <tr key={payment.id} className="border-t border-slate-100">
                      <td className="py-2 text-slate-900">{`ORD-${payment.id.slice(-6).toUpperCase()}`}</td>
                      <td className="py-2 text-slate-900">RM {payment.amount.toFixed(2)}</td>
                      <td className="py-2 text-slate-600">{payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '-'}</td>
                      <td className="py-2 text-slate-600">{formatPaymentMethodLabel(payment.paymentMethod)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




