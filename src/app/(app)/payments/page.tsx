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

  const handleShare = (payment: Payment) => {
    const member = memberMap.get(payment.memberId);
    if (!member || !member.mobileNumber) {
      toast({
        variant: 'destructive',
        title: 'Share Failed',
        description: 'Member mobile number not found for this payment.',
      });
      return;
    }
    
    const gymName = userProfile?.displayName || 'the gym';
    const message = `Hello ${member.name}, this is a receipt for your payment of ₹${payment.amount.toFixed(2)} at ${gymName}. Thank you for your payment!`;
    const encodedMessage = encodeURIComponent(message);
    
    // This assumes the mobile number includes the country code for WhatsApp.
    const whatsappUrl = `https://wa.me/${member.mobileNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };
  
  const handlePrint = async (payment: Payment) => {
    if (printingPaymentId) return;
    setPrintingPaymentId(payment.id);

    flushSync(() => {
      setPaymentToPrint(payment);
    });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const receiptElement = receiptRef.current;
    if (!receiptElement) {
      toast({
        variant: "destructive",
        title: "Print Error",
        description: "Could not find the receipt to print. Please try again.",
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

      const imageUrl = canvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank');
      
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Receipt - ${memberMap.get(payment.memberId)?.name || ''}</title>
              <style>
                @media print {
                  @page { margin: 0; size: auto; }
                  body { margin: 0; }
                  img { width: 100%; height: auto; page-break-inside: avoid; }
                }
                body { margin: 0; }
                img { max-width: 100%; height: auto; display: block; margin-inline: auto; }
              </style>
            </head>
            <body>
              <img src="${imageUrl}" alt="Payment Receipt" />
              <script>
                window.onload = function() {
                  const img = document.querySelector('img');
                  if (img.complete) {
                    window.print();
                  } else {
                    img.onload = function() {
                      window.print();
                    }
                  }
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        toast({
            variant: "destructive",
            title: "Popup Blocked",
            description: "Please allow popups for this site to print the receipt.",
        });
      }
    } catch (error) {
      console.error("Failed to generate print image:", error);
      toast({
        variant: "destructive",
        title: "Print Failed",
        description: "There was a problem generating the receipt image. Please try again.",
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
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 pb-20">
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
              <Popover>
                  <PopoverTrigger asChild>
                      <Button
                          variant={"outline"}
                          className={cn(
                              "w-[240px] justify-start text-left font-normal",
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
                                              <Button variant="outline" size="icon" onClick={() => handleShare(payment)} disabled={!!printingPaymentId}>
                                                  <Share2 className="h-4 w-4" />
                                                  <span className="sr-only">Share Receipt</span>
                                              </Button>
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
