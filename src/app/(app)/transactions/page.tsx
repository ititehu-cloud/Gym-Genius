'use client';

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { LoaderCircle, ArrowLeft } from "lucide-react";
import type { Member, Payment } from "@/lib/types";
import { useMemo, useState } from "react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DeletePaymentDialog from "@/components/payments/delete-payment-dialog";

export default function TransactionsPage() {
    const firestore = useFirestore();

    const [searchQuery, setSearchQuery] = useState("");
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    const paymentsQuery = useMemoFirebase(() => query(collection(firestore, "payments"), orderBy("createdAt", "desc")), [firestore]);
    const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);

    const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(
        useMemoFirebase(() => query(collection(firestore, "members"), orderBy("createdAt", "desc")), [firestore])
    );

    const memberMap = useMemo(() => {
        if (!members) return new Map<string, Member>();
        return new Map(members.map(m => [m.id, m]));
    }, [members]);

    const filteredPayments = useMemo(() => {
        if (!payments) return [];
        let tempPayments = [...payments];

        if (fromDate) {
            const startDate = startOfDay(parseISO(fromDate)).getTime();
            tempPayments = tempPayments.filter(p => parseISO(p.paymentDate).getTime() >= startDate);
        }
        if (toDate) {
            const endDate = endOfDay(parseISO(toDate)).getTime();
            tempPayments = tempPayments.filter(p => parseISO(p.paymentDate).getTime() <= endDate);
        }

        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            const matchingMemberIds = new Set<string>();

            members?.forEach(member => {
                if (
                    member.name.toLowerCase().includes(lowercasedQuery) ||
                    member.memberId.toLowerCase().includes(lowercasedQuery) ||
                    member.mobileNumber.includes(searchQuery)
                ) {
                    matchingMemberIds.add(member.id);
                }
            });

            tempPayments = tempPayments.filter(p => matchingMemberIds.has(p.memberId));
        }

        return tempPayments;
    }, [payments, members, searchQuery, fromDate, toDate]);
    
    const totalAmount = useMemo(() => {
        if (!filteredPayments) return 0;
        return filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
    }, [filteredPayments]);
    
    const isLoading = isLoadingPayments || isLoadingMembers;

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 transactions-container">
            <div className="flex items-center justify-between no-print">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="outline" size="icon" className="h-7 w-7">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Back</span>
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-headline font-semibold uppercase tracking-tight">Transaction Passbook</h1>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 no-print">
                <Input
                    placeholder="Search by name, ID, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:max-w-sm"
                />
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="grid w-full items-center gap-1.5">
                        <label htmlFor="from-date" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">From Date</label>
                        <Input
                            id="from-date"
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full"
                        />
                    </div>
                     <div className="grid w-full items-center gap-1.5">
                        <label htmlFor="to-date" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">To Date</label>
                        <Input
                            id="to-date"
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="full"
                        />
                    </div>
                </div>
            </div>

            <Card className="border-2 shadow-xl rounded-xl overflow-hidden bg-white">
                <CardHeader className="bg-primary/5 border-b py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tighter text-primary">Financial Ledger</CardTitle>
                            <CardDescription className="text-xs font-medium">
                                Showing {filteredPayments.length} transactions {fromDate && `from ${format(parseISO(fromDate), 'PP')}`} {toDate && `to ${format(parseISO(toDate), 'PP')}`}.
                            </CardDescription>
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] font-black text-muted-foreground uppercase">Ledger Total</p>
                             <p className="text-2xl font-black text-primary">₹{totalAmount.toLocaleString()}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredPayments && filteredPayments.length > 0 ? (
                        <div className="overflow-x-auto scrollbar-thin">
                            <Table className="min-w-[800px]">
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Date</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Member Details</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Payment Type</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Method</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Amount</TableHead>
                                        <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest no-print">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPayments.map((payment) => {
                                        const member = memberMap.get(payment.memberId);
                                        return (
                                            <TableRow key={payment.id} className="hover:bg-primary/5 transition-colors border-b">
                                                <TableCell className="font-bold text-xs whitespace-nowrap">
                                                    {format(parseISO(payment.paymentDate), 'dd MMM yyyy')}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-black uppercase text-sm tracking-tight">{member?.name || 'N/A'}</div>
                                                    <div className="text-[10px] font-bold text-muted-foreground font-mono">ID: {member?.memberId || 'N/A'}</div>
                                                </TableCell>
                                                 <TableCell className="capitalize">
                                                     <div className="text-xs font-bold">{payment.paymentType}</div>
                                                 </TableCell>
                                                 <TableCell className="capitalize">
                                                     <div className="text-[10px] font-black text-muted-foreground uppercase">{payment.paymentMethod}</div>
                                                 </TableCell>
                                                <TableCell className="text-right font-black font-mono text-base text-primary whitespace-nowrap">
                                                    ₹{payment.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge 
                                                        variant={payment.status === 'paid' ? 'default' : 'destructive'} 
                                                        className={`${payment.status === 'paid' ? 'bg-green-600' : ''} capitalize text-[9px] font-black h-5 px-3`}
                                                    >
                                                        {payment.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right no-print">
                                                    <DeletePaymentDialog 
                                                        paymentId={payment.id} 
                                                        memberName={member?.name || 'Unknown Member'} 
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center text-center py-24">
                            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                <LoaderCircle className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                            <h3 className="text-xl font-bold tracking-tight uppercase">No Transactions Found</h3>
                            <p className="text-sm text-muted-foreground max-w-xs">Your search or filter returned no results for the selected period.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <style jsx global>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 1cm;
                    }
                    
                    body {
                        background: white !important;
                        padding: 0 !important;
                    }

                    .no-print, header, nav, footer, button, .sidebar-trigger {
                        display: none !important;
                    }

                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                    }

                    .transactions-container {
                        display: block !important;
                    }

                    .card {
                        border: none !important;
                        box-shadow: none !important;
                        width: 100% !important;
                    }

                    table {
                        width: 100% !important;
                        border: 1px solid #eee !important;
                    }

                    th, td {
                        border-bottom: 1px solid #eee !important;
                        color: black !important;
                    }

                    .text-primary {
                        color: #000 !important;
                    }

                    .bg-green-600 {
                        background-color: transparent !important;
                        border: 1px solid #000 !important;
                        color: #000 !important;
                    }
                }
            `}</style>
        </main>
    );
}