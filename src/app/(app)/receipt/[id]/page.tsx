'use client';

import { useMemo, use, useState } from "react";
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
  const [isPrinting, setIsPrinting] = useState(false);

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
    setIsPrinting(true);
    // Standard delay for print dialog to initialize correctly on mobile
    setTimeout(() => {
        window.print();
        setIsPrinting(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-0 sm:p-4 receipt-wrapper">
      {/* Action Bar - Hidden during print */}
      <div className="w-full max-w-2xl px-4 py-6 flex items-center justify-between no-print">
        <Link href="/payments">
          <Button variant="ghost" size="sm" className="text-gray-500">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="bg-white" disabled={isPrinting}>
                {isPrinting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
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
          /* Aggressive reset to isolate the receipt container and force it to the top */
          body > *:not(.receipt-wrapper) {
            display: none !important;
          }
          
          .no-print, header, nav, footer, [data-sidebar], button {
            display: none !important;
          }

          .receipt-wrapper {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            min-height: auto !important;
            width: 100% !important;
          }

          .print-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
            background: white !important;
          }

          /* Reset all parent containers to avoid layout issues */
          html, body {
            overflow: visible !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
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
          }
        }
      `}</style>
    </div>
  );
}
