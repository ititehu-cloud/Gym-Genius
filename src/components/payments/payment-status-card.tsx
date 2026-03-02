'use client';

import type { Member, Payment, Plan } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Share2, LoaderCircle, History } from 'lucide-react';
import { format, parseISO, isSameDay, isSameMonth, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RecordPaymentForm from './record-payment-form';
import DeleteMemberPaymentDialog from './delete-member-payment-dialog';
import { useState, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/app/actions';
import html2canvas from 'html2canvas';
import { PaymentReceipt } from './payment-receipt';
import { flushSync } from 'react-dom';

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
    const [isSharing, setIsSharing] = useState(false);
    const [showHistory, setShowHistory] = useState(showHistoryInitially);
    const [paymentToProcess, setPaymentToProcess] = useState<Payment | null>(null);
    const receiptRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    if (!plan) {
        return null;
    }

    const memberJoinDate = useMemo(() => parseISO(member.joinDate), [member.joinDate]);
    const memberExpiryDate = useMemo(() => parseISO(member.expiryDate), [member.expiryDate]);

    const paymentsForCurrentCycle = useMemo(() => {
        // Include payments made up to 30 days before joining (advance/renewal lead time)
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
    const validity = `${format(parseISO(member.joinDate), 'dd-MM-yyyy')} to ${format(parseISO(member.expiryDate), 'dd-MM-yyyy')}`;

    const paymentsToShow = useMemo(() => {
        const allMemberPayments = payments;
        if (filterHistoryByDate === 'today') {
            const today = new Date();
            return allMemberPayments.filter(p => isSameDay(parseISO(p.paymentDate), today));
        }
        if (filterHistoryByMonth) {
             try {
                const monthDate = new Date(filterHistoryByMonth + "-01T00:00:00");
                if (isNaN(monthDate.getTime())) return [];
                return allMemberPayments.filter(p => isSameMonth(parseISO(p.paymentDate), monthDate));
            } catch(e) {
                return [];
            }
        }
        return [];
    }, [payments, filterHistoryByDate, filterHistoryByMonth]);

    const handleShareReceipt = async () => {
        if (isSharing) return;
        if (paymentsForCurrentCycle.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Payments',
                description: 'There are no paid transactions in the current cycle to create a receipt for.',
            });
            return;
        }

        setIsSharing(true);
        const latestPayment = [...paymentsForCurrentCycle].sort((a, b) => parseISO(b.paymentDate).getTime() - parseISO(a.paymentDate).getTime())[0];
        
        // Ensure the component is rendered for capture
        flushSync(() => {
            setPaymentToProcess(latestPayment);
        });

        const receiptElement = receiptRef.current;
        if (!receiptElement) {
            toast({
                variant: "destructive",
                title: "Share Failed",
                description: "Cannot find receipt element to share.",
            });
            setIsSharing(false);
            return;
        }

        try {
            const canvas = await html2canvas(receiptElement, {
                useCORS: true,
                scale: 2,
                backgroundColor: '#ffffff',
            });
            
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error("Failed to create image from receipt.");

            const fileName = `Receipt_${member.name.replace(/ /g, '_')}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            // Trigger Native Android/iOS Share Sheet
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Payment Receipt - ${member.name}`,
                    text: `Receipt for payment at ${gymName || 'the gym'}.`,
                });
            } else {
                // Fallback: Upload and open in new tab for manual save/print
                const formData = new FormData();
                formData.append('image', blob, fileName);
                const uploadResult = await uploadImage(formData);
                if (uploadResult.error || !uploadResult.url) throw new Error(uploadResult.error || "Could not share or upload receipt.");
                window.open(uploadResult.url, '_blank');
            }
        } catch (error) {
            console.error("Sharing receipt failed:", error);
            // Don't show toast for AbortError (user cancelled)
            if (error instanceof Error && error.name !== 'AbortError') {
                toast({
                    variant: "destructive",
                    title: "Share Failed",
                    description: error.message || "Could not generate or share the receipt.",
                });
            }
        } finally {
            setIsSharing(false);
            setPaymentToProcess(null);
        }
    }
    
    return (
        <>
            <Card className="w-full max-w-lg mx-auto shadow-lg rounded-lg overflow-hidden relative">
                <div className="flex justify-between pr-12">
                    <CardContent className="p-4 flex-grow space-y-2">
                        <div className="grid grid-cols-[max-content,1fr] gap-x-4 gap-y-1 text-sm items-center">
                            <span className="font-bold">Reg. Number :</span>
                            <span>{member.memberId}</span>
                            <span className="font-bold">Name :</span>
                            <span className="font-semibold text-lg">{member.name}</span>
                            <span className="font-bold">M.ship Type :</span>
                            <span>{plan.name}</span>
                            <span className="font-bold">Validity :</span>
                            <span>{validity}</span>
                            <span className="font-bold">Amount :</span>
                            <span>₹{totalAmountForPlan.toFixed(2)}</span>
                            <span className="font-bold">Paid :</span>
                            <span>₹{totalPaidForPeriod.toFixed(2)}</span>
                            <span className="font-bold">Due :</span>
                            <span className="font-bold">₹{dueForPeriod > 0 ? dueForPeriod.toFixed(2) : '0.00'}</span>
                            <span className="font-bold">Payment Status :</span>
                            <div><Badge variant={paymentStatusForPeriod.variant} className={paymentStatusForPeriod.className}>{paymentStatusForPeriod.text}</Badge></div>
                            <span className="font-bold">Membership Status :</span>
                            <div><Badge variant={membershipStatus.variant} className={membershipStatus.className}>{membershipStatus.text}</Badge></div>
                        </div>
                    </CardContent>
                    <div className="p-4 flex-shrink-0 flex items-start">
                        <Avatar className="h-16 w-16 rounded-md border-2 border-primary">
                            <AvatarImage src={member.imageUrl} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>
                </div>
                {showHistory && (
                    <div className="px-4 pb-4 border-t pt-4 pr-12">
                        <h4 className="font-semibold mb-2 text-center">Transaction History</h4>
                        {paymentsToShow.length > 0 ? (
                            <ul className="space-y-2">
                                {paymentsToShow.map(payment => (
                                    <li key={payment.id} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded-md">
                                        <div>
                                            <p className='font-medium'>{format(parseISO(payment.paymentDate), 'PPP')}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{payment.paymentType} - {payment.paymentMethod}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg">₹{payment.amount.toFixed(2)}</p>
                                            <Badge variant={payment.status === 'paid' ? 'default' : 'destructive'} className={`${payment.status === 'paid' ? 'bg-green-600' : ''} capitalize`}>{payment.status}</Badge>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center">No transactions found for the selected period.</p>
                        )}
                    </div>
                )}
                <div data-buttons="actions" className="absolute right-0 top-0 bottom-0 flex flex-col w-12 rounded-r-lg overflow-hidden border-l">
                    <Button onClick={() => setRecordPaymentOpen(true)} title="Add Payment" className="flex-1 w-full rounded-none bg-green-500 hover:bg-green-600 text-white"><Plus /></Button>
                    <Button onClick={handleShareReceipt} disabled={isSharing} title="Share Receipt" className="flex-1 w-full rounded-none bg-red-500 hover:bg-red-600 text-white">
                        {isSharing ? <LoaderCircle className="animate-spin" /> : <Share2 />}
                    </Button>
                    <Button onClick={() => setShowHistory(!showHistory)} title="Payment History" className="flex-1 w-full rounded-none bg-blue-500 hover:bg-blue-600 text-white"><History /></Button>
                    <DeleteMemberPaymentDialog payments={payments} memberName={member.name} />
                </div>
            </Card>

            <Dialog open={isRecordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                    <DialogTitle>Record New Payment</DialogTitle>
                    <DialogDescription>Recording a payment for {member.name}.</DialogDescription>
                    </DialogHeader>
                    <RecordPaymentForm members={allMembers} setDialogOpen={setRecordPaymentOpen} defaultMemberId={member.id} />
                </DialogContent>
            </Dialog>

            {paymentToProcess && (
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                    <PaymentReceipt
                        ref={receiptRef}
                        payment={paymentToProcess}
                        member={member}
                        allPayments={paymentsForCurrentCycle}
                        gymName={gymName}
                        gymAddress={gymAddress}
                        gymIconUrl={gymIconUrl}
                    />
                </div>
            )}
        </>
    );
}