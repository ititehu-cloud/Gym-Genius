'use client';

import { useMemo, use } from "react";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import { LoaderCircle, ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentReceipt } from "@/components/payments/payment-receipt";
import type { Payment, Member } from "@/lib/types";
import Link from "next/link";
import { parseISO, startOfDay, endOfDay } from "date-fns";

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const firestore = useFirestore();

  // 1. Fetch the specific payment
  const paymentRef = useMemoFirebase(() => doc(firestore, "payments", id), [firestore, id]);
  const { data: payment, isLoading: isLoadingPayment } = useDoc<Payment>(paymentRef);

  // 2. Fetch the member associated with the payment
  const memberRef = useMemoFirebase(() => {
    if (!payment) return null;
    return doc(firestore, "members", payment.memberId);
  }, [firestore, payment]);
  const { data: member, isLoading: isLoadingMember } = useDoc<Member>(memberRef);

  // 3. Fetch all payments for this member's current cycle (for the receipt calculation)
  const paymentsQuery = useMemoFirebase(() => {
    if (!member) return null;
    // We fetch all paid payments to show the total history on the receipt
    return query(
      collection(firestore, "payments"),
      where("memberId", "==", member.id),
      where("status", "==", "paid")
    );
  }, [firestore, member]);
  const { data: allPayments, isLoading: isLoadingHistory } = useCollection<Payment>(paymentsQuery);

  const isLoading = isLoadingPayment || isLoadingMember || isLoadingHistory;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!payment || !member) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center gap-4">
        <h1 className="text-xl font-bold">Receipt Not Found</h1>
        <Link href="/payments">
          <Button>Back to Payments</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8 pb-24">
      <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between no-print">
        <Link href="/payments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <Button onClick={() => window.print()} size="sm">
          <Printer className="mr-2 h-4 w-4" />
          Print Now
        </Button>
      </div>

      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        <PaymentReceipt
          payment={payment}
          member={member}
          allPayments={allPayments || [payment]}
          gymName="Gym Genius" // Ideally fetch from UserProfile if needed
          gymAddress={member.address} // Fallback or fetch from profile
        />
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            padding: 0 !important;
          }
          .min-h-screen {
            min-height: auto !important;
            background: white !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
