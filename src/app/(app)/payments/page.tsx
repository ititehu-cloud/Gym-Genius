'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, Share2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import type { Member, Payment } from "@/lib/types";
import { useMemo, useState } from "react";
import RecordPaymentDialog from "@/components/payments/record-payment-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";


export default function PaymentsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "payments"), orderBy("paymentDate", "desc"));
  }, [firestore]);
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);

  const membersRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "members");
  }, [firestore]);
  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersRef);

  const memberMap = useMemo(() => {
    if (!members) return new Map<string, Member>();
    return new Map(members.map(m => [m.id, m]));
  }, [members]);

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    let filtered = payments;

    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    if (searchQuery) {
        filtered = filtered.filter(p => {
            const memberName = memberMap.get(p.memberId)?.name.toLowerCase() || '';
            return memberName.includes(searchQuery.toLowerCase());
        });
    }

    return filtered;
  }, [payments, searchQuery, statusFilter, memberMap]);
  
  const isLoading = isLoadingPayments || isLoadingMembers;

  const handleShare = (payment: Payment) => {
    const member = memberMap.get(payment.memberId);
    if (!member || !member.mobileNumber) {
        toast({
            variant: "destructive",
            title: "Cannot Share",
            description: "Member's mobile number is not available.",
        });
        return;
    }
    const message = `Hello ${member.name}, your payment has been received.\n\nDetails:\nAmount: ₹${payment.amount.toFixed(2)}\nDate: ${format(parseISO(payment.paymentDate), 'MMM dd, yyyy')}\nType: ${payment.paymentType}\nStatus: ${payment.status}\n\nThank you!`;
    const whatsappUrl = `https://wa.me/${member.mobileNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-headline font-semibold">Payments</h1>
        <div className="flex items-center gap-2">
            <Input
                placeholder="Search by member name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
            />
             <Select value={statusFilter} onValueChange={(value: "all" | "paid" | "pending") => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
            </Select>
            <RecordPaymentDialog members={members || []} />
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>All Transactions</CardTitle>
            <CardDescription>A log of all payments recorded in the system.</CardDescription>
        </CardHeader>
        <CardContent>
            {filteredPayments && filteredPayments.length > 0 ? (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Member</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Payment Date</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPayments.map(payment => (
                                <TableRow key={payment.id}>
                                    <TableCell>{memberMap.get(payment.memberId)?.name || 'Unknown Member'}</TableCell>
                                    <TableCell>₹{payment.amount.toFixed(2)}</TableCell>
                                    <TableCell>{format(parseISO(payment.paymentDate), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell className="capitalize">{payment.paymentMethod}</TableCell>
                                    <TableCell className="capitalize">{payment.paymentType}</TableCell>
                                    <TableCell>
                                        <Badge variant={payment.status === 'paid' ? 'default' : 'destructive'} className="capitalize">{payment.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="icon" onClick={() => handleShare(payment)}>
                                            <Share2 className="h-4 w-4" />
                                            <span className="sr-only">Share on WhatsApp</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                 <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm py-12">
                    <div className="text-center">
                        <h3 className="text-2xl font-bold tracking-tight">No payments found</h3>
                        <p className="text-sm text-muted-foreground">
                            {searchQuery || statusFilter !== 'all' ? "Your filter returned no results." : "Record a payment to see it here."}
                        </p>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </main>
  );
}
