
'use client';

import { useMemo, use } from "react";
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import { LoaderCircle, ArrowLeft, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentReceipt } from "@/components/payments/payment-receipt";
import type { Payment, Member, UserProfile } from "@/lib/types";
import Link from "next/link";

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const firestore = useFirestore();
  const { user } = useUser();

  // 1. Fetch Gym/User Profile for Header
  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  // 2. Fetch the specific payment
  const paymentRef = useMemoFirebase(() => doc(firestore, "payments", id), [firestore, id]);
  const { data: payment, isLoading: isLoadingPayment } = useDoc<Payment>(paymentRef);

  // 3. Fetch the member associated with the payment
  const memberRef = useMemoFirebase(() => {
    if (!payment) return null;
    return doc(firestore, "members", payment.memberId);
  }, [firestore, payment]);
  const { data: member, isLoading: isLoadingMember } = useDoc<Member>(memberRef);

  // 4. Fetch the specific payment's details for historical context in the table
  const paymentsQuery = useMemoFirebase(() => {
    if (!payment) return null;
    // We show only the current transaction in the table to match screenshot
    return query(
      collection(firestore, "payments"),
      where("id", "==", payment.id)
    );
  }, [firestore, payment]);
  const { data: currentPaymentList, isLoading: isLoadingHistory } = useCollection<Payment>(paymentsQuery);

  const isLoading = isLoadingPayment || isLoadingMember || isLoadingHistory;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!payment || !member) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center gap-4 bg-white">
        <h1 className="text-xl font-bold">Receipt Not Found</h1>
        <Link href="/payments">
          <Button>Back to Payments</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Action Bar */}
      <div className="w-full max-w-2xl px-4 py-6 flex items-center justify-between no-print">
        <Link href="/payments">
          <Button variant="ghost" size="sm" className="text-gray-500">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="bg-white">
                <Printer className="mr-2 h-4 w-4" />
                Print
            </Button>
            <Button size="sm" onClick={() => {
                if (navigator.share) {
                    navigator.share({
                        title: 'Gym Receipt',
                        text: `Receipt for ${member.name}`,
                        url: window.location.href
                    });
                }
            }}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
            </Button>
        </div>
      </div>

      {/* Main Receipt Content */}
      <div className="bg-white shadow-2xl rounded-lg overflow-hidden border border-gray-100 mb-20">
        <PaymentReceipt
          payment={payment}
          member={member}
          allPayments={currentPaymentList || [payment]}
          gymName={userProfile?.displayName || "Gym Genius"}
          gymAddress={userProfile?.displayAddress}
          gymIconUrl={userProfile?.icon}
          gymPhone={userProfile?.phoneNumber} 
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
            margin: 0 !important;
          }
          .min-h-screen {
            min-height: auto !important;
            background: white !important;
            padding: 0 !important;
          }
          .shadow-2xl {
            box-shadow: none !important;
          }
          .border {
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
