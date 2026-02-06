import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { Member } from "@/lib/types";
import { plans } from '@/lib/data';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

type MemberCardProps = {
  member: Member;
};

export default function MemberCard({ member }: MemberCardProps) {
  const plan = plans.find(p => p.id === member.planId);
  const expiryDate = parseISO(member.expiryDate);

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

  return (
    <Card className="flex flex-col overflow-hidden transition-transform duration-300 hover:scale-105 hover:shadow-xl">
      <CardHeader className="p-0">
        <div className="relative h-40 w-full">
            <Image
                src={member.avatar.imageUrl}
                alt={`Photo of ${member.name}`}
                fill
                className="object-cover"
                data-ai-hint={member.avatar.imageHint}
            />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-6 text-center flex-grow">
        <h3 className="text-lg font-semibold font-headline">{member.name}</h3>
        <p className="text-sm text-muted-foreground">{member.email}</p>
        <div className="mt-4 flex items-center gap-2">
            <span className="font-semibold">{plan?.name || 'No Plan'}</span>
            <Badge variant={getStatusBadgeVariant(member.status)} className="capitalize">{member.status}</Badge>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50 p-4 text-sm text-muted-foreground justify-center">
        <span>Expires on: {format(expiryDate, 'MMM dd, yyyy')}</span>
      </CardFooter>
    </Card>
  );
}
