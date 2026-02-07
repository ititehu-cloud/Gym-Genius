'use client';

import Image from 'next/image';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Member } from "@/lib/types";
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { format, parseISO } from 'date-fns';
import { Cake, Calendar, Phone, Share2, MapPin, LoaderCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import EditMemberDialog from './edit-member-dialog';
import DeleteMemberDialog from './delete-member-dialog';

type MemberCardProps = {
  member: Member;
  planName: string;
  gymName?: string | null;
  gymAddress?: string;
};

export default function MemberCard({ member, planName, gymName, gymAddress }: MemberCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
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
    if (!cardRef.current) return;
    setIsSharing(true);

    try {
      // Use html2canvas to capture the card element
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true, // Important for external images
        scale: 2, // Increase resolution
        backgroundColor: null, // Use transparent background
      });

      // Convert canvas to a Blob
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      
      if (!blob) {
        throw new Error('Could not create image blob.');
      }

      // Create a File from the Blob
      const file = new File([blob], `${member.name.replace(/ /g, '_')}_ID_Card.png`, { type: 'image/png' });

      // Use Web Share API if available
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${member.name}'s ID Card`,
          text: `Here is the ID card for ${member.name}.`,
        });
      } else {
        // Fallback: Download the image
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${member.name.replace(/ /g, '_')}_ID_Card.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        toast({
            title: "Sharing not supported",
            description: "Your browser doesn't support sharing. The ID card image has been downloaded instead.",
        });
      }
    } catch (error) {
        console.error("Sharing failed:", error);
        toast({
            variant: "destructive",
            title: "Operation Failed",
            description: "Could not create or share the ID card. Please try again.",
        });
    } finally {
        setIsSharing(false);
    }
  };

  return (
    <Card ref={cardRef} className="overflow-hidden bg-card w-[350px] aspect-[85.6/54] flex flex-col rounded-xl shadow-lg justify-between">
      <div>
          <div className="flex bg-primary text-primary-foreground font-headline">
              <div className="p-1 px-2 text-left w-1/2 flex items-center">
                <h2 className="text-sm font-bold whitespace-pre-wrap">{gymName}</h2>
              </div>
              <div className="p-1 px-2 text-left w-1/2 border-l-2 border-primary-foreground/30 flex items-center">
                 <p className="text-[7px] leading-tight whitespace-pre-wrap">{gymAddress || 'Address not set'}</p>
              </div>
          </div>
          <div className="flex">
            <div className="p-2 flex justify-center items-center">
                <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-primary/50 flex-shrink-0">
                    <Image
                        src={member.imageUrl}
                        alt={`Photo of ${member.name}`}
                        fill
                        className="object-cover"
                        crossOrigin="anonymous" // Required for html2canvas with external images
                    />
                </div>
            </div>
            <CardContent className="p-2 pt-2 flex flex-col justify-center items-start">
                <div className='text-left'>
                    <h3 className="text-base font-bold font-headline leading-tight">{member.name}</h3>
                    {member.memberId && <p className="text-xs text-muted-foreground">ID: {member.memberId}</p>}
                    <p className="text-xs text-muted-foreground">{planName} Plan</p>
                </div>
                <div className="text-left text-[10px] w-full space-y-0 text-muted-foreground">
                    <div className='flex items-center gap-1'><Phone className='w-3 h-3' /><span>{member.mobileNumber}</span></div>
                    <div className='flex items-center gap-1'><MapPin className='w-3 h-3' /><span className="truncate w-48">{member.address}</span></div>
                    <div className='flex items-center gap-1'><Calendar className='w-3 h-3' /><span className='text-chart-2 font-medium'>Joined: {format(parseISO(member.joinDate), 'MMM dd, yyyy')}</span></div>
                    <div className='flex items-center gap-1'><Cake className='w-3 h-3' /><span className='text-destructive font-medium'>Expires: {format(parseISO(member.expiryDate), 'MMM dd, yyyy')}</span></div>
                </div>
                <Badge variant={getStatusBadgeVariant(status)} className="capitalize text-xs px-1.5 py-0 mt-0.5">{status}</Badge>
            </CardContent>
          </div>
      </div>
      <CardFooter className="p-1 bg-muted/50 flex items-center justify-around">
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
  );
}
