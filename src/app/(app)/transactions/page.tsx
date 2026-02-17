'use client';

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { LoaderCircle, ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import type { Member, Payment } from "@/lib/types";
import { useMemo, useState } from "react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export default function TransactionsPage() {
    const firestore = useFirestore();

    const [searchQuery, setSearchQuery] = useState("");
    const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
    const [toDate, setToDate] = useState<Date | undefined>(undefined);

    const paymentsQuery = useMemoFirebase(() => query(collection(firestore, "payments"), orderBy("paymentDate", "desc")), [firestore]);
    const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);

    const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(
        useMemoFirebase(() => collection(firestore, "members"), [firestore])
    );

    const memberMap = useMemo(() => {
        if (!members) return new Map<string, Member>();
        return new Map(members.map(m => [m.id, m]));
    }, [members]);

    const filteredPayments = useMemo(() => {
        if (!payments) return [];
        let tempPayments = [...payments];

        if (fromDate) {
            const startDate = startOfDay(fromDate).getTime();
            tempPayments = tempPayments.filter(p => parseISO(p.paymentDate).getTime() >= startDate);
        }
        if (toDate) {
            const endDate = endOfDay(toDate).getTime();
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

            <div className="flex flex-col md:flex-row items-center gap-4">
                <Input
                    placeholder="Search by name, ID, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:max-w-sm"
                />
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !fromDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {fromDate ? format(fromDate, "PPP") : <span>From date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={fromDate}
                                onSelect={setFromDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !toDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {toDate ? format(toDate, "PPP") : <span>To date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={toDate}
                                onSelect={setToDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Transaction Passbook</CardTitle>
                    <CardDescription>
                        A chronological record of all payments received.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredPayments && filteredPayments.length > 0 ? (
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
                                    {filteredPayments.map((payment) => {
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
                            <p className="text-sm text-muted-foreground">Your search or filter returned no results.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
