
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
import DueNotice from './due-notice';
import { useFirestore } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { uploadImage } from '@/app/actions';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type MemberCardProps = {
  member: Member;
  plan?: Plan;
  gymName?: string | null;
  gymAddress?: string;
  gymIconUrl?: string | null;
  isExpiryShare?: boolean;
  attendanceRecord?: Attendance;
};

export default function MemberCard({ member, plan, gymName, gymAddress, gymIconUrl, isExpiryShare = false, attendanceRecord }: MemberCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
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
  
  const handleShare = async () => {
    if (isSharing) return;

    if (!member.mobileNumber) {
        toast({
            variant: 'destructive',
            title: 'Share Failed',
            description: "Member does not have a mobile number saved.",
        });
        return;
    }

    setIsSharing(true);
    const elementToCapture = isExpiryShare ? noticeRef.current : cardRef.current;
    
    if (!elementToCapture) {
        toast({
            variant: "destructive",
            title: "Share Failed",
            description: "Cannot find capture element.",
        });
        setIsSharing(false);
        return;
    }

    try {
      // 1. High-Speed Capture
      const canvas = await html2canvas(elementToCapture, {
        useCORS: true,
        scale: 1.2, // Optimized scale for speed
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Failed to create image.");

      const fileName = isExpiryShare 
        ? `${member.name.replace(/ /g, '_')}_Notice.png`
        : `${member.name.replace(/ /g, '_')}_ID.png`;

      const file = new File([blob], fileName, { type: 'image/png' });
      
      const expiryStr = format(parseISO(member.expiryDate), 'PPP');
      const baseMessage = isExpiryShare 
        ? `Hello ${member.name}, your membership at ${gymName || 'the gym'} expires today (${expiryStr}). To continue, please renew. Amount: ₹${plan?.price || 'N/A'}`
        : `Hello ${member.name}, here is your gym ID card for ${gymName || 'Sardar Fitness'}.`;

      // 2. Priority: Native Share API (Fastest, attaches actual image file)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: isExpiryShare ? 'Gym Notice' : 'Gym ID',
            text: baseMessage,
          });
          setIsSharing(false);
          return;
        } catch (err) {
            // Cancelled or failed, proceed to deep-link fallback
        }
      }

      // 3. Fallback: Direct WhatsApp Deep-Link (Skips landing page)
      let sanitizedPhone = member.mobileNumber.replace(/\D/g, '');
      if (sanitizedPhone.length === 10) sanitizedPhone = `91${sanitizedPhone}`;

      // Show toast as upload is starting
      toast({
          title: "Generating Image Link...",
          description: "This allows WhatsApp to display the card image.",
      });

      const formData = new FormData();
      formData.append('image', blob, fileName);
      const uploadResult = await uploadImage(formData);

      let finalMessage = baseMessage;
      if (uploadResult.url) {
          finalMessage += `\n\nView Card: ${uploadResult.url}`;
      }

      const whatsappDeepLink = `whatsapp://send?phone=${sanitizedPhone}&text=${encodeURIComponent(finalMessage)}`;
      const whatsappWebLink = `https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodeURIComponent(finalMessage)}`;

      // Attempt to launch app directly
      window.location.href = whatsappDeepLink;

      // Smart fallback for desktop/older browsers
      setTimeout(() => {
          if (document.hasFocus()) {
              window.open(whatsappWebLink, '_blank');
          }
      }, 500);

    } catch (error) {
        console.error("Sharing failed:", error);
        toast({
            variant: "destructive",
            title: "Share Failed",
            description: "An unexpected error occurred while sharing.",
        });
    } finally {
        setIsSharing(false);
    }
  };

  const handleCheckIn = async () => {
    setIsAttendanceLoading(true);
    const attendanceCollection = collection(firestore, "attendance");
    try {
      await addDoc(attendanceCollection, {
        memberId: member.id,
        checkInTime: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
      toast({
        title: "Checked In!",
        description: `${member.name} has been checked in for today.`
      });
    } catch (error) {
      console.error("Error checking in member:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem checking the member in.",
      });
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!attendanceRecord) return;
    setIsAttendanceLoading(true);
    const attendanceDocRef = doc(firestore, "attendance", attendanceRecord.id);
    try {
      await updateDoc(attendanceDocRef, {
        checkOutTime: new Date().toISOString()
      });
      toast({
        title: "Checked Out!",
        description: `${member.name} has been checked out for today.`
      });
    } catch (error) {
      console.error("Error checking out member:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem checking the member out.",
      });
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const isCheckedOut = !!attendanceRecord?.checkOutTime;

  return (
    <>
      <Card className="w-full max-w-lg mx-auto shadow-lg rounded-lg overflow-hidden relative landscape-member-card bg-card">
        <div className="flex justify-between pr-12 min-h-[220px]">
          <CardContent className="p-4 flex-grow space-y-3">
             <div className="flex items-center gap-2 mb-2">
                <User className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-bold font-headline truncate">{member.name}</h3>
             </div>
             
             <div className="grid grid-cols-[max-content,1fr] gap-x-4 gap-y-2 text-sm items-center">
                <span className="font-bold text-muted-foreground flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> ID :</span>
                <span className="font-mono font-semibold">{member.memberId}</span>
                
                <span className="font-bold text-muted-foreground flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Plan :</span>
                <span className="font-medium">{planName}</span>
                
                <span className="font-bold text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Joined :</span>
                <span>{format(parseISO(member.joinDate), 'dd-MM-yyyy')}</span>
                
                <span className="font-bold text-muted-foreground flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Expiry :</span>
                <span className={status === 'expired' ? 'text-destructive font-bold' : 'font-medium'}>
                    {format(parseISO(member.expiryDate), 'dd-MM-yyyy')}
                </span>
                
                <span className="font-bold text-muted-foreground flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Mobile :</span>
                <span>{member.mobileNumber || "N/A"}</span>
                
                <span className="font-bold text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Address :</span>
                <span className="line-clamp-1 text-xs" title={member.address}>{member.address}</span>

                <span className="font-bold text-muted-foreground">Status :</span>
                <div>
                  <Badge variant={getStatusBadgeVariant(status)} className="capitalize">
                    {status}
                  </Badge>
                </div>
             </div>
          </CardContent>

          <div className="p-4 flex-shrink-0 flex items-start justify-center">
            <Dialog>
                <DialogTrigger asChild>
                    <Avatar className="h-24 w-24 rounded-md border-2 border-primary cursor-pointer hover:opacity-90 transition-opacity">
                        <AvatarImage src={member.imageUrl} alt={member.name} className="object-cover" />
                        <AvatarFallback className="rounded-none">{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                </DialogTrigger>
                <DialogContent className="p-0 border-0 max-w-md bg-transparent shadow-none">
                    <DialogHeader>
                      <DialogTitle className="sr-only">Photo of {member.name}</DialogTitle>
                    </DialogHeader>
                    <div className="relative w-full aspect-square">
                        <Image
                            src={member.imageUrl}
                            alt={`Photo of ${member.name}`}
                            fill
                            className="object-contain rounded-md"
                        />
                    </div>
                </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 flex flex-col w-12 rounded-r-lg overflow-hidden border-l bg-muted/30">
          <EditMemberDialog member={member} />
          
          <Button 
            asChild 
            variant="ghost" 
            className="flex-1 w-full rounded-none hover:bg-blue-500 hover:text-white" 
            disabled={!member.mobileNumber}
          >
            {member.mobileNumber ? (
                <a href={`tel:${member.mobileNumber}`} title={`Call ${member.name}`}>
                    <PhoneCall className="h-5 w-5" />
                </a>
            ) : (
                <div className="opacity-30"><PhoneCall className="h-5 w-5" /></div>
            )}
          </Button>

          <RenewPlanDialog member={member} />

          {!attendanceRecord ? (
              <Button
                  variant="ghost"
                  className="flex-1 w-full rounded-none hover:bg-green-500 hover:text-white"
                  onClick={handleCheckIn}
                  disabled={isAttendanceLoading}
                  title="Check In"
              >
                  {isAttendanceLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Fingerprint className="h-5 w-5" />}
              </Button>
          ) : !isCheckedOut ? (
              <Button
                  variant="ghost"
                  className="flex-1 w-full rounded-none bg-chart-2 text-white hover:bg-chart-2/90"
                  onClick={handleCheckOut}
                  disabled={isAttendanceLoading}
                  title="Check Out"
              >
                  {isAttendanceLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Fingerprint className="h-5 w-5" />}
              </Button>
          ) : (
              <Button variant="ghost" className="flex-1 w-full rounded-none opacity-50 cursor-not-allowed" disabled>
                  <Fingerprint className="h-5 w-5 text-green-500" />
              </Button>
          )}

          <Button 
            variant="ghost" 
            className="flex-1 w-full rounded-none hover:bg-indigo-500 hover:text-white" 
            onClick={handleShare} 
            disabled={isSharing || !member.mobileNumber}
          >
            {isSharing ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
          </Button>
          
          <DeleteMemberDialog memberId={member.id} memberName={member.name} />
        </div>
      </Card>

      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={cardRef} className="p-4 bg-white pb-12 w-[400px] text-black">
            <div className="flex items-center bg-primary text-primary-foreground font-headline -m-4 mb-4 p-4">
                <div className="flex items-center gap-3 w-full">
                  {gymIconUrl && (
                    <div className="relative h-24 w-24 rounded-md bg-white overflow-hidden flex-shrink-0 p-1 border-2 border-white flex items-center justify-center">
                        <img 
                          src={gymIconUrl} 
                          alt="Logo" 
                          className="h-full w-full object-contain" 
                          crossOrigin="anonymous" 
                        />
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold leading-tight uppercase">{gymName}</h2>
                    <p className="text-[10px] leading-tight opacity-80 uppercase">{gymAddress}</p>
                  </div>
                </div>
            </div>
            <div className="flex flex-col items-center">
                <div className="relative h-40 w-40 rounded-md overflow-hidden border-4 border-primary mb-4 bg-muted">
                    <img 
                      src={member.imageUrl} 
                      alt={member.name} 
                      className="h-full w-full object-cover" 
                      crossOrigin="anonymous" 
                    />
                </div>
                <h3 className="text-4xl font-black mb-1 uppercase tracking-tighter">{member.name}</h3>
                <div className="border-[3px] border-black p-2 mb-4 bg-white">
                  <p className="text-3xl font-black tracking-widest font-mono">ID: {member.memberId}</p>
                </div>
                <div className="w-full space-y-2 text-lg text-left border-t-2 border-black pt-4 font-bold">
                    <div className="flex justify-between uppercase"><span>Plan</span> <span>{planName}</span></div>
                    <div className="flex justify-between uppercase"><span>Mobile</span> <span>{member.mobileNumber}</span></div>
                    <div className="flex justify-between uppercase"><span>Joined</span> <span>{format(parseISO(member.joinDate), 'dd MMM yyyy')}</span></div>
                    <div className="flex justify-between uppercase text-destructive"><span>Expires</span> <span>{format(parseISO(member.expiryDate), 'dd MMM yyyy')}</span></div>
                </div>
            </div>
          </div>

          {isExpiryShare && plan && (
            <DueNotice 
                ref={noticeRef}
                member={member}
                plan={plan}
                gymName={gymName}
            />
          )}
      </div>
    </>
  );
}
