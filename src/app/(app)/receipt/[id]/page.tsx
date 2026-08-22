'use client';

import { useMemo, use, useState, useRef } from "react";
import { useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import { LoaderCircle, ArrowLeft, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentReceipt } from "@/components/payments/payment-receipt";
import type { Payment, Member, UserProfile } from "@/lib/types";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { uploadImage } from "@/app/actions";

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

      // Ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 800));

      // Capture with user-specified settings
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
           // Standard for loop to iterate over HTMLCollection for maximum compatibility
           const images = clonedDoc.getElementsByTagName('img');
           for (let i = 0; i < images.length; i++) {
             const img = images[i];
             if (img.src) img.crossOrigin = 'anonymous';
           }
        }
      });

      // Convert to high-quality base64 JPEG
      const base64Data = canvas.toDataURL('image/jpeg', 0.95);
      const base64Image = base64Data.split(',')[1]; 

      // Upload the image to get a link
      const uploadResult = await uploadImage(base64Image);
      if (!uploadResult.url) throw new Error(uploadResult.error || "Failed to host receipt image");

      const imageUrl = uploadResult.url;
      const gymName = userProfile?.displayName || "Gym Genius";
      const message = `Hello ${member.name},\n\nThank you for your payment at ${gymName}.\n\nYou can view and download your digital receipt here:\n${imageUrl}\n\nStay Strong, Stay Fit!`;

      // Sanitize phone number
      let sanitizedPhone = member.mobileNumber.replace(/\D/g, '');
      if (sanitizedPhone.startsWith('0') && sanitizedPhone.length === 11) {
        sanitizedPhone = sanitizedPhone.substring(1);
      }
      if (sanitizedPhone.length === 10) {
        sanitizedPhone = `91${sanitizedPhone}`;
      }

      const whatsappUrl = `whatsapp://send?phone=${sanitizedPhone}&text=${encodeURIComponent(message)}`;
      
      // Attempt to open WhatsApp
      window.location.href = whatsappUrl;
      
      // Fallback for desktop/web
      setTimeout(() => {
        if (document.hasFocus()) {
          window.open(`https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`, '_blank');
        }
      }, 1000);

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
