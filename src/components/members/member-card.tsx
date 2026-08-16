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
import { uploadImage } from '@/app/actions';
import DueNotice from './due-notice';
import { useFirestore } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
            description: `Cannot find ${isExpiryShare ? 'notice' : 'ID card'} element.`,
        });
        setIsSharing(false);
        return;
    }

    const badgeElement = isExpiryShare ? null : elementToCapture.querySelector('[data-badge="status"]');
    if (badgeElement) {
        (badgeElement as HTMLElement).style.visibility = 'hidden';
    }

    try {
      const canvas = await html2canvas(elementToCapture, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        
      if (!blob) {
          throw new Error("Failed to create image.");
      }

      const fileName = isExpiryShare 
        ? `${member.name.replace(/ /g, '_')}_Expiry_Notice.png`
        : `${member.name.replace(/ /g, '_')}_ID_Card.png`;

      const formData = new FormData();
      formData.append('image', blob, fileName);
      
      const uploadResult = await uploadImage(formData);

      if (uploadResult.error || !uploadResult.url) {
          throw new Error(uploadResult.error || "Could not get image URL.");
      }
      
      let message = "";
      if (isExpiryShare) {
        const expiryStr = format(parseISO(member.expiryDate), 'PPP');
        const renewalAmount = plan?.price || 'N/A';
        message = `Hello ${member.name}, your membership at ${gymName || 'the gym'} expires today (${expiryStr}). To continue your workouts, please renew your plan.\n\nRenewal Amount: ₹${renewalAmount}\n\nYou can view your notice here: ${uploadResult.url}`;
      } else {
        message = `Hello ${member.name}, here is your gym ID card: ${uploadResult.url}`;
      }

      let sanitizedPhone = member.mobileNumber.replace(/\D/g, '');
      if (sanitizedPhone.startsWith('0')) sanitizedPhone = sanitizedPhone.substring(1);
      if (sanitizedPhone.length === 10) sanitizedPhone = `91${sanitizedPhone}`;

      const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;

      // Use Web Share API if possible
      if (navigator.share) {
        try {
          await navigator.share({
            title: isExpiryShare ? 'Gym Renewal Notice' : 'Gym ID Card',
            text: message,
          });
          setIsSharing(false);
          return;
        } catch (err) {
            console.log("Web share failed", err);
            // If sharing is cancelled or fails, continue to the fallback
        }
      }
      
      // Fallback: Use window.location.href to trigger native deep linking more reliably than window.open
      // If we are in an iframe (like the preview), we use window.open as a fallback to avoid SecurityError
      const isInIframe = window.self !== window.top;
      if (isInIframe) {
          window.open(whatsappUrl, '_blank');
      } else {
          window.location.href = whatsappUrl;
      }
      
      toast({
        title: "Sharing Details",
        description: "Redirecting to WhatsApp...",
      });

    } catch (error) {
        console.error("Sharing failed:", error);
        toast({
            variant: "destructive",
            title: "Share Failed",
            description: error instanceof Error ? error.message : "Could not share. Please try again.",
        });
    } finally {
        if (badgeElement) {
            (badgeElement as HTMLElement).style.visibility = 'visible';
        }
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
                  <Badge variant={getStatusBadgeVariant(status)} className="capitalize" data-badge="status">
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

        {/* Action Sidebar */}
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

      {/* Hidden elements for ID Card / Notice Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          {/* Portrait ID Card Representation for Sharing */}
          <div ref={cardRef} className="p-4 bg-white pb-12 w-[400px]">
            <div className="flex items-center bg-primary text-primary-foreground font-headline -m-4 mb-4 p-4">
                <div className="flex items-center gap-3 w-full">
                  {gymIconUrl && (
                    <div className="relative h-14 w-14 rounded-full bg-white overflow-hidden flex-shrink-0 p-1">
                        <Image src={gymIconUrl} alt="Logo" fill className="object-contain" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold">{gymName}</h2>
                    <p className="text-[10px] leading-tight opacity-80">{gymAddress}</p>
                  </div>
                </div>
            </div>
            <div className="flex flex-col items-center">
                <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-primary mb-4">
                    <Image src={member.imageUrl} alt={member.name} fill className="object-cover" />
                </div>
                <h3 className="text-3xl font-bold mb-1">{member.name}</h3>
                <p className="text-xl text-muted-foreground mb-4 font-mono">ID: {member.memberId}</p>
                <div className="w-full space-y-2 text-base text-left border-t pt-4">
                    <div className="flex justify-between"><strong>Plan:</strong> <span>{planName}</span></div>
                    <div className="flex justify-between"><strong>Mobile:</strong> <span>{member.mobileNumber}</span></div>
                    <div className="flex justify-between"><strong>Joined:</strong> <span>{format(parseISO(member.joinDate), 'PPP')}</span></div>
                    <div className="flex justify-between text-destructive font-bold"><strong>Expires:</strong> <span>{format(parseISO(member.expiryDate), 'PPP')}</span></div>
                </div>
                <Badge variant={getStatusBadgeVariant(status)} className="mt-6 scale-150" data-badge="status">{status}</Badge>
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
