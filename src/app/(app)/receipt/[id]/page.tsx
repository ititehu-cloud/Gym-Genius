
'use client';

import { useMemo, use } from "react";
import { useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import { LoaderCircle, ArrowLeft, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentReceipt } from "@/components/payments/payment-receipt";
import type { Payment, Member, UserProfile } from "@/lib/types";
import Link from "next/link";

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const paymentRef = useMemoFirebase(() => doc(firestore, "payments", id), [firestore, id]);
  const { data: payment, isLoading: isLoadingPayment } = useDoc<Payment>(paymentRef);

  const memberRef = useMemoFirebase(() => {
    if (!payment) return null;
    return doc(firestore, "members", payment.memberId);
  }, [firestore, payment]);
  const { data: member, isLoading: isLoadingMember } = useDoc<Member>(memberRef);

  const currentPaymentList = useMemo(() => {
    return payment ? [payment] : [];
  }, [payment]);

  const isLoading = isLoadingPayment || isLoadingMember;

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-0 sm:p-4">
      {/* Action Bar - Hidden during print */}
      <div className="w-full max-w-2xl px-4 py-6 flex items-center justify-between no-print">
        <Link href="/payments">
          <Button variant="ghost" size="sm" className="text-gray-500">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="bg-white">
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
      <div className="bg-white shadow-2xl rounded-none overflow-hidden mb-10 print-container">
        <PaymentReceipt
          payment={payment}
          member={member}
          allPayments={currentPaymentList}
          gymName={userProfile?.displayName || "Sardar Fitness"}
          gymAddress={userProfile?.displayAddress}
          gymIconUrl={userProfile?.icon}
          gymPhone={userProfile?.phoneNumber} 
        />
      </div>

      <style jsx global>{`
        @media print {
          /* Force core layout elements to disappear */
          header, 
          nav, 
          footer,
          aside,
          .no-print,
          [data-sidebar="trigger"],
          [data-sidebar="sidebar"],
          .flex-none {
            display: none !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Reset parent containers for continuous scroll */
          html, body, main, div[class*="min-h-screen"] {
            background: white !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }

          /* Optimize the print container for thermal rolls */
          .print-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
            position: relative !important;
          }
          
          @page {
            margin: 0;
            size: auto;
          }
          
          * {
            color: black !important;
            background: transparent !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            text-shadow: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
