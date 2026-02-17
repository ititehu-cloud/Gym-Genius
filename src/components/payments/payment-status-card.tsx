'use client';

import type { Member, Payment, Plan } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Printer, Trash2, LoaderCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RecordPaymentForm from './record-payment-form';
import DeleteMemberPaymentDialog from './delete-member-payment-dialog';
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import { uploadImage } from '@/app/actions';

type PaymentStatusCardProps = {
    member: Member;
    plan: Plan | undefined;
    payments: Payment[];
    allMembers: Member[];
};

export default function PaymentStatusCard({ member, plan, payments, allMembers }: PaymentStatusCardProps) {
    const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    if (!plan) {
        return null;
    }
    
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const due = plan.price - totalPaid;

    const getPaymentStatus = () => {
        if (totalPaid <= 0) return { text: 'Unpaid', variant: 'destructive' as const, className: '' };
        if (due > 0) return { text: 'Part Payment', variant: 'secondary' as const, className: 'bg-orange-500 border-orange-500 text-white hover:bg-orange-500/90' };
        return { text: 'Paid', variant: 'default' as const, className: 'bg-green-600 border-green-600 text-white hover:bg-green-600/90' };
    };

    const getMembershipStatus = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = parseISO(member.expiryDate);
        if (expiry < today) {
            return { text: 'Expired', variant: 'destructive' as const, className:'' };
        }
        return { text: 'Valid', variant: 'default' as const, className: 'bg-green-600 border-green-600 text-white hover:bg-green-600/90' };
    }

    const paymentStatus = getPaymentStatus();
    const membershipStatus = getMembershipStatus();
    const validity = `${format(parseISO(member.joinDate), 'dd-MM-yyyy')} to ${format(parseISO(member.expiryDate), 'dd-MM-yyyy')}`;

    const handleShare = async () => {
        if (isSharing) return;
        setIsSharing(true);
    
        const element = cardRef.current;
        if (!element) {
          toast({ variant: "destructive", title: "Error", description: "Card element not found." });
          setIsSharing(false);
          return;
        }

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                onclone: (document) => {
                    // Hide buttons during capture
                    const buttons = document.querySelector('[data-buttons="actions"]');
                    if (buttons) (buttons as HTMLElement).style.display = 'none';
                }
            });
            
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                
            if (!blob) throw new Error("Failed to create image blob.");
    
            const formData = new FormData();
            formData.append('image', blob, `Payment_Status_${member.name.replace(/ /g, '_')}.png`);
            
            const uploadResult = await uploadImage(formData);
    
            if (uploadResult.error || !uploadResult.url) {
                throw new Error(uploadResult.error || "Could not get image URL after upload.");
            }
          
            const newTab = window.open(uploadResult.url, '_blank');
            if (!newTab) {
                toast({
                    variant: "destructive",
                    title: "Could not open new tab",
                    description: "Please disable your pop-up blocker.",
                });
            }
        } catch (error) {
            console.error("Sharing failed:", error);
            toast({
                variant: "destructive",
                title: "Share Failed",
                description: error instanceof Error ? error.message : "Could not share the payment status.",
            });
        } finally {
            setIsSharing(false);
        }
    };
    
    return (
        <>
            <div ref={cardRef}>
                <Card className="w-full max-w-lg mx-auto shadow-lg rounded-lg overflow-hidden relative">
                    <div className="flex justify-between pr-12">
                        <CardContent className="p-4 flex-grow space-y-2">
                            <div className="grid grid-cols-[max-content,1fr] gap-x-4 gap-y-1 text-sm items-center">
                                <span className="font-medium text-muted-foreground">Reg. Number :</span>
                                <span>{member.memberId}</span>

                                <span className="font-medium text-muted-foreground">Name :</span>
                                <span className="font-semibold text-lg">{member.name}</span>
                                
                                <span className="font-medium text-muted-foreground">M.ship Type :</span>
                                <span>{plan.name}</span>

                                <span className="font-medium text-muted-foreground">Validity :</span>
                                <span>{validity}</span>

                                <span className="font-medium text-muted-foreground">Amount :</span>
                                <span>₹{plan.price.toFixed(2)}</span>

                                <span className="font-medium text-muted-foreground">Paid :</span>
                                <span>₹{totalPaid.toFixed(2)}</span>

                                <span className="font-medium text-muted-foreground">Due :</span>
                                <span className="font-bold">₹{due > 0 ? due.toFixed(2) : '0.00'}</span>

                                <span className="font-medium text-muted-foreground">Payment Status :</span>
                                <div><Badge variant={paymentStatus.variant} className={paymentStatus.className}>{paymentStatus.text}</Badge></div>
                                
                                <span className="font-medium text-muted-foreground">Membership Status :</span>
                                <div><Badge variant={membershipStatus.variant} className={membershipStatus.className}>{membershipStatus.text}</Badge></div>
                            </div>
                        </CardContent>
                        <div className="p-4 flex-shrink-0 flex items-start">
                            <Avatar className="h-24 w-24 border-2 border-primary">
                                <AvatarImage src={member.imageUrl} alt={member.name} />
                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                    <div data-buttons="actions" className="absolute right-0 top-0 bottom-0 flex flex-col w-12 rounded-r-lg overflow-hidden border-l">
                        <Button onClick={() => setRecordPaymentOpen(true)} title="Add Payment" className="flex-1 w-full rounded-none bg-green-500 hover:bg-green-600 text-white"><Plus /></Button>
                        <Button onClick={handleShare} disabled={isSharing} title="Print Status" className="flex-1 w-full rounded-none bg-red-500 hover:bg-red-600 text-white">
                            {isSharing ? <LoaderCircle className="animate-spin" /> : <Printer />}
                        </Button>
                        <DeleteMemberPaymentDialog payments={payments} memberName={member.name} />
                    </div>
                </Card>
            </div>

            <Dialog open={isRecordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                    <DialogTitle>Record New Payment</DialogTitle>
                    <DialogDescription>
                        Recording a payment for {member.name}.
                    </DialogDescription>
                    </DialogHeader>
                    <RecordPaymentForm members={allMembers} setDialogOpen={setRecordPaymentOpen} defaultMemberId={member.id} />
                </DialogContent>
            </Dialog>
        </>
    );
}
