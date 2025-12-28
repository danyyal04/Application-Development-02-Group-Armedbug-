import { useState } from "react";
import { CreditCard, History, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import PaymentMethods from "./PaymentMethods";
import SplitBillInvitations from "../splitbill/SplitBillInvitations";
import TransactionHistory from "../transactions/TransactionHistory";

interface PaymentPageProps {
  onNavigateToSplitBillPayment?: (invitation: {
    splitBillId: string;
    totalAmount: number;
    myShare: number;
    cafeteria?: string;
  }) => void;
}

export default function PaymentPage({
  onNavigateToSplitBillPayment,
}: PaymentPageProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-slate-900 mb-2 flex items-center gap-2">
          Payment & Transactions
          <CreditCard className="w-6 h-6 text-slate-400" />
        </h1>
        <p className="text-slate-600">
          Manage your payment methods and view transaction history
        </p>
      </div>

      <Tabs defaultValue="methods" className="space-y-6">
        <div className="w-full bg-slate-100 p-1 rounded-xl inline-flex">
          <TabsList className="w-full justify-start bg-transparent p-0 gap-2">
            <TabsTrigger
              value="methods"
              className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-2.5"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Payment Methods
            </TabsTrigger>
            <TabsTrigger
              value="split-bills"
              className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-2.5"
            >
              <Users className="w-4 h-4 mr-2" />
              Pending Split Bills
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-2.5"
            >
              <History className="w-4 h-4 mr-2" />
              Transaction History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="methods" className="mt-0">
          <PaymentMethods />
        </TabsContent>

        <TabsContent value="split-bills" className="mt-0 space-y-4">
          <div>
            <h2 className="text-lg font-medium text-slate-900">
              Pending Split Bills
            </h2>
            <p className="text-slate-600 mb-6">
              Complete your payment for accepted split bill invitations
            </p>
            <SplitBillInvitations
              onNavigateToPayment={onNavigateToSplitBillPayment}
              viewMode="payment-only"
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <TransactionHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
