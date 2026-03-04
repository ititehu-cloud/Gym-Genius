
'use client';

import Image from 'next/image';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Member, Plan, Attendance } from "@/lib/types";
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { format, parseISO } from 'date-fns';
import { Cake, Calendar, Phone, Share2, MapPin, LoaderCircle, PhoneCall, Fingerprint, CalendarClock } from 'lucide-react';
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
            description: "Sharing is disabled as this member does not have a mobile number saved.",
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
          throw new Error(uploadResult.error || "Could not get image URL after upload.");
      }
      
      let message = "";
      if (isExpiryShare) {
        const expiryStr = format(parseISO(member.expiryDate), 'PPP');
        const renewalAmount = plan?.price || 'N/A';
        message = `Hello ${member.name}, your membership at ${gymName || 'the gym'} expires today (${expiryStr}). To continue your workouts, please renew your plan. Renewal Amount: ₹${renewalAmount}. You can view your notice here: ${uploadResult.url}`;
      } else {
        message = `Here is your gym ID card: ${uploadResult.url}`;
      }

      const whatsappUrl = `https://wa.me/${member.mobileNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      toast({
        title: "Redirecting to WhatsApp",
        description: isExpiryShare ? "Renewal details are ready to be shared." : "Your ID card is ready to be shared.",
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
      <Card className="bg-card w-full max-w-[420px] flex flex-col rounded-xl shadow-lg justify-between">
        <div ref={cardRef} className="p-4 bg-white pb-12">
            <div className="flex items-center bg-primary text-primary-foreground font-headline -m-4 mb-4 rounded-t-xl overflow-hidden">
                <div className="p-2 px-3 text-left w-1/2 flex items-center gap-2">
                  {gymIconUrl && (
                    <div className="relative h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                            src={gymIconUrl}
                            alt={`${gymName || 'Gym'} logo`}
                            fill
                            className="object-cover"
                            crossOrigin="anonymous"
                        />
                    </div>
                  )}
                  <h2 className="text-xl font-bold whitespace-pre-wrap">{gymName}</h2>
                </div>
                <div className="p-2 px-3 text-left w-1/2 border-l-2 border-primary-foreground/30">
                   <p className="text-sm leading-tight whitespace-pre-wrap">{gymAddress || 'Address not set'}</p>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row">
              <div className="p-3 flex justify-center items-center w-full sm:w-auto">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-primary/50 flex-shrink-0 cursor-pointer">
                          <Image
                              src={member.imageUrl}
                              alt={`Photo of ${member.name}`}
                              fill
                              className="object-cover"
                              crossOrigin="anonymous"
                          />
                      </div>
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
                                crossOrigin="anonymous"
                            />
                        </div>
                    </DialogContent>
                  </Dialog>
              </div>
              <CardContent className="p-3 pt-0 flex flex-col justify-center items-start w-full sm:w-auto">
                  <div className='text-left'>
                      <h3 className="text-2xl font-bold font-headline leading-tight">{member.name}</h3>
                      {member.memberId && <p className="text-lg text-muted-foreground">ID: {member.memberId}</p>}
                      <p className="text-lg text-muted-foreground">{planName} Plan</p>
                  </div>
                  <div className="text-left text-base w-full space-y-1 text-muted-foreground mt-2">
                      <div className='flex items-center gap-2'><Phone className='w-5 h-5' /><span>{member.mobileNumber || "No contact info"}</span></div>
                      <div className='flex items-start gap-2'><MapPin className='w-5 h-5 mt-0.5 flex-shrink-0' /><span className="break-words">{member.address}</span></div>
                      <div className='flex items-center gap-2'><Calendar className='w-5 h-5' /><span className='text-chart-2 font-semibold'>Joined: {format(parseISO(member.joinDate), 'MMM dd, yyyy')}</span></div>
                      <div className='flex items-center gap-2'><CalendarClock className='w-5 h-5' /><span className='text-destructive font-semibold'>Expires: {format(parseISO(member.expiryDate), 'MMM dd, yyyy')}</span></div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(status)} className="capitalize text-lg px-4 py-1 mt-3" data-badge="status">{status}</Badge>
              </CardContent>
            </div>
        </div>
        <CardFooter className="p-2 bg-muted/50 flex items-center justify-around">
          <EditMemberDialog member={member} />
          
          <Button asChild variant="outline" size="icon" disabled={!member.mobileNumber}>
            {member.mobileNumber ? (
              <a href={`tel:${member.mobileNumber}`} title={`Call ${member.name}`}>
                  <PhoneCall className="h-5 w-5" />
                  <span className="sr-only">Call</span>
              </a>
            ) : (
              <span title="No contact number saved">
                  <PhoneCall className="h-5 w-5 opacity-30" />
                  <span className="sr-only">Call Disabled</span>
              </span>
            )}
          </Button>

          <RenewPlanDialog member={member} />

          {!attendanceRecord ? (
              <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCheckIn}
                  disabled={isAttendanceLoading}
                  title="Check In"
              >
                  {isAttendanceLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Fingerprint className="h-5 w-5" />}
              </Button>
          ) : !isCheckedOut ? (
              <Button
                  variant="default"
                  className="bg-chart-2 hover:bg-chart-2/90"
                  size="icon"
                  onClick={handleCheckOut}
                  disabled={isAttendanceLoading}
                  title="Check Out"
              >
                  {isAttendanceLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Fingerprint className="h-5 w-5" />}
              </Button>
          ) : (
              <Button variant="outline" size="icon" disabled title="Attendance completed">
                  <Fingerprint className="h-5 w-5 text-green-500" />
              </Button>
          )}

          <Button variant="outline" size="icon" onClick={handleShare} disabled={isSharing || !member.mobileNumber}>
            {isSharing ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Share2 className="h-5 w-5" />
            )}
            <span className='sr-only'>Share</span>
          </Button>
          
          <DeleteMemberDialog memberId={member.id} memberName={member.name} />

        </CardFooter>
      </Card>
      
      {isExpiryShare && plan && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            <DueNotice 
                ref={noticeRef}
                member={member}
                plan={plan}
                gymName={gymName}
            />
        </div>
      )}
    </>
  );
}
