'use client';

import type { Member, Payment, Plan } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, LoaderCircle, History, Printer, CreditCard, IdCard, PhoneCall } from 'lucide-react';
import { format, parseISO, isSameDay, isSameMonth, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RecordPaymentForm from './record-payment-form';
import DeleteMemberPaymentDialog from './delete-member-payment-dialog';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Separator } from '../ui/separator';
import { WhatsAppIcon } from '../icons/whatsapp-icon';
import WhatsAppMessageDialog from '../members/whatsapp-message-dialog';

type PaymentStatusCardProps = {
    member: Member;
    plan: Plan | undefined;
    payments: Payment[];
    allMembers: Member[];
    gymName?: string | null;
    gymAddress?: string;
    gymIconUrl?: string | null;
    showHistoryInitially?: boolean;
    filterHistoryByDate?: string | null;
    filterHistoryByMonth?: string | null;
};

export default function PaymentStatusCard({ member, plan, payments, allMembers, gymName, gymAddress, gymIconUrl, showHistoryInitially = false, filterHistoryByDate = null, filterHistoryByMonth = null }: PaymentStatusCardProps) {
    const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
    const [isWhatsAppDialogOpen, setWhatsAppDialogOpen] = useState(false);
    const [showHistory, setShowHistory] = useState(showHistoryInitially);
    const router = useRouter();
    const { toast } = useToast();

    if (!plan) {
        return null;
    }

    const memberJoinDate = useMemo(() => parseISO(member.joinDate), [member.joinDate]);
    const memberExpiryDate = useMemo(() => parseISO(member.expiryDate), [member.expiryDate]);

    const paymentsForCurrentCycle = useMemo(() => {
        const leadTimeMs = 30 * 24 * 60 * 60 * 1000;
        const leadDate = new Date(memberJoinDate.getTime() - leadTimeMs);

        return payments.filter(p => {
            const paymentDate = parseISO(p.paymentDate);
            const isWithinCycle = paymentDate >= startOfDay(leadDate) && paymentDate <= endOfDay(memberExpiryDate);
            return isWithinCycle && p.status === 'paid';
        });
    }, [payments, memberJoinDate, memberExpiryDate]);

    const { dueForPeriod, statsDate } = useMemo(() => {
        const planPrice = plan.price;
        const referenceDate = filterHistoryByMonth ? new Date(filterHistoryByMonth + "-01T00:00:00") : new Date();

        if (filterHistoryByMonth && !isNaN(referenceDate.getTime())) {
            const monthlyInstallment = plan.duration > 0 ? planPrice / plan.duration : planPrice;
            const paymentsInSelectedMonth = paymentsForCurrentCycle.filter(p => {
                const paymentDate = parseISO(p.paymentDate);
                return isSameMonth(paymentDate, referenceDate);
            });

            const totalPaidForSelectedMonth = paymentsInSelectedMonth.reduce((acc, p) => acc + p.amount, 0);
            const dueForSelectedMonth = Math.max(0, monthlyInstallment - totalPaidForSelectedMonth);
            
            return {
                dueForPeriod: dueForSelectedMonth,
                statsDate: referenceDate
            };
        } 
        else {
            const totalPaidForCycle = paymentsForCurrentCycle.reduce((acc, p) => acc + p.amount, 0);
            const overallDue = Math.max(0, planPrice - totalPaidForCycle);

            return {
                dueForPeriod: overallDue,
                statsDate: new Date()
            };
        }

    }, [filterHistoryByMonth, paymentsForCurrentCycle, plan.price, plan.duration]);

    const hasPhone = !!member.mobileNumber && member.mobileNumber.trim().length > 0 && member.mobileNumber !== 'N/A';

    return (
        <Card className="relative w-full max-w-lg mx-auto shadow-lg rounded-2xl overflow-hidden flex flex-col bg-white border-2 border-primary/20 transition-all hover:shadow-xl hover:border-primary/30">
            {/* Top Right Decorative Accent */}
            <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-primary/30 rounded-tr-2xl pointer-events-none" />
            {/* Bottom Left Decorative Accent */}
            <div className="absolute bottom-16 left-0 w-16 h-16 border-b-4 border-l-4 border-primary/30 rounded-bl-2xl pointer-events-none" />

            <div className="relative p-6 pb-4">
                <div className="flex gap-6 items-start">
                    <div className="flex-shrink-0">
                        <Avatar className="h-24 w-24 rounded-full border-4 border-primary/10">
                            <AvatarImage src={member.imageUrl} alt={member.name} className="object-cover" />
                            <AvatarFallback className="bg-primary text-white text-3xl font-bold">{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>

                    <div className="flex-grow space-y-4 pt-1">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium text-muted-foreground leading-none">Name:</p>
                            <h3 className="text-2xl font-bold tracking-tight text-foreground">{member.name}</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">M ID</p>
                                <p className="text-base font-semibold">{member.memberId}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mobile:</p>
                                <p className="text-base font-semibold">{member.mobileNumber || "N/A"}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plan Expiry:</p>
                                <p className="text-base font-bold text-green-600">{format(parseISO(member.expiryDate), 'dd MMM yyyy')}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Due Amount:</p>
                                <p className="text-base font-bold text-destructive">₹{dueForPeriod.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showHistory && (
                <div className="px-6 pb-4 border-t pt-4 bg-white">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Transaction History</h4>
                    {payments.length > 0 ? (
                        <ul className="space-y-2">
                            {payments.slice(0, 3).map(payment => (
                                <li key={payment.id} className="flex justify-between items-center text-sm p-3 bg-muted/30 rounded-lg border border-muted/50">
                                    <div className="space-y-0.5">
                                        <p className='font-bold'>{format(parseISO(payment.paymentDate), 'dd MMM yyyy')}</p>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground">{payment.paymentType} • {payment.paymentMethod}</p>
                                    </div>
                                    <div className="text-right flex items-center gap-3">
                                        <p className="font-bold text-base">₹{payment.amount.toFixed(0)}</p>
                                        <Badge variant={payment.status === 'paid' ? 'default' : 'destructive'} className={`${payment.status === 'paid' ? 'bg-green-600 text-white' : ''} text-[10px] h-5`}>{payment.status.toUpperCase()}</Badge>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">No transactions found.</p>
                    )}
                </div>
            )}

            <Separator className="mx-6 w-auto bg-muted/40" />

            <div className="grid grid-cols-5 h-16 divide-x divide-muted/30 relative z-10 bg-white">
                <Button 
                    variant="ghost" 
                    className="flex flex-col gap-1 h-full rounded-none hover:bg-muted/30 text-muted-foreground"
                    onClick={() => router.push(`/receipt/${payments[0]?.id || ''}`)}
                    disabled={!payments.length}
                >
                    <Printer className="h-5 w-5 text-foreground" />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Receipt</span>
                </Button>

                <Button 
                    asChild 
                    variant="ghost" 
                    className="flex flex-col gap-1 h-full rounded-none hover:bg-muted/30 text-muted-foreground"
                    disabled={!hasPhone}
                >
                    {hasPhone ? (
                      <a href={`tel:${member.mobileNumber}`} className="flex flex-col items-center justify-center gap-1">
                        <PhoneCall className="h-5 w-5 text-foreground" />
                        <span className="text-[9px] font-bold uppercase tracking-tighter">Call</span>
                      </a>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 opacity-40">
                        <PhoneCall className="h-5 w-5" />
                        <span className="text-[9px] font-bold uppercase tracking-tighter">Call</span>
                      </div>
                    )}
                </Button>

                <Button 
                    variant="ghost" 
                    className="flex flex-col gap-1 h-full rounded-none hover:bg-muted/30 text-muted-foreground"
                    onClick={() => setWhatsAppDialogOpen(true)}
                    disabled={!hasPhone}
                >
                    <WhatsAppIcon className="h-5 w-5 text-green-600" />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Whatsapp</span>
                </Button>

                <Button 
                    variant="ghost" 
                    className="flex flex-col gap-1 h-full rounded-none hover:bg-muted/30 text-muted-foreground"
                    onClick={() => setRecordPaymentOpen(true)}
                >
                    <CreditCard className="h-5 w-5 text-foreground" />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Payment</span>
                </Button>

                <div className="h-full">
                    <DeleteMemberPaymentDialog payments={payments} memberName={member.name} />
                </div>
            </div>

            <WhatsAppMessageDialog 
                member={member} 
                gymName={gymName} 
                isOpen={isWhatsAppDialogOpen} 
                onOpenChange={setWhatsAppDialogOpen} 
            />

            <Dialog open={isRecordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Record New Payment</DialogTitle>
                        <DialogDescription>Recording a payment for {member.name}.</DialogDescription>
                    </DialogHeader>
                    <RecordPaymentForm members={allMembers} setDialogOpen={setRecordPaymentOpen} defaultMemberId={member.id} />
                </DialogContent>
            </Dialog>
        </Card>
    );
}
