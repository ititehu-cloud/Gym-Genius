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

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className} 
    xmlns="http://www.w3.org/2000/svg"
    style={{ overflow: 'visible' }}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .015 5.394 0 12.03c0 2.12.551 4.189 1.595 6.04L0 24l4.062-1.065a11.85 11.85 0 005.733 1.488h.005c6.632 0 12.032-5.396 12.033-12.034a11.83 11.83 0 00-3.353-8.697"/>
  </svg>
)

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

    const { totalPaidForPeriod, dueForPeriod, paymentStatusForPeriod, totalAmountForPlan, statsDate } = useMemo(() => {
        const planPrice = plan.price;
        const referenceDate = filterHistoryByMonth ? new Date(filterHistoryByMonth + "-01T00:00:00") : new Date();
        const EPSILON = 0.01;

        const getStatusStyles = (paid: number, total: number) => {
            if (paid <= EPSILON && total > 0) {
                return { text: 'Unpaid', variant: 'destructive' as const, className: '' };
            }
            if (paid < total - EPSILON) {
                return { text: 'Part Payment', variant: 'secondary' as const, className: 'bg-orange-500 border-orange-500 text-white hover:bg-orange-500/90' };
            }
            return { text: 'Paid', variant: 'default' as const, className: 'bg-green-600 border-green-600 text-white hover:bg-green-600/90' };
        };

        if (filterHistoryByMonth && !isNaN(referenceDate.getTime())) {
            const monthlyInstallment = plan.duration > 0 ? planPrice / plan.duration : planPrice;
            const paymentsInSelectedMonth = paymentsForCurrentCycle.filter(p => {
                const paymentDate = parseISO(p.paymentDate);
                return isSameMonth(paymentDate, referenceDate);
            });

            const totalPaidForSelectedMonth = paymentsInSelectedMonth.reduce((acc, p) => acc + p.amount, 0);
            const dueForSelectedMonth = Math.max(0, monthlyInstallment - totalPaidForSelectedMonth);
            
            return {
                totalPaidForPeriod: totalPaidForSelectedMonth,
                dueForPeriod: dueForSelectedMonth,
                paymentStatusForPeriod: getStatusStyles(totalPaidForSelectedMonth, monthlyInstallment),
                totalAmountForPlan: monthlyInstallment,
                statsDate: referenceDate
            };
        } 
        else {
            const totalPaidForCycle = paymentsForCurrentCycle.reduce((acc, p) => acc + p.amount, 0);
            const overallDue = Math.max(0, planPrice - totalPaidForCycle);

            return {
                totalPaidForPeriod: totalPaidForCycle,
                dueForPeriod: overallDue,
                paymentStatusForPeriod: getStatusStyles(totalPaidForCycle, planPrice),
                totalAmountForPlan: planPrice,
                statsDate: new Date()
            };
        }

    }, [filterHistoryByMonth, paymentsForCurrentCycle, plan.price, plan.duration]);

    const getMembershipStatus = () => {
        const checkDate = startOfMonth(statsDate);
        const expiry = parseISO(member.expiryDate);
        if (expiry < checkDate) {
            return { text: 'Expired', variant: 'destructive' as const, className:'' };
        }
        const join = parseISO(member.joinDate);
        if (join > endOfMonth(statsDate)) {
            return { text: 'Inactive', variant: 'outline' as const, className: '' };
        }
        return { text: 'Valid', variant: 'default' as const, className: 'bg-green-600 border-green-600 text-white hover:bg-green-600/90' };
    }

    const membershipStatus = getMembershipStatus();
    const hasPhone = !!member.mobileNumber && member.mobileNumber.trim().length > 0 && member.mobileNumber !== 'N/A';

    return (
        <Card className="relative w-full max-w-lg mx-auto shadow-lg rounded-2xl overflow-hidden flex flex-col bg-white border-2 border-primary/20 transition-all hover:shadow-xl hover:border-primary/30">
            {/* Top Right Decorative Accent */}
            <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-primary/30 rounded-tr-2xl pointer-events-none" />
            {/* Bottom Left Decorative Accent */}
            <div className="absolute bottom-16 left-0 w-16 h-16 border-b-4 border-l-4 border-primary/30 rounded-bl-2xl pointer-events-none" />

            <div className="relative p-6 pb-4">
                <div className="flex gap-6 items-start">
                    {/* Left: Avatar */}
                    <div className="flex-shrink-0">
                        <Avatar className="h-24 w-24 rounded-full border-4 border-primary/10">
                            <AvatarImage src={member.imageUrl} alt={member.name} className="object-cover" />
                            <AvatarFallback className="bg-primary text-white text-3xl font-bold">{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>

                    {/* Right: Details Grid */}
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

            {/* Bottom Toolbar */}
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
                    onClick={() => setShowHistory(!showHistory)}
                >
                    <History className={`h-5 w-5 ${showHistory ? 'text-primary' : 'text-foreground'}`} />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">History</span>
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
