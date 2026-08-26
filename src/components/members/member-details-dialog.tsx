'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Member, Plan, Payment } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Badge } from "../ui/badge";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { ScrollArea } from "../ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { CreditCard, User, LoaderCircle } from "lucide-react";
import { useMemo } from "react";

type MemberDetailsDialogProps = {
  member: Member;
  plan?: Plan;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function MemberDetailsDialog({ member, plan, isOpen, onOpenChange }: MemberDetailsDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !member.id || !isOpen) return null;
    return query(
      collection(firestore, "payments"),
      where("userId", "==", user.uid),
      where("memberId", "==", member.id),
      orderBy("paymentDate", "desc")
    );
  }, [firestore, user, member.id, isOpen]);
  
  const { data: payments, isLoading: isLoadingPayments } = useCollection<Payment>(paymentsQuery);

  const totalPaid = useMemo(() => {
    if (!payments) return 0;
    return payments.reduce((sum, p) => p.status === 'paid' ? sum + p.amount : sum, 0);
  }, [payments]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl border-2 border-primary/20 [&>button]:text-primary-foreground [&>button]:opacity-100 [&>button]:bg-white/10 [&>button]:hover:bg-white/20 [&>button]:z-50 [&>button]:rounded-full [&>button]:p-1">
        <DialogHeader className="p-6 pb-4 bg-primary text-primary-foreground shrink-0">
          <div className="flex items-center gap-6">
             <Avatar className="h-20 w-20 border-4 border-white/20 shadow-xl">
                <AvatarImage src={member.imageUrl} alt={member.name} className="object-cover" />
                <AvatarFallback className="bg-white text-primary text-3xl font-bold">{member.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
                <DialogTitle className="text-3xl font-black uppercase tracking-tight">{member.name}</DialogTitle>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium opacity-90">
                    <span>ID: <span className="font-mono">{member.memberId}</span></span>
                    <span>•</span>
                    <span>{plan?.name || 'No Plan'}</span>
                    <span>•</span>
                    <Badge variant="outline" className="bg-white/10 text-white border-white/30 text-[10px] font-bold uppercase tracking-widest">
                        {member.status}
                    </Badge>
                </div>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Detailed information for member {member.name}, including profile and payment history.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-0">
            <Tabs defaultValue="profile" className="h-full flex flex-col">
                <div className="px-6 pt-4 bg-muted/30 border-b shrink-0">
                    <TabsList className="grid w-full grid-cols-2 h-12 bg-muted p-1">
                        <TabsTrigger value="profile" className="gap-2 font-bold uppercase text-[10px] tracking-widest">
                            <User className="h-4 w-4"/> Profile
                        </TabsTrigger>
                        <TabsTrigger value="payments" className="gap-2 font-bold uppercase text-[10px] tracking-widest">
                            <CreditCard className="h-4 w-4"/> Payments
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-hidden p-6">
                    <TabsContent value="profile" className="mt-0 h-full data-[state=active]:flex flex-col">
                        <ScrollArea className="h-full pr-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary border-l-4 border-primary pl-3">
                                        Personal Profile
                                    </h3>
                                    <div className="grid gap-3">
                                        <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Full Name</p>
                                            <p className="font-bold text-lg">{member.name}</p>
                                        </div>
                                        <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Member ID</p>
                                            <p className="font-black font-mono text-lg">{member.memberId}</p>
                                        </div>
                                        <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Mobile Number</p>
                                            <p className="font-bold text-lg">{member.mobileNumber || 'N/A'}</p>
                                        </div>
                                        <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Home Address</p>
                                            <p className="font-medium text-sm leading-relaxed">{member.address}</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-chart-2 border-l-4 border-chart-2 pl-3">
                                        Membership Status
                                    </h3>
                                    <div className="grid gap-3">
                                         <div className="p-3 bg-muted/40 rounded-lg space-y-1 border-l-4 border-primary">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Current Plan</p>
                                            <p className="font-black text-xl text-primary">{plan?.name || 'N/A'}</p>
                                            <p className="text-xs font-bold text-muted-foreground">₹{plan?.price} for {plan?.duration} Months</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-chart-2/10 rounded-lg space-y-1">
                                                <p className="text-[10px] font-bold text-chart-2 uppercase">Join Date</p>
                                                <p className="font-black text-chart-2">{format(parseISO(member.joinDate), 'dd MMM yyyy')}</p>
                                            </div>
                                            <div className="p-3 bg-destructive/10 rounded-lg space-y-1">
                                                <p className="text-[10px] font-bold text-destructive uppercase">Expiry Date</p>
                                                <p className="font-black text-destructive">{format(parseISO(member.expiryDate), 'dd MMM yyyy')}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Collections</p>
                                                <p className="text-2xl font-black text-primary">₹{totalPaid}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Plan Value</p>
                                                <p className="text-lg font-bold">₹{plan?.price || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="payments" className="mt-0 h-full data-[state=active]:flex flex-col">
                         {isLoadingPayments ? (
                             <div className="flex flex-col items-center justify-center flex-1 gap-4">
                                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading Transactions...</p>
                             </div>
                         ) : (
                            <div className="h-full flex flex-col">
                                <div className="mb-4 flex justify-between items-end shrink-0">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Payment Passbook</h3>
                                    <Badge variant="outline" className="font-mono">Total Records: {payments?.length || 0}</Badge>
                                </div>
                                <div className="flex-1 overflow-hidden border rounded-xl bg-card shadow-inner">
                                    <ScrollArea className="h-full">
                                        <Table>
                                            <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                                <TableRow>
                                                    <TableHead className="text-[10px] font-black uppercase">Date</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase">Type</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase">Method</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase">Amount</TableHead>
                                                    <TableHead className="text-center text-[10px] font-black uppercase">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {payments && payments.length > 0 ? (
                                                    payments.map((p) => (
                                                        <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                                                            <TableCell className="font-bold">{format(parseISO(p.paymentDate), 'dd MMM yyyy')}</TableCell>
                                                            <TableCell className="capitalize font-medium text-xs">{p.paymentType}</TableCell>
                                                            <TableCell className="capitalize font-medium text-xs">{p.paymentMethod}</TableCell>
                                                            <TableCell className="text-right font-black font-mono text-primary text-base">₹{p.amount}</TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge variant={p.status === 'paid' ? 'default' : 'destructive'} className={`${p.status === 'paid' ? 'bg-green-600 text-white' : ''} text-[9px] h-5`}>
                                                                    {p.status.toUpperCase()}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center py-20">
                                                            <div className="flex flex-col items-center gap-2 opacity-40">
                                                                <CreditCard className="h-10 w-10" />
                                                                <p className="text-sm font-bold uppercase tracking-widest">No transactions recorded</p>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>
                            </div>
                         )}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
