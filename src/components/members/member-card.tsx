'use client';

import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { Member } from "@/lib/types";
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { format, parseISO } from 'date-fns';
import { Cake, Calendar, Mail, Phone, Share2 } from 'lucide-react';

type MemberCardProps = {
  member: Member;
  planName: string;
};

export default function MemberCard({ member, planName }: MemberCardProps) {
  
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
  
  const handleShare = () => {
    const cardDetails = `
*Gym Member ID Card*
---------------------
*Name:* ${member.name}
*Plan:* ${planName}
*Membership valid until:* ${format(parseISO(member.expiryDate), 'MMM dd, yyyy')}
*Status:* ${status.charAt(0).toUpperCase() + status.slice(1)}
---------------------
    `.trim();

    const encodedText = encodeURIComponent(cardDetails);
    
    // Using a more universal link that works on both mobile and desktop
    const whatsappUrl = `https://wa.me/${member.mobileNumber}?text=${encodedText}`;
    
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Card className="flex flex-col overflow-hidden transition-transform duration-300 hover:scale-105 hover:shadow-xl w-full max-w-sm mx-auto">
      <CardHeader className="bg-primary text-primary-foreground p-4 text-center font-headline">
        <h2 className="text-lg font-bold">Gym Member</h2>
      </CardHeader>
      <CardContent className="p-6 flex flex-col items-center text-center gap-4">
        <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-primary/50">
            <Image
                src={member.imageUrl}
                alt={`Photo of ${member.name}`}
                fill
                className="object-cover"
            />
        </div>
        <div className='text-center'>
            <h3 className="text-xl font-bold font-headline">{member.name}</h3>
            <p className="text-sm text-muted-foreground">{planName} Plan</p>
        </div>
        <div className="text-left text-sm w-full space-y-2 text-muted-foreground">
            <div className='flex items-center gap-3'><Mail className='w-4 h-4' /><span>{member.email}</span></div>
            <div className='flex items-center gap-3'><Phone className='w-4 h-4' /><span>{member.mobileNumber}</span></div>
            <div className='flex items-center gap-3'><Calendar className='w-4 h-4' /><span>Joined: {format(parseISO(member.joinDate), 'MMM dd, yyyy')}</span></div>
            <div className='flex items-center gap-3'><Cake className='w-4 h-4' /><span>Expires: {format(parseISO(member.expiryDate), 'MMM dd, yyyy')}</span></div>
        </div>
         <Badge variant={getStatusBadgeVariant(status)} className="capitalize">{status}</Badge>
      </CardContent>
      <CardFooter className="p-4 bg-muted/50">
        <Button className="w-full" onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Share on WhatsApp
        </Button>
      </CardFooter>
    </Card>
  );
}
