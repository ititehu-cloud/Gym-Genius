'use client';

import { useMemo, use, useState, useRef } from "react";
import { useFirestore, useDoc, useMemoFirebase, useUser, useCollection } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import { LoaderCircle, ArrowLeft, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentReceipt } from "@/components/payments/payment-receipt";
import type { Payment, Member, UserProfile, Plan } from "@/lib/types";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { uploadImage } from "@/app/actions";
import { parseISO, startOfDay, endOfDay } from "date-fns";

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  const receiptRef = useRef<HTMLDivElement>(null);

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

  const planRef = useMemoFirebase(() => {
    if (!member) return null;
    return doc(firestore, "plans", member.planId);
  }, [firestore, member]);
  const { data: plan } = useDoc<Plan>(planRef);

  const memberPaymentsQuery = useMemoFirebase(() => {
    if (!member || !user) return null;
    return query(
      collection(firestore, "payments"),
      where("userId", "==", user.uid),
      where("memberId", "==", member.id),
      where("status", "==", "paid")
    );
  }, [firestore, member, user]);
  const { data: memberPayments } = useCollection<Payment>(memberPaymentsQuery);

  const dueAmount = useMemo(() => {
    if (!member || !plan || !memberPayments) return 0;
    
    const joinDate = parseISO(member.joinDate);
    const expiryDate = parseISO(member.expiryDate);
    const leadTimeMs = 30 * 24 * 60 * 60 * 1000;
    const leadDate = new Date(joinDate.getTime() - leadTimeMs);

    const cyclePayments = memberPayments.filter(p => {
        const pDate = parseISO(p.paymentDate);
        return pDate >= startOfDay(leadDate) && 
               pDate <= endOfDay(expiryDate);
    });

    const totalPaid = cyclePayments.reduce((acc, p) => acc + p.amount, 0);
    return Math.max(0, plan.price - totalPaid);
  }, [member, plan, memberPayments]);

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
    setTimeout(() => {
        window.print();
        setIsPrinting(false);
    }, 500);
  };

  const handleShare = async () => {
    if (isSharing) return;

    if (!member.mobileNumber || member.mobileNumber === 'N/A') {
      toast({
        variant: "destructive",
        title: "No Mobile Number",
        description: "Please update the member's profile with a valid mobile number to share via WhatsApp.",
      });
      return;
    }

    setIsSharing(true);
    toast({ title: "Sharing...", description: "Generating digital receipt image..." });

    try {
      const element = receiptRef.current;
      if (!element) throw new Error("Receipt element not found");

      await new Promise(resolve => setTimeout(resolve, 800));

      const canvas = await html2canvas(element, {
        width: 400,               
        height: element.offsetHeight,           
        scale: 2,                 
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 400,         
        onclone: (clonedDoc) => {
           const images = clonedDoc.getElementsByTagName('img');
           for (let i = 0; i < images.length; i++) {
             const img = images[i];
             if (img.src) img.crossOrigin = 'anonymous';
           }
        }
      });

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (!blob) throw new Error("Image creation failed");

      const file = new File([blob], `receipt_${payment.id}.jpg`, { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('image', file);

      const uploadResult = await uploadImage(formData);
      if (!uploadResult.url) throw new Error(uploadResult.error || "Failed to host receipt image");

      const imageUrl = uploadResult.url;
      const gymName = userProfile?.displayName || "Gym Genius";
      const message = `Hello ${member.name},\n\nThank you for your payment at ${gymName}.\n\nYou can view and download your digital receipt here:\n${imageUrl}\n\nStay Strong, Stay Fit!`;
      const encodedMsg = encodeURIComponent(message);

      // Clean phone number
      let sanitizedPhone = member.mobileNumber.replace(/\D/g, '');
      if (sanitizedPhone.startsWith('0')) sanitizedPhone = sanitizedPhone.substring(1);
      if (sanitizedPhone.length === 10) sanitizedPhone = `91${sanitizedPhone}`;

      // Platform specific deep-linking
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      let whatsappUrl;
      if (isIOS) {
        whatsappUrl = `whatsapp://send?phone=${sanitizedPhone}&text=${encodedMsg}`;
      } else if (isMobile) {
        whatsappUrl = `https://api.whatsapp.com/send/?phone=${sanitizedPhone}&text=${encodedMsg}&app_absent=0&type=phone_number`;
      } else {
        whatsappUrl = `https://web.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodedMsg}`;
      }

      if (isIOS) {
        window.location.href = whatsappUrl;
        setTimeout(() => {
          if (document.hasFocus()) {
            window.location.href = `https://wa.me/${sanitizedPhone}?text=${encodedMsg}`;
          }
        }, 500);
      } else {
        const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        if (!newWindow || newWindow.closed) {
          window.location.href = `https://wa.me/${sanitizedPhone}?text=${encodedMsg}`;
        }
      }

      toast({
        title: "Ready to Send",
        description: "WhatsApp has been opened with your receipt link.",
      });

    } catch (error: any) {
      console.error("Share error:", error);
      toast({
        variant: "destructive",
        title: "Share Failed",
        description: error.message || "Could not generate or share the receipt image.",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-0 sm:p-4 receipt-wrapper">
      <div className="w-full max-w-[400px] px-4 py-6 flex items-center justify-between no-print">
        <Link href="/payments">
          <Button variant="ghost" size="sm" className="text-gray-500">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="bg-white" disabled={isPrinting || isSharing}>
                {isPrinting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                Print
            </Button>
            <Button size="sm" onClick={handleShare} disabled={isSharing || isPrinting}>
                {isSharing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                Share
            </Button>
        </div>
      </div>

      <div className="bg-white shadow-xl rounded-none overflow-hidden mb-10 print-container">
        <PaymentReceipt
          ref={receiptRef}
          payment={payment}
          member={member}
          allPayments={currentPaymentList}
          dueAmount={dueAmount}
          gymName={userProfile?.displayName}
          gymAddress={userProfile?.displayAddress}
          gymIconUrl={userProfile?.icon}
          gymPhone={userProfile?.phoneNumber} 
        />
      </div>

      <style jsx global>{`
        @media print {
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
            width: 400px !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
            background: white !important;
          }

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
