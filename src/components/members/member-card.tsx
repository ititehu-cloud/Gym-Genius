'use client';

import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card";
import type { Member, Plan, Attendance } from "@/lib/types";
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { format, parseISO } from 'date-fns';
import { PhoneCall, Fingerprint, LoaderCircle, User, CreditCard, IdCard } from 'lucide-react';
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import EditMemberDialog from './edit-member-dialog';
import DeleteMemberDialog from './delete-member-dialog';
import { useFirestore } from '@/firebase';
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
};

export default function MemberCard({ member, plan, gymName, gymAddress, gymIconUrl, gymPhone, attendanceRecord, allMembers }: MemberCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [isPaymentOpen, setPaymentOpen] = useState(false);
  const [isWhatsAppDialogOpen, setWhatsAppDialogOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  
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
      let sharedUrl = null;

      toast({ title: "Sharing...", description: "Generating digital ID link..." });
      
      const elementToCapture = cardRef.current;
      if (!elementToCapture) throw new Error("Capture target missing");

      // Ensure fonts and images are ready
      await new Promise(resolve => setTimeout(resolve, 800));

      const canvas = await html2canvas(elementToCapture, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        width: 600,
      });

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.9));
      if (!blob) throw new Error("Image creation failed");

      const file = new File([blob], `${member.name}_id.png`, { type: 'image/png' });
      const formData = new FormData();
      formData.append('image', file);
      
      const uploadResult = await uploadImage(formData);
      if (!uploadResult.url) throw new Error("Upload failed");
      
      sharedUrl = uploadResult.url;
      updateDoc(doc(firestore, "members", member.id), { idCardUrl: sharedUrl });

      const message = `🏋️ ${gymName || 'Gym'} ID Card\n\n👤 Name: ${member.name.toUpperCase()}\n🆔 Member Id: ${member.memberId}\n📅 Joined: ${joinStr}\n📅 Expiry: ${expiryStr}\n\n🔗 View Card: ${sharedUrl}`;

      let sanitizedPhone = member.mobileNumber!.replace(/\D/g, '');
      if (sanitizedPhone.startsWith('0')) sanitizedPhone = sanitizedPhone.substring(1);
      if (sanitizedPhone.length === 10) sanitizedPhone = `91${sanitizedPhone}`;

      // Direct protocol usually bypasses the landing page on devices with WhatsApp installed
      const whatsappUrl = `whatsapp://send?phone=${sanitizedPhone}&text=${encodeURIComponent(message)}`;
      const webWhatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
      
      try {
        window.location.href = whatsappUrl;
      } catch (e) {
        window.open(webWhatsappUrl, '_blank');
      }
      
      setTimeout(() => { 
        if (document.hasFocus()) {
          window.open(webWhatsappUrl, '_blank');
        } 
      }, 1500);

    } catch (error) {
      console.error("Share error:", error);
      toast({ variant: "destructive", title: "Error", description: "Sharing failed. Please check your connection." });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCheckIn = async () => {
    setIsAttendanceLoading(true);
    try {
      await addDoc(collection(firestore, "attendance"), {
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

  return (
    <TooltipProvider>
      <Card className="relative w-full max-w-lg mx-auto shadow-lg rounded-2xl overflow-hidden flex flex-col bg-white border-2 border-primary/20 transition-all hover:shadow-xl hover:border-primary/30">
        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-primary/30 rounded-tr-2xl pointer-events-none" />
        <div className="absolute bottom-16 left-0 w-16 h-16 border-b-4 border-l-4 border-primary/30 rounded-bl-2xl pointer-events-none" />

        <div className="relative p-6 pb-4">
          <div className="absolute top-4 right-4 z-10">
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
                    <h3 className="text-2xl font-bold tracking-tight text-foreground transition-colors">{member.name}</h3>
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
                        <p className="text-base font-bold text-destructive">₹{status === 'active' ? '0' : (plan?.price || 'N/A')}</p>
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
            <CreditCard className="h-5 w-5 text-foreground" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Payment</span>
          </Button>

          <div className="h-full">
            <DeleteMemberDialog memberId={member.id} memberName={member.name} />
          </div>
        </div>
      </Card>

      <WhatsAppMessageDialog 
        member={member} 
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

      {/* DYNAMIC LANDSCAPE TEMPLATE */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={cardRef} style={{ width: '600px', backgroundColor: '#f5f6f7', padding: '0', borderRadius: '32px', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
            {/* Header with Logo on Left, Name & Address on Right */}
            <div style={{ backgroundColor: '#1e8177', padding: '30px 40px', display: 'flex', alignItems: 'center', gap: '24px', borderTopLeftRadius: '32px', borderTopRightRadius: '32px' }}>
                {gymIconUrl && (
                  <div style={{ width: '80px', height: '80px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img src={gymIconUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                  </div>
                )}
                <div style={{ flexGrow: 1 }}>
                    <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', margin: '0', marginBottom: '2px', textTransform: 'uppercase' }}>{gymName || 'Gym Name'}</h2>
                    <p style={{ fontSize: '16px', fontWeight: '500', color: 'rgba(255,255,255,0.9)', margin: '0', lineHeight: '1.2' }}>{gymAddress || ''}</p>
                    <p style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff', margin: '2px 0 0' }}>{gymPhone || ''}</p>
                </div>
            </div>

            {/* Profile Section - Landscape Row */}
            <div style={{ padding: '32px 40px', display: 'flex', alignItems: 'center', gap: '32px' }}>
                <div style={{ width: '110px', height: '110px', borderRadius: '50%', border: '4px solid #1e8177', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={member.imageUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                </div>
                <div style={{ flexGrow: 1 }}>
                    <h3 style={{ fontSize: '34px', fontWeight: 'bold', color: '#2d3436', margin: '0', marginBottom: '4px' }}>{member.name.toUpperCase()}</h3>
                    <p style={{ fontSize: '22px', color: '#636e72', fontWeight: '700', margin: '0' }}>ID: {member.memberId}</p>
                </div>
            </div>

            {/* Content Body */}
            <div style={{ padding: '0 40px 32px' }}>
                <div style={{ height: '1px', backgroundColor: '#dfe6e9', width: '100%', marginBottom: '24px' }} />
                
                <div style={{ display: 'flex', gap: '20px' }}>
                  {/* Plan Block */}
                  <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#000000', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>PLAN</span>
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#2d3436' }}>{planName}</span>
                  </div>

                  {/* Start Block */}
                  <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#000000', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>START</span>
                      <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', margin: '0' }}>{format(parseISO(member.joinDate), 'dd MMM yyyy')}</p>
                  </div>

                  {/* Expiry Block */}
                  <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#000000', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>EXPIRY</span>
                      <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: '0' }}>{format(parseISO(member.expiryDate), 'dd MMM yyyy')}</p>
                  </div>
                </div>
            </div>
          </div>
      </div>
    </TooltipProvider>
  );
}
