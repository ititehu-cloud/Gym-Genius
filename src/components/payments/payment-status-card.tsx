'use client';

import type { Member, Payment, Plan } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Printer, Trash2, LoaderCircle, History } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RecordPaymentForm from './record-payment-form';
import DeleteMemberPaymentDialog from './delete-member-payment-dialog';
import { useState, useRef } from 'react';
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
};

export default function PaymentStatusCard({ member, plan, payments, allMembers, gymName, gymAddress, gymIconUrl }: PaymentStatusCardProps) {
    const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [paymentToProcess, setPaymentToProcess] = useState<Payment | null>(null);
    const receiptRef = useRef<HTMLDivElement>(null);
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

    const handlePrintReceipt = async () => {
        if (isSharing) return;
        if (payments.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Payments',
                description: 'There are no payments to create a receipt for.',
            });
            return;
        }

        setIsSharing(true);
        const latestPayment = [...payments].sort((a, b) => parseISO(b.paymentDate).getTime() - parseISO(a.paymentDate).getTime())[0];
        
        flushSync(() => {
            setPaymentToProcess(latestPayment);
        });

        const receiptElement = receiptRef.current;
        if (!receiptElement) {
            toast({
                variant: "destructive",
                title: "Print Failed",
                description: "Cannot find receipt element to print.",
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
            
            if (!blob) {
                throw new Error("Failed to create image from receipt.");
            }

            const formData = new FormData();
            formData.append('image', blob, `Receipt_${member.name.replace(/ /g, '_')}.png`);
            
            const uploadResult = await uploadImage(formData);

            if (uploadResult.error || !uploadResult.url) {
                throw new Error(uploadResult.error || "Could not get image URL after upload.");
            }
            
            const newTab = window.open('', '_blank');
            if (newTab) {
                newTab.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Share Payment Receipt</title>
                        <style>
                            body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #f4f4f5; font-family: sans-serif; padding: 20px; box-sizing: border-box; }
                            img { max-width: 95%; max-height: 75vh; border: 1px solid #e5e7eb; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
                            .controls { display: flex; margin-top: 1.5rem; width: 100%; max-width: 600px; }
                            input { flex-grow: 1; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; font-size: 0.875rem; background-color: #ffffff; border-radius: 0.375rem 0 0 0.375rem; color: #374151; outline: none; }
                            button { padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-left: none; background-color: #f4f4f5; color: #374151; cursor: pointer; border-radius: 0 0.375rem 0.375rem 0; font-weight: 500; font-size: 0.875rem; transition: background-color 0.2s; }
                            button:hover { background-color: #e5e7eb; }
                            .close-button { margin-top: 1rem; padding: 0.5rem 1.5rem; background-color: #ef4444; color: white; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; }
                            .close-button:hover { background-color: #dc2626; }
                        </style>
                    </head>
                    <body>
                        <img src="${uploadResult.url}" alt="Payment receipt for ${member.name}">
                        <div class="controls">
                            <input type="text" value="${uploadResult.url}" id="copy-input" readonly>
                            <button id="copy-btn">Copy Link</button>
                        </div>
                        <button id="close-btn" class="close-button">Close</button>
                        <script>
                            document.getElementById('copy-btn').addEventListener('click', () => {
                                const input = document.getElementById('copy-input');
                                navigator.clipboard.writeText(input.value).then(() => {
                                    const btn = document.getElementById('copy-btn');
                                    btn.textContent = 'Copied!';
                                    setTimeout(() => { btn.textContent = 'Copy Link'; }, 2000);
                                }).catch(err => {
                                    console.error('Failed to copy: ', err);
                                });
                            });
                             document.getElementById('close-btn').addEventListener('click', () => {
                                window.close();
                            });
                        </script>
                    </body>
                    </html>
                `);
                newTab.document.close();
            } else {
                toast({
                    variant: "destructive",
                    title: "Could not open new tab",
                    description: "Please disable your pop-up blocker.",
                });
            }

        } catch (error) {
            console.error("Printing/Sharing receipt failed:", error);
            toast({
                variant: "destructive",
                title: "Print Failed",
                description: error instanceof Error ? error.message : "Could not generate the receipt. Please try again.",
            });
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
                        <Avatar className="h-16 w-16 rounded-md border-2 border-primary">
                            <AvatarImage src={member.imageUrl} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>
                </div>
                {showHistory && (
                    <div className="px-4 pb-4 border-t pt-4 pr-12">
                        <h4 className="font-semibold mb-2 text-center">Transaction History</h4>
                        {payments.length > 0 ? (
                            <ul className="space-y-2">
                                {payments.map(payment => (
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
                            <p className="text-sm text-muted-foreground text-center">No transactions found.</p>
                        )}
                    </div>
                )}
                <div data-buttons="actions" className="absolute right-0 top-0 bottom-0 flex flex-col w-12 rounded-r-lg overflow-hidden border-l">
                    <Button onClick={() => setRecordPaymentOpen(true)} title="Add Payment" className="flex-1 w-full rounded-none bg-green-500 hover:bg-green-600 text-white"><Plus /></Button>
                    <Button onClick={handlePrintReceipt} disabled={isSharing} title="Print Receipt" className="flex-1 w-full rounded-none bg-red-500 hover:bg-red-600 text-white">
                        {isSharing ? <LoaderCircle className="animate-spin" /> : <Printer />}
                    </Button>
                    <Button onClick={() => setShowHistory(!showHistory)} title="Payment History" className="flex-1 w-full rounded-none bg-blue-500 hover:bg-blue-600 text-white"><History /></Button>
                    <DeleteMemberPaymentDialog payments={payments} memberName={member.name} />
                </div>
            </Card>

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

            {paymentToProcess && (
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                    <PaymentReceipt
                        ref={receiptRef}
                        payment={paymentToProcess}
                        member={member}
                        allPayments={payments}
                        gymName={gymName}
                        gymAddress={gymAddress}
                        gymIconUrl={gymIconUrl}
                    />
                </div>
            )}
        </>
    );
}
