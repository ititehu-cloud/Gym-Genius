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
  attendanceRecord?: Attendance;
  allMembers: Member[];
};

export default function MemberCard({ member, plan, gymName, gymAddress, gymIconUrl, attendanceRecord, allMembers }: MemberCardProps) {
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
      let sharedUrl = member.idCardUrl || null;

      if (!sharedUrl) {
        toast({ title: "Sharing...", description: "Generating digital ID link..." });
        
        const elementToCapture = cardRef.current;
        if (!elementToCapture) throw new Error("Capture target missing");

        const canvas = await html2canvas(elementToCapture, {
          useCORS: true,
          scale: 1.2,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.8));
        if (!blob) throw new Error("Image creation failed");

        const file = new File([blob], `${member.name}_id.png`, { type: 'image/png' });
        const formData = new FormData();
        formData.append('image', file);
        
        const uploadResult = await uploadImage(formData);
        if (!uploadResult.url) throw new Error("Upload failed");
        
        sharedUrl = uploadResult.url;
        updateDoc(doc(firestore, "members", member.id), { idCardUrl: sharedUrl });
      }

      const message = `🏋️ ${gymName || 'Gym'} ID Card\n\n👤 Name: ${member.name.toUpperCase()}\n🆔 Member Id: ${member.memberId}\n📅 Joined: ${joinStr}\n📅 Expiry: ${expiryStr}\n\n🔗 View Card: ${sharedUrl}`;

      let sanitizedPhone = member.mobileNumber!.replace(/\D/g, '');
      if (sanitizedPhone.startsWith('0')) sanitizedPhone = sanitizedPhone.substring(1);
      if (sanitizedPhone.length === 10) sanitizedPhone = `91${sanitizedPhone}`;

      const whatsappUrl = `whatsapp://send?phone=${sanitizedPhone}&text=${encodeURIComponent(message)}`;
      
      window.location.href = whatsappUrl;
      
      setTimeout(() => { 
        if (document.hasFocus()) {
          window.open(`https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`, '_blank');
        } 
      }, 1000);

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
        {/* Top Right Decorative Accent */}
        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-primary/30 rounded-tr-2xl pointer-events-none" />
        {/* Bottom Left Decorative Accent */}
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

      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={cardRef} className="p-4 bg-white pb-12 w-[400px] text-black">
            <div className="flex items-center bg-primary text-primary-foreground -m-4 mb-4 p-4">
                <div className="flex items-center gap-3 w-full">
                  {gymIconUrl && (
                    <div className="relative h-20 w-20 rounded-md bg-white overflow-hidden flex-shrink-0 p-1 border-2 border-black flex items-center justify-center">
                        <img src={gymIconUrl} alt="Logo" className="h-full w-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold uppercase">{gymName || 'Your Gym'}</h2>
                    <p className="text-[10px] opacity-80 uppercase">{gymAddress || ''}</p>
                  </div>
                </div>
            </div>
            <div className="flex flex-col items-center">
                <div className="relative h-40 w-40 rounded-md overflow-hidden border-4 border-primary mb-4 bg-muted">
                    <img src={member.imageUrl} alt={member.name} className="h-full w-full object-cover" />
                </div>
                <h3 className="text-4xl font-black mb-4 uppercase tracking-tight text-center px-2">{member.name}</h3>
                <p className="text-xl font-bold mb-6">Member Id: {member.memberId}</p>
                <div className="w-full space-y-2 text-lg text-left border-t-2 border-black pt-4 font-bold">
                    <div className="flex justify-between uppercase"><span>Plan Type</span> <span>{planName}</span></div>
                    <div className="flex justify-between uppercase"><span>Mobile</span> <span>{member.mobileNumber || 'N/A'}</span></div>
                    <div className="flex justify-between uppercase text-chart-2"><span>Joined</span> <span>{format(parseISO(member.joinDate), 'dd MMM yyyy')}</span></div>
                    <div className="flex justify-between uppercase text-destructive"><span>Expires</span> <span>{format(parseISO(member.expiryDate), 'dd MMM yyyy')}</span></div>
                </div>
            </div>
          </div>
      </div>
    </TooltipProvider>
  );
}
