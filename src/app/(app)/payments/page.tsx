'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, Share2, CalendarIcon, X } from "lucide-react";
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
  const [paymentToProcess, setPaymentToProcess] = useState<Payment | null>(null);
  const [sharingPaymentId, setSharingPaymentId] = useState<string | null>(null);
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
  
  const generateReceiptBlob = async (payment: Payment): Promise<Blob | null> => {
    const member = memberMap.get(payment.memberId);
    if (!member) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: 'Member data for this payment was not found.',
      });
      return null;
    }

    // This renders the receipt component off-screen to be captured.
    flushSync(() => {
      setPaymentToProcess(payment);
    });
    
    // Give React a moment to render the component before we try to capture it.
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const receiptElement = receiptRef.current;
    if (!receiptElement) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: "Could not find the receipt component to process. Please try again.",
      });
      setPaymentToProcess(null);
      return null;
    }

    try {
      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        
      if (!blob) {
          throw new Error("Failed to create image from receipt canvas.");
      }
      return blob;
    } catch (error) {
      console.error("Failed to generate receipt blob:", error);
      toast({
        variant: "destructive",
        title: "Image Generation Failed",
        description: error instanceof Error ? error.message : "There was a problem generating the receipt image.",
      });
      return null;
    } finally {
      // Clean up the off-screen component after processing.
      setPaymentToProcess(null);
    }
  };

  const handleShareReceipt = async (payment: Payment) => {
    if (sharingPaymentId) return;

    const member = memberMap.get(payment.memberId);
    if (!member) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: 'Member data for this payment was not found.',
      });
      return;
    }

    setSharingPaymentId(payment.id);
    
    try {
        const blob = await generateReceiptBlob(payment);
        if (!blob) {
            // Error is already toasted inside generateReceiptBlob
            return;
        }

        const formData = new FormData();
        formData.append('image', blob, `Receipt_${member.name.replace(/ /g, '_')}.png`);
        
        const uploadResult = await uploadImage(formData);

        if (uploadResult.error || !uploadResult.url) {
            throw new Error(uploadResult.error || "Could not get receipt image URL after upload.");
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
                        img { max-width: 95%; max-height: 75vh; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
                        .controls { display: flex; margin-top: 1.5rem; width: 100%; max-width: 600px; }
                        input { flex-grow: 1; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; font-size: 0.875rem; background-color: #ffffff; border-radius: 0.375rem 0 0 0.375rem; color: #374151; outline: none; }
                        button { padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-left: none; background-color: #f4f4f5; color: #374151; cursor: pointer; border-radius: 0 0.375rem 0.375rem 0; font-weight: 500; font-size: 0.875rem; transition: background-color 0.2s; }
                        button:hover { background-color: #e5e7eb; }
                        .close-button { margin-top: 1rem; padding: 0.5rem 1.5rem; background-color: #ef4444; color: white; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; }
                        .close-button:hover { background-color: #dc2626; }
                    </style>
                </head>
                <body>
                    <img src="${uploadResult.url}" alt="Payment Receipt for ${member.name}">
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
                description: "Please check your browser's pop-up settings.",
            });
        }

    } catch (error) {
        console.error("Sharing failed:", error);
        toast({
            variant: "destructive",
            title: "Share Failed",
            description: error instanceof Error ? error.message : "Could not share the receipt. Please try again.",
        });
    } finally {
        setSharingPaymentId(null);
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
                                  const isProcessing = sharingPaymentId === payment.id;
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
                                              <Button variant="outline" size="icon" onClick={() => handleShareReceipt(payment)} disabled={isProcessing}>
                                                {sharingPaymentId === payment.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                                                <span className="sr-only">Share Receipt</span>
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
      {paymentToProcess && memberMap.has(paymentToProcess.memberId) && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <PaymentReceipt
            ref={receiptRef}
            payment={paymentToProcess}
            member={memberMap.get(paymentToProcess.memberId)!}
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
