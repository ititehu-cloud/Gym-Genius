'use client';

import Image from 'next/image';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Member } from "@/lib/types";
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { format, parseISO } from 'date-fns';
import { Cake, Calendar, Phone, Share2, MapPin, LoaderCircle, Download } from 'lucide-react';
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import EditMemberDialog from './edit-member-dialog';
import DeleteMemberDialog from './delete-member-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MemberCardProps = {
  member: Member;
  planName: string;
  gymName?: string | null;
  gymAddress?: string;
  gymIconUrl?: string | null;
};

export default function MemberCard({ member, planName, gymName, gymAddress, gymIconUrl }: MemberCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [shareableImageUrl, setShareableImageUrl] = useState<string | null>(null);
  
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

    const cardElement = cardRef.current;
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
      
      const canShareFiles = !!navigator.share && !!navigator.canShare;
      if (canShareFiles) {
          const file = await new Promise<File | null>((resolve) => {
              canvas.toBlob((blob) => {
                  if (!blob) {
                      resolve(null);
                      return;
                  }
                  resolve(new File([blob], `${member.name.replace(/ /g, '_')}_ID_Card.png`, { type: 'image/png' }));
              }, 'image/png');
          });

          if (file && navigator.canShare({ files: [file] })) {
              await navigator.share({
                  files: [file],
                  title: `${member.name}'s ID Card`,
                  text: `Here is the ID card for ${member.name}.`,
              });
              if (badgeElement) { (badgeElement as HTMLElement).style.visibility = 'visible'; }
              setIsSharing(false);
              return; 
          }
      }

      // Fallback for browsers/devices that don't support native sharing
      const imageUrl = canvas.toDataURL('image/png');
      setShareableImageUrl(imageUrl);
      setShowSharePreview(true);

    } catch (error) {
        console.error("Sharing failed:", error);
        toast({
            variant: "destructive",
            title: "Operation Failed",
            description: "Could not create or share the ID card. Please try again.",
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
      <Dialog open={showSharePreview} onOpenChange={(isOpen) => {
          setShowSharePreview(isOpen);
          if (!isOpen) {
              setShareableImageUrl(null);
          }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share ID Card</DialogTitle>
            <DialogDescription>
              Click the download button to save the image, or long-press the image to see sharing options.
            </DialogDescription>
          </DialogHeader>
          {shareableImageUrl && (
            <>
                <div className="mt-4 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shareableImageUrl} alt="Member ID Card Preview" className="max-w-full rounded-md" />
                </div>
                <DialogFooter className="sm:justify-center mt-4">
                    <Button asChild>
                        <a href={shareableImageUrl} download={`${member.name.replace(/ /g, '_')}_ID_Card.png`}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Image
                        </a>
                    </Button>
                </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
