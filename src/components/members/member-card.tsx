'use client';

import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card";
import type { Member, Plan, Attendance, Payment } from "@/lib/types";
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { PhoneCall, Fingerprint, LoaderCircle, User, CreditCard, IdCard } from 'lucide-react';
import { useRef, useState, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import EditMemberDialog from './edit-member-dialog';
import DeleteMemberDialog from './delete-member-dialog';
import MemberDetailsDialog from './member-details-dialog';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { uploadImage } from '@/app/actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import RecordPaymentForm from '../payments/record-payment-form';
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Separator } from '../ui/separator';
import { WhatsAppIcon } from '../icons/whatsapp-icon';
import WhatsAppMessageDialog from './whatsapp-message-dialog';

type MemberCardProps = {
  member: Member;
  plan?: Plan;
  gymName?: string | null;
  gymAddress?: string;
  gymIconUrl?: string | null;
  gymPhone?: string | null;
  attendanceRecord?: Attendance;
  allMembers: Member[];
  payments: Payment[];
};

export default function MemberCard({ member, plan, gymName, gymAddress, gymIconUrl, gymPhone, attendanceRecord, allMembers, payments }: MemberCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [isPaymentOpen, setPaymentOpen] = useState(false);
  const [isDetailsOpen, setDetailsOpen] = useState(false);
  const [isWhatsAppDialogOpen, setWhatsAppDialogOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const getStatus = (): Member['status'] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = parseISO(member.expiryDate);
    if (expiry < today) {
      return 'expired';
    }
    return member.status;
  }

  const status = getStatus();
  const planName = plan?.name || 'N/A';
  const hasPhone = !!member.mobileNumber && member.mobileNumber.trim().length > 0 && member.mobileNumber !== 'N/A';

  const dueAmount = useMemo(() => {
    if (!plan) return 0;
    
    const joinDate = parseISO(member.joinDate);
    const expiryDate = parseISO(member.expiryDate);
    const leadTimeMs = 30 * 24 * 60 * 60 * 1000;
    const leadDate = new Date(joinDate.getTime() - leadTimeMs);

    const cyclePayments = payments.filter(p => {
        const pDate = parseISO(p.paymentDate);
        return pDate >= startOfDay(leadDate) && 
               pDate <= endOfDay(expiryDate) && 
               p.status === 'paid';
    });

    const totalPaid = cyclePayments.reduce((acc, p) => acc + p.amount, 0);
    return Math.max(0, plan.price - totalPaid);
  }, [member, plan, payments]);

  const handleShareId = async () => {
    if (isSharing) return;

    if (!hasPhone) {
      toast({
        variant: 'destructive',
        title: 'Share Failed',
        description: "Please update the member's profile with a mobile number to use WhatsApp sharing.",
      });
      return;
    }

    setIsSharing(true);

    try {
      const expiryStr = format(parseISO(member.expiryDate), 'dd MMM yyyy');
      const joinStr = format(parseISO(member.joinDate), 'dd MMM yyyy');
      let sharedUrl = member.idCardUrl;

      // If missing, generate it now
      if (!sharedUrl) {
        toast({ title: "Sharing...", description: "Generating digital ID link..." });
        
        const elementToCapture = cardRef.current;
        if (!elementToCapture) throw new Error("Capture target missing");

        await new Promise(resolve => setTimeout(resolve, 1000));

        const canvas = await html2canvas(elementToCapture, {
          useCORS: true,
          scale: 3,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
        if (!blob) throw new Error("Image creation failed");

        const file = new File([blob], `${member.name}_id.png`, { type: 'image/png' });
        const formData = new FormData();
        formData.append('image', file);
        
        const uploadResult = await uploadImage(formData);
        if (!uploadResult.url) throw new Error("Upload failed");
        
        sharedUrl = uploadResult.url;
        updateDoc(doc(firestore, "members", member.id), { idCardUrl: sharedUrl });
      }

      // Build WhatsApp message
      const message = `🏋️ ${gymName || 'Gym'} ID Card\n\n👤 Name: ${member.name.toUpperCase()}\n🆔 Member Id: ${member.memberId}\n📅 Joined: ${joinStr}\n📅 Expiry: ${expiryStr}\n\n🔗 View Card: ${sharedUrl}`;
      const encodedMsg = encodeURIComponent(message);

      // Clean phone number
      let sanitizedPhone = member.mobileNumber!.replace(/\D/g, '');
      if (sanitizedPhone.startsWith('0')) sanitizedPhone = sanitizedPhone.substring(1);
      if (sanitizedPhone.length === 10) sanitizedPhone = `91${sanitizedPhone}`;

      // Determine platform
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

      // Open WhatsApp directly
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
        title: "Opening WhatsApp...", 
        description: "Your ID card will be sent to the member." 
      });

    } catch (error) {
      console.error("Share error:", error);
      toast({ variant: "destructive", title: "Error", description: "Sharing failed. Please check your connection." });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;
    setIsAttendanceLoading(true);
    try {
      await addDoc(collection(firestore, "attendance"), {
        userId: user.uid,
        memberId: member.id,
        checkInTime: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
      toast({ title: "Checked In!", description: `${member.name} marked present.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Check-in failed." });
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!attendanceRecord) return;
    setIsAttendanceLoading(true);
    try {
      await updateDoc(doc(firestore, "attendance", attendanceRecord.id), {
        checkOutTime: new Date().toISOString()
      });
      toast({ title: "Checked Out!", description: `${member.name} marked out.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Check-out failed." });
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const isCheckedIn = attendanceRecord && !attendanceRecord.checkOutTime;
  const displayGymName = (gymName || 'Gym Name').replace(/ /g, '\u00a0');

  return (
    <TooltipProvider>
      <Card className="relative w-full max-w-lg mx-auto shadow-lg rounded-2xl overflow-hidden flex flex-col bg-white border-2 border-primary/20 transition-all hover:shadow-xl hover:border-primary/30">
        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-primary/30 rounded-tr-2xl pointer-events-none" />
        <div className="absolute bottom-16 left-0 w-16 h-16 border-b-4 border-l-4 border-primary/30 rounded-bl-2xl pointer-events-none" />

        <div 
          className="relative p-6 pb-4 cursor-pointer hover:bg-muted/5 transition-colors group/member-card"
          onClick={() => setDetailsOpen(true)}
        >
          <div className="absolute top-4 right-4 z-20" onClick={(e) => e.stopPropagation()}>
            <EditMemberDialog member={member} />
          </div>

          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0">
              <div className="h-24 w-24 rounded-full border-4 border-primary/10 overflow-hidden bg-muted relative">
                <Image src={member.imageUrl} alt={member.name} fill className="object-cover" />
              </div>
            </div>

            <div className="flex-grow space-y-4 pt-1">
                <div className="space-y-0.5">
                    <p className="text-sm font-medium text-muted-foreground leading-none">Name:</p>
                    <h3 className="text-2xl font-bold tracking-tight text-foreground transition-colors group-hover/member-card:text-primary">{member.name}</h3>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">M ID</p>
                        <p className="text-base font-semibold">{member.memberId}</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mobile:</p>
                        <p className="text-base font-semibold">{member.mobileNumber || "N/A"}</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plan Expiry:</p>
                        <p className="text-base font-bold text-green-600">{format(parseISO(member.expiryDate), 'dd MMM yyyy')}</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Due Amount:</p>
                        <p className={`text-base font-bold ${dueAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>₹{dueAmount}</p>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <Separator className="mx-6 w-auto bg-muted/40" />

        <div className="grid grid-cols-6 h-16 divide-x divide-muted/30 relative z-10 bg-white">
          <Button 
            variant="ghost" 
            className="flex flex-col gap-1 h-full rounded-none hover:bg-muted/30 text-muted-foreground"
            onClick={handleShareId}
            disabled={isSharing || !hasPhone}
          >
            {isSharing ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <IdCard className="h-5 w-5 text-foreground" />}
            <span className="text-[9px] font-bold uppercase tracking-tighter">ID Card</span>
          </Button>

          <Button 
            asChild 
            variant="ghost" 
            className="flex flex-col gap-1 h-full rounded-none hover:bg-muted/30 text-muted-foreground"
            disabled={!hasPhone}
          >
            {hasPhone ? (
              <a href={`tel:${member.mobileNumber}`} className="flex flex-col items-center justify-center gap-1">
                <PhoneCall className="h-5 w-5 text-foreground" />
                <span className="text-[9px] font-bold uppercase tracking-tighter">Call</span>
              </a>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 opacity-40">
                <PhoneCall className="h-5 w-5" />
                <span className="text-[9px] font-bold uppercase tracking-tighter">Call</span>
              </div>
            )}
          </Button>

          <Button 
            variant="ghost" 
            className="flex flex-col gap-1 h-full rounded-none hover:bg-muted/30 text-muted-foreground"
            onClick={() => setWhatsAppDialogOpen(true)}
            disabled={!hasPhone}
          >
            <WhatsAppIcon className="h-5 w-5 text-green-600" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Whatsapp</span>
          </Button>

          <Button 
            variant="ghost" 
            className="flex flex-col gap-1 h-full rounded-none hover:bg-muted/30 text-muted-foreground"
            onClick={() => isCheckedIn ? handleCheckOut() : handleCheckIn()}
            disabled={isAttendanceLoading || !!attendanceRecord?.checkOutTime}
          >
            {isAttendanceLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Fingerprint className={`h-5 w-5 ${isCheckedIn ? 'text-orange-600' : 'text-foreground'}`} />}
            <span className="text-[9px] font-bold uppercase tracking-tighter">Attendance</span>
          </Button>

          <Button 
            variant="ghost" 
            className="flex flex-col gap-1 h-full rounded-none hover:bg-muted/30 text-muted-foreground"
            onClick={() => setPaymentOpen(true)}
          >
            <CardContent className="p-0 flex flex-col items-center justify-center">
                <CreditCard className="h-5 w-5 text-foreground" />
                <span className="text-[9px] font-bold uppercase tracking-tighter">Payment</span>
            </CardContent>
          </Button>

          <div className="h-full">
            <DeleteMemberDialog memberId={member.id} memberName={member.name} />
          </div>
        </div>
      </Card>

      <MemberDetailsDialog 
        member={member} 
        plan={plan} 
        isOpen={isDetailsOpen} 
        onOpenChange={setDetailsOpen} 
      />

      <WhatsAppMessageDialog 
        member={member} 
        plan={plan}
        dueAmount={dueAmount}
        gymName={gymName} 
        isOpen={isWhatsAppDialogOpen} 
        onOpenChange={setWhatsAppDialogOpen} 
      />

      <Dialog open={isPaymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
            <DialogDescription>Recording a payment for {member.name}.</DialogDescription>
          </DialogHeader>
          <RecordPaymentForm members={allMembers} setDialogOpen={setPaymentOpen} defaultMemberId={member.id} />
        </DialogContent>
      </Dialog>

      {/* HIDDEN capture area */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={cardRef} style={{ padding: '40px', backgroundColor: '#ffffff' }}>
            <div style={{ 
              width: '650px', 
              backgroundColor: '#f8fafc', 
              borderRadius: '48px', 
              overflow: 'hidden', 
              fontFamily: 'Arial, sans-serif',
              border: '2px solid #e2e8f0',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
            }}>
              {/* Header */}
              <div style={{ backgroundColor: '#1e8177', padding: '40px 50px', display: 'flex', alignItems: 'center', gap: '30px' }}>
                  {gymIconUrl && (
                    <div style={{ width: '100px', height: '100px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                        <img src={gymIconUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                    </div>
                  )}
                  <div style={{ flexGrow: 1 }}>
                      <h2 style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff', margin: '0', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>{displayGymName}</h2>
                      <p style={{ fontSize: '18px', fontWeight: '500', color: 'rgba(255,255,255,0.9)', margin: '0', lineHeight: '1.3' }}>{gymAddress || ''}</p>
                      <p style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', margin: '4px 0 0' }}>{gymPhone || ''}</p>
                  </div>
              </div>

              {/* Member Section */}
              <div style={{ padding: '45px 50px', display: 'flex', alignItems: 'center', gap: '40px', backgroundColor: '#ffffff' }}>
                  <div style={{ width: '150px', height: '150px', borderRadius: '50%', border: '6px solid #1e8177', overflow: 'hidden', flexShrink: 0, boxShadow: '0 10px 20px rgba(0,0,0,0.05)', position: 'relative' }}>
                      <img 
                        src={member.imageUrl} 
                        alt={member.name} 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          position: 'absolute',
                          top: 0,
                          left: 0
                        }} 
                        crossOrigin="anonymous" 
                      />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                      <h3 style={{ fontSize: '48px', fontWeight: '900', color: '#0f172a', margin: '0', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '-1.5px' }}>{member.name}</h3>
                      <p style={{ fontSize: '30px', color: '#64748b', fontWeight: '700', margin: '0' }}>ID: {member.memberId}</p>
                  </div>
              </div>

              {/* Details Section */}
              <div style={{ padding: '0 50px 50px', backgroundColor: '#ffffff' }}>
                  <div style={{ height: '2px', backgroundColor: '#f1f5f9', width: '100%', marginBottom: '40px' }} />
                  
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>PLAN</span>
                        <span style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b' }}>{planName}</span>
                    </div>

                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>START</span>
                        <p style={{ fontSize: '28px', fontWeight: '900', color: '#16a34a', margin: '0' }}>{format(parseISO(member.joinDate), 'dd MMM yyyy')}</p>
                    </div>

                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>EXPIRY</span>
                        <p style={{ fontSize: '28px', fontWeight: '900', color: '#dc2626', margin: '0' }}>{format(parseISO(member.expiryDate), 'dd MMM yyyy')}</p>
                    </div>
                  </div>
              </div>
            </div>
          </div>
      </div>
    </TooltipProvider>
  );
}
