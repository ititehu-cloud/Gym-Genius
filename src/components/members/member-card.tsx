'use client';

import Image from 'next/image';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Member, Plan } from "@/lib/types";
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { format, parseISO } from 'date-fns';
import { Cake, Calendar, Phone, Share2, MapPin, LoaderCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import EditMemberDialog from './edit-member-dialog';
import DeleteMemberDialog from './delete-member-dialog';
import { uploadImage } from '@/app/actions';
import DueNotice from './due-notice';
import { flushSync } from 'react-dom';


type MemberCardProps = {
  member: Member;
  plan?: Plan;
  gymName?: string | null;
  gymAddress?: string;
  gymIconUrl?: string | null;
  isExpiryShare?: boolean;
};

export default function MemberCard({ member, plan, gymName, gymAddress, gymIconUrl, isExpiryShare = false }: MemberCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [memberToProcess, setMemberToProcess] = useState<Member | null>(null);
  const { toast } = useToast();
  
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
    setIsSharing(true);

    if (isExpiryShare && plan) {
      if (!member.mobileNumber) {
          toast({
              variant: 'destructive',
              title: 'Share Failed',
              description: "This member doesn't have a mobile number saved.",
          });
          setIsSharing(false);
          return;
      }
      
      // This is the expiry reminder logic, which sends a text message.
      const from = gymName || "Your Gym";
      const customer = member.name;
      const mobile = member.mobileNumber;
      const joinDate = format(parseISO(member.joinDate), 'PPP');
      const expiryDate = format(parseISO(member.expiryDate), 'PPP');
      const planType = plan.name;
      const amountDue = plan.price;

      const message = `*Due Details*\n\nFrom: ${from}\n\nCustomer: ${customer}\nMobile: ${mobile}\nDate of Joining: ${joinDate}\nDate of Expiry: ${expiryDate}\nPlan Type: ${planType}\nAmount Due: ₹${amountDue}\n\nPlease clear the due amount as early as possible to continue your membership with the Gym.\nThank you!`;
      const whatsappUrl = `https://wa.me/${member.mobileNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      setIsSharing(false);
      return;
    }

    // Default ID Card Sharing Logic
    const cardElement = cardRef.current;
    if (!cardElement) {
        toast({
            variant: "destructive",
            title: "Share Failed",
            description: "Cannot find ID card element.",
        });
        setIsSharing(false);
        return;
    }
    const badgeElement = cardElement.querySelector('[data-badge="status"]');
    
    if (badgeElement) {
        (badgeElement as HTMLElement).style.visibility = 'hidden';
    }

    try {
      const canvas = await html2canvas(cardElement, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        
      if (!blob) {
          throw new Error("Failed to create image from ID card.");
      }

      const formData = new FormData();
      formData.append('image', blob, `${member.name.replace(/ /g, '_')}_ID_Card.png`);
      
      const uploadResult = await uploadImage(formData);

      if (uploadResult.error || !uploadResult.url) {
          throw new Error(uploadResult.error || "Could not get image URL after upload.");
      }
      
      if (!member.mobileNumber) {
        toast({
          variant: 'destructive',
          title: 'Share Failed',
          description: "This member doesn't have a mobile number saved.",
        });
        return; // The finally block will run
      }
      
      const message = `Here is your digital ID card from ${gymName || 'our gym'}: ${uploadResult.url}`;
      const whatsappUrl = `https://wa.me/${member.mobileNumber}?text=${encodeURIComponent(message)}`;

      // Open WhatsApp
      window.open(whatsappUrl, '_blank');

      toast({
        title: "Redirecting to WhatsApp",
        description: "Your ID card image is ready to be sent.",
      });

    } catch (error) {
        console.error("Sharing failed:", error);
        toast({
            variant: "destructive",
            title: "Share Failed",
            description: error instanceof Error ? error.message : "Could not share the ID card. Please try again.",
        });
    } finally {
        if (badgeElement) {
            (badgeElement as HTMLElement).style.visibility = 'visible';
        }
        setIsSharing(false);
    }
  };


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
                  <h2 className="text-base font-bold whitespace-pre-wrap">{gymName}</h2>
                </div>
                <div className="p-2 px-3 text-left w-1/2 border-l-2 border-primary-foreground/30">
                   <p className="text-xs leading-tight whitespace-pre-wrap">{gymAddress || 'Address not set'}</p>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row">
              <div className="p-3 flex justify-center items-center w-full sm:w-auto">
                  <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-primary/50 flex-shrink-0">
                      <Image
                          src={member.imageUrl}
                          alt={`Photo of ${member.name}`}
                          fill
                          className="object-cover"
                          crossOrigin="anonymous" // Required for html2canvas with external images
                      />
                  </div>
              </div>
              <CardContent className="p-3 pt-0 flex flex-col justify-center items-start w-full sm:w-auto">
                  <div className='text-left'>
                      <h3 className="text-xl font-bold font-headline leading-tight">{member.name}</h3>
                      {member.memberId && <p className="text-sm text-muted-foreground">ID: {member.memberId}</p>}
                      <p className="text-sm text-muted-foreground">{planName} Plan</p>
                  </div>
                  <div className="text-left text-xs w-full space-y-0.5 text-muted-foreground mt-2">
                      <div className='flex items-center gap-2'><Phone className='w-4 h-4' /><span>{member.mobileNumber}</span></div>
                      <div className='flex items-start gap-2'><MapPin className='w-4 h-4 mt-0.5 flex-shrink-0' /><span className="break-words">{member.address}</span></div>
                      <div className='flex items-center gap-2'><Calendar className='w-4 h-4' /><span className='text-chart-2 font-medium'>Joined: {format(parseISO(member.joinDate), 'MMM dd, yyyy')}</span></div>
                      <div className='flex items-center gap-2'><Cake className='w-4 h-4' /><span className='text-destructive font-medium'>Expires: {format(parseISO(member.expiryDate), 'MMM dd, yyyy')}</span></div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(status)} className="capitalize text-sm px-2 py-0.5 mt-2" data-badge="status">{status}</Badge>
              </CardContent>
            </div>
        </div>
        <CardFooter className="p-2 bg-muted/50 flex items-center justify-around">
          <EditMemberDialog member={member} />
          <DeleteMemberDialog memberId={member.id} memberName={member.name} />
          <Button variant="outline" size="icon" onClick={handleShare} disabled={isSharing}>
            {isSharing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            <span className='sr-only'>Share</span>
          </Button>
        </CardFooter>
      </Card>
      {memberToProcess && plan && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            <DueNotice 
                ref={noticeRef}
                member={memberToProcess}
                plan={plan}
                gymName={gymName}
            />
        </div>
      )}
    </>
  );
}
