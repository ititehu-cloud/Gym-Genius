
'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, where } from "firebase/firestore";
import { LoaderCircle, ArrowLeft, AlertTriangle } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function TransactionsPage() {
    const firestore = useFirestore();
    const { user } = useUser();

    const [searchQuery, setSearchQuery] = useState("");
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    const paymentsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, "payments"), 
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
        );
    }, [firestore, user]);
    const { data: payments, isLoading: isLoadingPayments, error: paymentsError } = useCollection<Payment>(paymentsQuery);

    const membersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, "members"), 
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
        );
    }, [firestore, user]);
    const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersQuery);

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
            <div className="flex flex-1 items-center justify-center h-[60vh]">
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
                    <h1 className="text-2xl font-headline font-semibold uppercase tracking-tight">Passbook</h1>
                </div>
            </div>

            {paymentsError && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Database Index Required</AlertTitle>
                    <AlertDescription>
                        This query requires a Firestore index. Please check the browser console for a link to create it.
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex flex-col gap-4 no-print">
                <Input
                    placeholder="Search name, ID, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                />
                <div className="grid grid-cols-2 gap-2">
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
                            className="w-full"
                        />
                    </div>
                </div>
            </div>

            <Card className="border-2 shadow-xl rounded-xl overflow-hidden bg-white">
                <CardHeader className="bg-primary/5 border-b py-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tighter text-primary">Financial Ledger</CardTitle>
                            <CardDescription className="text-xs font-medium">
                                {filteredPayments.length} transactions recorded.
                            </CardDescription>
                        </div>
                        <div className="text-left sm:text-right bg-primary/10 p-3 rounded-lg border border-primary/20 w-full sm:w-auto">
                             <p className="text-[10px] font-black text-muted-foreground uppercase">Ledger Total</p>
                             <p className="text-2xl font-black text-primary">₹{totalAmount.toLocaleString()}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredPayments && filteredPayments.length > 0 ? (
                        <div className="overflow-x-auto scrollbar-thin">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Date</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Details</TableHead>
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
                                                <TableCell className="font-bold text-[11px] whitespace-nowrap">
                                                    {format(parseISO(payment.paymentDate), 'dd MMM')}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-black uppercase text-[12px] tracking-tight truncate max-w-[120px]">{member?.name || 'N/A'}</div>
                                                    <div className="text-[9px] font-bold text-muted-foreground font-mono flex gap-2">
                                                        <span className="capitalize">{payment.paymentType}</span>
                                                        <span>•</span>
                                                        <span className="uppercase">{payment.paymentMethod}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-black font-mono text-sm text-primary whitespace-nowrap">
                                                    ₹{payment.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className={`h-2 w-2 rounded-full mx-auto ${payment.status === 'paid' ? 'bg-green-600' : 'bg-destructive'}`} />
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
                         <div className="flex flex-col items-center justify-center text-center py-24 px-4">
                            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                <LoaderCircle className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                            <h3 className="text-lg font-bold tracking-tight uppercase">No Transactions</h3>
                            <p className="text-sm text-muted-foreground max-w-xs">Your filter returned no results for the selected period.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <style jsx global>{`
                @media print {
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
                        font-size: 10px !important;
                    }

                    .text-primary {
                        color: #000 !important;
                    }
                }
            `}</style>
        </main>
    );
}
