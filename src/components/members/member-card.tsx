'use client';

import Image from 'next/image';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Member } from "@/lib/types";
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { format, parseISO } from 'date-fns';
import { Cake, Calendar, Mail, Phone, Share2, MapPin, LoaderCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

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
    const expiry = parseISO(member.expiryDate);
    if (expiry < today) {
      return 'expired';
    }
    // You could add 'due' logic here if needed
    return 'active';
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
      const file = new File([blob], `${member.name.replace(' ', '_')}_ID_Card.png`, { type: 'image/png' });

      // Use Web Share API if available
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${member.name}'s ID Card`,
          text: `Here is the ID card for ${member.name}.`,
        });
      } else {
        // Fallback for browsers that don't support Web Share API or file sharing
        toast({
            variant: "destructive",
            title: "Sharing Not Supported",
            description: "Your browser does not support sharing images directly. Please take a screenshot.",
        });
      }
    } catch (error) {
        console.error("Sharing failed:", error);
        toast({
            variant: "destructive",
            title: "Sharing Failed",
            description: "Could not share the ID card. Please try again.",
        });
    } finally {
        setIsSharing(false);
    }
  };

  return (
    <Card ref={cardRef} className="overflow-hidden bg-card w-full max-w-sm mx-auto">
      <div className="flex bg-primary text-primary-foreground font-headline">
          <div className="p-3 text-left w-1/2 flex items-center">
            <h2 className="text-md font-bold truncate">{gymName}</h2>
          </div>
          <div className="p-3 text-left w-1/2 border-l-2 border-primary-foreground/30 flex items-center">
             <p className="text-sm truncate">{gymAddress || 'Address not set'}</p>
          </div>
      </div>
      <div className="flex">
        <div className="p-4 flex justify-center items-start">
            <div className="relative h-20 w-20 rounded-full overflow-hidden border-4 border-primary/50 flex-shrink-0">
                <Image
                    src={member.imageUrl}
                    alt={`Photo of ${member.name}`}
                    fill
                    className="object-cover"
                    crossOrigin="anonymous" // Required for html2canvas with external images
                />
            </div>
        </div>
        <CardContent className="p-4 pt-4 flex flex-col justify-center items-start">
            <div className='text-left mb-3'>
                <h3 className="text-lg font-bold font-headline">{member.name}</h3>
                <p className="text-xs text-muted-foreground">{planName} Plan</p>
            </div>
            <div className="text-left text-xs w-full space-y-1 text-muted-foreground mb-3">
                <div className='flex items-center gap-2'><Mail className='w-3 h-3' /><span>{member.email}</span></div>
                <div className='flex items-center gap-2'><Phone className='w-3 h-3' /><span>{member.mobileNumber}</span></div>
                <div className='flex items-center gap-2'><MapPin className='w-3 h-3' /><span>{member.address}</span></div>
                <div className='flex items-center gap-2'><Calendar className='w-3 h-3' /><span>Joined: {format(parseISO(member.joinDate), 'MMM dd, yyyy')}</span></div>
                <div className='flex items-center gap-2'><Cake className='w-3 h-3' /><span>Expires: {format(parseISO(member.expiryDate), 'MMM dd, yyyy')}</span></div>
            </div>
            <Badge variant={getStatusBadgeVariant(status)} className="capitalize">{status}</Badge>
        </CardContent>
      </div>
      <CardFooter className="p-3 bg-muted/50">
        <Button className="w-full" size="sm" onClick={handleShare} disabled={isSharing}>
          {isSharing ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="mr-2 h-4 w-4" />
          )}
          Share on WhatsApp
        </Button>
      </CardFooter>
    </Card>
  );
}
