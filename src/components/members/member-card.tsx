'use client';

import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card";
import type { Member, Plan, Attendance } from "@/lib/types";
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { format, parseISO } from 'date-fns';
import { Calendar, Phone, Share2, MapPin, LoaderCircle, PhoneCall, Fingerprint, CalendarClock, User, Hash, Tag } from 'lucide-react';
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import EditMemberDialog from './edit-member-dialog';
import DeleteMemberDialog from './delete-member-dialog';
import RenewPlanDialog from './renew-plan-dialog';
import { useFirestore } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { uploadImage } from '@/app/actions';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type MemberCardProps = {
  member: Member;
  plan?: Plan;
  gymName?: string | null;
  gymAddress?: string;
  gymIconUrl?: string | null;
  attendanceRecord?: Attendance;
};

export default function MemberCard({ member, plan, gymName, gymAddress, gymIconUrl, attendanceRecord }: MemberCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isShareType, setIsShareType] = useState<'id' | 'notice'>('id');
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
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

  const getStatusBadgeVariant = (status: Member['status']) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'expired':
        return 'destructive';
      case 'due':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleShare = async (type: 'id' | 'notice') => {
    if (isSharing) return;

    if (!member.mobileNumber) {
      toast({
        variant: 'destructive',
        title: 'Share Failed',
        description: "Member mobile number missing.",
      });
      return;
    }

    setIsSharing(true);
    setIsShareType(type);

    try {
      const expiryStr = format(parseISO(member.expiryDate), 'dd MMM yyyy');
      let message = "";

      if (type === 'id') {
        // For ID cards, prioritize the saved URL (generated when member was added)
        let sharedUrl = member.idCardUrl || null;

        // Fallback: Regenerate only if missing (e.g. for members added before this update)
        if (!sharedUrl) {
          toast({ title: "Sharing...", description: "Generating high-speed share link..." });
          
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

          // Save the generated link back to Firestore for future instant sharing
          updateDoc(doc(firestore, "members", member.id), { idCardUrl: sharedUrl });
        }

        message = `🏋️ ${gymName || 'Gym'} ID Card\n\n👤 Name: ${member.name.toUpperCase()}\n🆔 ID: ${member.memberId}\n📅 Joined: ${format(parseISO(member.joinDate), 'dd MMM yyyy')}\n📅 Expiry: ${expiryStr}\n\n🔗 View Card: ${sharedUrl}`;
      } else {
        // Text-only Renewal Notice (No image generation requested)
        message = `🔔 RENEWAL NOTICE\n\nHello ${member.name.toUpperCase()},\n\nThis is a friendly reminder from ${gymName || 'your gym'} that your membership is expiring on ${expiryStr}.\n\n💰 Renewal Amount: ₹${plan?.price || 'N/A'}\n\nPlease renew your membership to continue your fitness journey!\n\nThank you,\n${gymName || 'Management'}`;
      }

      const sanitizedPhone = member.mobileNumber.replace(/\D/g, '');
      const phoneWithCode = sanitizedPhone.length === 10 ? `91${sanitizedPhone}` : sanitizedPhone;

      // Direct WhatsApp native application launch
      const whatsappUrl = `whatsapp://send?phone=${phoneWithCode}&text=${encodeURIComponent(message)}`;
      window.location.href = whatsappUrl;

      // Fallback for browsers that don't support the protocol
      setTimeout(() => {
        if (document.hasFocus()) {
          window.open(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`, '_blank');
        }
      }, 800);

    } catch (error) {
      console.error("Share error:", error);
      toast({ variant: "destructive", title: "Error", description: "Sharing failed." });
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

  return (
    <>
      <Card className="w-full max-w-lg mx-auto shadow-lg rounded-lg overflow-hidden relative bg-card border-primary/10">
        <div className="flex justify-between pr-12 min-h-[200px]">
          <CardContent className="p-4 flex-grow space-y-2">
             <div className="flex items-center gap-2 mb-1">
                <User className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-bold font-headline truncate">{member.name}</h3>
             </div>
             
             <div className="grid grid-cols-[max-content,1fr] gap-x-4 gap-y-1.5 text-sm items-center">
                <span className="font-bold text-muted-foreground flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> ID :</span>
                <span className="font-mono font-semibold">{member.memberId}</span>
                
                <span className="font-bold text-muted-foreground flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Plan :</span>
                <span className="font-medium">{planName}</span>
                
                <span className="font-bold text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Joined :</span>
                <span className="text-chart-2 font-bold">{format(parseISO(member.joinDate), 'dd-MM-yyyy')}</span>
                
                <span className="font-bold text-muted-foreground flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Expiry :</span>
                <span className="text-destructive font-bold">{format(parseISO(member.expiryDate), 'dd-MM-yyyy')}</span>
                
                <span className="font-bold text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Mobile :</span>
                <span>{member.mobileNumber || "N/A"}</span>

                <span className="font-bold text-muted-foreground">Status :</span>
                <div>
                  <Badge variant={getStatusBadgeVariant(status)} className="capitalize">{status}</Badge>
                </div>
             </div>

             <div className="flex gap-2 mt-3 pt-2 border-t border-primary/5">
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => handleShare('notice')}
                 disabled={isSharing || !member.mobileNumber}
                 className="flex-1 gap-2 text-xs"
               >
                 {isSharing && isShareType === 'notice' ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
                 Due Notice
               </Button>
             </div>
          </CardContent>

          <div className="p-4 flex-shrink-0 flex items-start justify-center">
            <Dialog>
                <DialogTrigger asChild>
                    <Avatar className="h-24 w-24 rounded-md border-2 border-primary cursor-pointer hover:opacity-90">
                        <AvatarImage src={member.imageUrl} alt={member.name} className="object-cover" />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                </DialogTrigger>
                <DialogContent className="p-0 border-0 max-w-md bg-transparent shadow-none">
                    <div className="relative w-full aspect-square">
                        <Image src={member.imageUrl} alt={member.name} fill className="object-contain rounded-md" />
                    </div>
                </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 flex flex-col w-12 rounded-r-lg overflow-hidden border-l bg-muted/30">
          <EditMemberDialog member={member} />
          
          <Button asChild variant="ghost" className="flex-1 w-full rounded-none hover:bg-blue-500 hover:text-white" disabled={!member.mobileNumber}>
            {member.mobileNumber ? <a href={`tel:${member.mobileNumber}`}><PhoneCall className="h-5 w-5" /></a> : <div className="opacity-30"><PhoneCall className="h-5 w-5" /></div>}
          </Button>

          <RenewPlanDialog member={member} />

          <Button
              variant="ghost"
              className={`flex-1 w-full rounded-none ${attendanceRecord && !attendanceRecord.checkOutTime ? 'bg-chart-2 text-white' : 'hover:bg-green-500 hover:text-white'}`}
              onClick={attendanceRecord && !attendanceRecord.checkOutTime ? handleCheckOut : handleCheckIn}
              disabled={isAttendanceLoading || (!!attendanceRecord?.checkOutTime)}
          >
              {isAttendanceLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Fingerprint className="h-5 w-5" />}
          </Button>

          <Button 
            variant="ghost" 
            className="flex-1 w-full rounded-none hover:bg-indigo-500 hover:text-white" 
            onClick={() => handleShare('id')} 
            disabled={isSharing || !member.mobileNumber}
          >
            {isSharing && isShareType === 'id' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
          </Button>
          
          <DeleteMemberDialog memberId={member.id} memberName={member.name} />
        </div>
      </Card>

      {/* Hidden capture area - Only for ID Card */}
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
                <h3 className="text-4xl font-black mb-4 uppercase tracking-tight">{member.name}</h3>
                <p className="text-xl font-black tracking-widest font-mono mb-4">ID: {member.memberId}</p>
                <div className="w-full space-y-2 text-lg text-left border-t-2 border-black pt-4 font-bold">
                    <div className="flex justify-between uppercase"><span>Plan</span> <span>{planName}</span></div>
                    <div className="flex justify-between uppercase"><span>Mobile</span> <span>{member.mobileNumber}</span></div>
                    <div className="flex justify-between uppercase text-chart-2"><span>Joined</span> <span>{format(parseISO(member.joinDate), 'dd MMM yyyy')}</span></div>
                    <div className="flex justify-between uppercase text-destructive"><span>Expires</span> <span>{format(parseISO(member.expiryDate), 'dd MMM yyyy')}</span></div>
                </div>
            </div>
          </div>
      </div>
    </>
  );
}
