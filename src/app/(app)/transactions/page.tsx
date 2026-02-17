'use client';

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { LoaderCircle, ArrowLeft } from "lucide-react";
import type { Member, Payment } from "@/lib/types";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TransactionsPage() {
    const firestore = useFirestore();

    const paymentsQuery = useMemoFirebase(() => query(collection(firestore, "payments"), orderBy("paymentDate", "desc")), [firestore]);
    const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);

    const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(
        useMemoFirebase(() => collection(firestore, "members"), [firestore])
    );

    const memberMap = useMemo(() => {
        if (!members) return new Map<string, Member>();
        return new Map(members.map(m => [m.id, m]));
    }, [members]);
    
    const isLoading = isLoadingPayments || isLoadingMembers;

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="outline" size="icon" className="h-7 w-7">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Button>
                </Link>
                <h1 className="text-2xl font-headline font-semibold">All Transactions</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Transaction Passbook</CardTitle>
                    <CardDescription>
                        A chronological record of all payments received.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {payments && payments.length > 0 ? (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Member</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map((payment) => {
                                        const member = memberMap.get(payment.memberId);
                                        return (
                                            <TableRow key={payment.id}>
                                                <TableCell className="font-medium">
                                                    {format(parseISO(payment.paymentDate), 'PPP')}
                                                </TableCell>
                                                <TableCell>
                                                    <div>{member?.name || 'N/A'}</div>
                                                    <div className="text-xs text-muted-foreground">ID: {member?.memberId || 'N/A'}</div>
                                                </TableCell>
                                                 <TableCell className="capitalize">
                                                     <div>{payment.paymentType}</div>
                                                     <div className="text-xs text-muted-foreground">{payment.paymentMethod}</div>
                                                 </TableCell>
                                                <TableCell className="text-right font-mono">₹{payment.amount.toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant={payment.status === 'paid' ? 'default' : 'destructive'} className={`${payment.status === 'paid' ? 'bg-green-600' : ''} capitalize`}>{payment.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center text-center py-12">
                            <h3 className="text-xl font-bold tracking-tight">No Transactions Found</h3>
                            <p className="text-sm text-muted-foreground">No payments have been recorded yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
