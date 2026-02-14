'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, Share2, CalendarIcon, X, Printer } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isSameDay } from "date-fns";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import type { Member, Payment } from "@/lib/types";
import { useMemo, useState, useEffect, Suspense, useRef } from "react";
import RecordPaymentDialog from "@/components/payments/record-payment-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import EditPaymentDialog from "@/components/payments/edit-payment-dialog";
import DeletePaymentDialog from "@/components/payments/delete-payment-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { PaymentReceipt } from "@/components/payments/payment-receipt";
import { flushSync } from "react-dom";
import html2canvas from 'html2canvas';
import { uploadImage } from "@/app/actions";


function PaymentsList() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const { user, isUserLoading: isAuthLoading } = useUser();
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status') as "all" | "paid" | "pending" | null;
  const dateParam = searchParams.get('date');

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [paymentToPrint, setPaymentToPrint] = useState<Payment | null>(null);
  const [printingPaymentId, setPrintingPaymentId] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (statusParam) {
      setStatusFilter(statusParam);
    }
    if (dateParam === 'today') {
      setSelectedDate(new Date());
    }
  }, [statusParam, dateParam]);

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

    if (selectedDate) {
        filtered = filtered.filter(p => isSameDay(parseISO(p.paymentDate), selectedDate));
    }

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
  }, [payments, searchQuery, statusFilter, memberMap, selectedDate]);
  
  const isLoading = isLoadingPayments || isLoadingMembers || isAuthLoading || isProfileLoading;
  const gymName = userProfile?.displayName || user?.email;
  const gymAddress = userProfile?.displayAddress;
  const gymIconUrl = userProfile?.icon;
  
  const handlePrint = async (payment: Payment) => {
    if (printingPaymentId) return;

    const member = memberMap.get(payment.memberId);
    if (!member || !member.mobileNumber) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: 'Member mobile number not found. Cannot share receipt.',
      });
      return;
    }

    setPrintingPaymentId(payment.id);

    flushSync(() => {
      setPaymentToPrint(payment);
    });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const receiptElement = receiptRef.current;
    if (!receiptElement) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: "Could not find the receipt to process. Please try again.",
      });
      setPrintingPaymentId(null);
      setPaymentToPrint(null);
      return;
    }

    try {
      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        useCORS: true,
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
          throw new Error(uploadResult.error || "Could not get receipt image URL after upload.");
      }

      const imageUrl = uploadResult.url;
      const gymName = userProfile?.displayName || 'your gym';
      
      const message = `Payment receipt from ${gymName} for ${member.name}:\n${imageUrl}`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${member.mobileNumber}?text=${encodedMessage}`;
      
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    } catch (error) {
      console.error("Failed to process and share receipt:", error);
      toast({
        variant: "destructive",
        title: "Share Failed",
        description: error instanceof Error ? error.message : "There was a problem sharing the receipt. Please try again.",
      });
    } finally {
      setPrintingPaymentId(null);
      setPaymentToPrint(null);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h1 className="text-2xl font-headline font-semibold">Payments</h1>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto">
              <Input
                  placeholder="Search by member name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64"
              />
              <Select value={statusFilter} onValueChange={(value: "all" | "paid" | "pending") => setStatusFilter(value)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
              </Select>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button
                          variant={"outline"}
                          className={cn(
                              "w-full sm:w-[240px] justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                          )}
                      >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : <span>Filter by date</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                      />
                  </PopoverContent>
              </Popover>
              {selectedDate && (
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDate(undefined)}>
                      <X className="h-4 w-4" />
                      <span className="sr-only">Clear date filter</span>
                  </Button>
              )}
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
                              {filteredPayments.map(payment => {
                                  const memberName = memberMap.get(payment.memberId)?.name || 'Unknown Member';
                                  return (
                                  <TableRow key={payment.id}>
                                      <TableCell>{memberName}</TableCell>
                                      <TableCell>₹{payment.amount.toFixed(2)}</TableCell>
                                      <TableCell>{format(parseISO(payment.paymentDate), 'MMM dd, yyyy')}</TableCell>
                                      <TableCell className="capitalize">{payment.paymentMethod}</TableCell>
                                      <TableCell className="capitalize">{payment.paymentType}</TableCell>
                                      <TableCell>
                                          <Badge variant={payment.status === 'paid' ? 'default' : 'destructive'} className="capitalize">{payment.status}</Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                          <div className="flex justify-end items-center gap-2">
                                              <EditPaymentDialog payment={payment} members={members || []} />
                                              <DeletePaymentDialog paymentId={payment.id} memberName={memberName} />
                                              <Button variant="outline" size="icon" onClick={() => handlePrint(payment)} disabled={!!printingPaymentId}>
                                                {printingPaymentId === payment.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                                <span className="sr-only">Print Receipt</span>
                                              </Button>
                                          </div>
                                      </TableCell>
                                  </TableRow>
                              )})}
                          </TableBody>
                      </Table>
                  </div>
              ) : (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm py-12">
                      <div className="text-center">
                          <h3 className="text-2xl font-bold tracking-tight">No payments found</h3>
                          <p className="text-sm text-muted-foreground">
                              {searchQuery || statusFilter !== 'all' || selectedDate ? "Your filter returned no results." : "Record a payment to see it here."}
                          </p>
                      </div>
                  </div>
              )}
          </CardContent>
        </Card>
      </main>
      {paymentToPrint && memberMap.has(paymentToPrint.memberId) && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <PaymentReceipt
            ref={receiptRef}
            payment={paymentToPrint}
            member={memberMap.get(paymentToPrint.memberId)!}
            gymName={gymName}
            gymAddress={gymAddress}
            gymIconUrl={gymIconUrl}
          />
        </div>
      )}
    </>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>}>
      <PaymentsList />
    </Suspense>
  )
}
