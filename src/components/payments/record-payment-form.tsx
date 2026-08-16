'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoaderCircle } from "lucide-react";
import { format, addMonths, parseISO } from "date-fns";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp, query, where, doc, updateDoc } from "firebase/firestore";
import type { Member, Plan, Payment } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";

const formSchema = z.object({
  memberId: z.string({ required_error: "Please select a member." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  paymentDate: z.string({ required_error: "Please select a payment date." }),
  paymentMethod: z.string().min(1, { message: "Payment method cannot be empty." }),
  paymentType: z.enum(['monthly', 'renewal', 'advance'], { required_error: "Please select a payment type." }),
  status: z.enum(['paid', 'pending']),
  invoiceNumber: z.string().optional(),
});

type RecordPaymentFormProps = {
  members: Member[];
  setDialogOpen: (open: boolean) => void;
  defaultMemberId?: string;
};

export default function RecordPaymentForm({ members, setDialogOpen, defaultMemberId }: RecordPaymentFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: defaultMemberId,
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'paid',
      paymentMethod: 'cash',
      paymentType: 'renewal',
    },
  });

  const selectedMemberId = form.watch('memberId');

  // Fetch plans to check prices and durations
  const plansRef = useMemoFirebase(() => collection(firestore, "plans"), [firestore]);
  const { data: plans } = useCollection<Plan>(plansRef);

  // Fetch existing payments for the selected member to calculate total paid
  const memberPaymentsQuery = useMemoFirebase(() => {
      if (!firestore || !selectedMemberId) return null;
      return query(
          collection(firestore, "payments"), 
          where("memberId", "==", selectedMemberId),
          where("status", "==", "paid")
      );
  }, [firestore, selectedMemberId]);
  const { data: memberPayments } = useCollection<Payment>(memberPaymentsQuery);

  const selectedMember = useMemo(() => 
    members.find(m => m.id === selectedMemberId), 
    [members, selectedMemberId]
  );

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
      const paymentsCollection = collection(firestore, "payments");
      const { invoiceNumber, ...rest } = values;

      const paymentDateISO = new Date(values.paymentDate + 'T00:00:00').toISOString();

      const dataToSave = {
        ...rest,
        paymentDate: paymentDateISO,
        createdAt: serverTimestamp(),
        ...(invoiceNumber && { invoiceNumber }),
      };

      // 1. Save the payment
      await addDoc(paymentsCollection, dataToSave);

      // 2. Logic to update member if payment is complete
      if (selectedMember && plans && values.status === 'paid') {
          const plan = plans.find(p => p.id === selectedMember.planId);
          if (plan) {
              const EPSILON = 0.01;
              const existingPaid = memberPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
              const totalAfterNewPayment = existingPaid + values.amount;

              // Check if the total paid meets or exceeds the plan price
              if (totalAfterNewPayment >= plan.price - EPSILON) {
                  const memberRef = doc(firestore, "members", selectedMember.id);
                  const newJoinDate = paymentDateISO;
                  const newExpiryDate = addMonths(new Date(paymentDateISO), plan.duration).toISOString();

                  await updateDoc(memberRef, {
                      joinDate: newJoinDate,
                      expiryDate: newExpiryDate,
                      status: 'active',
                      updatedAt: serverTimestamp()
                  });

                  toast({
                    title: "Membership Cycle Renewed!",
                    description: `Full payment received. ${selectedMember.name}'s membership has been renewed starting from ${format(parseISO(newJoinDate), 'PPP')}.`,
                  });
              }
          }
      }

      toast({
        title: "Payment Recorded!",
        description: `Payment for ${selectedMember?.name || 'member'} has been successfully recorded.`,
      });
      form.reset();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem recording the payment.",
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="memberId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Member</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!defaultMemberId}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {members.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} (ID: {member.memberId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="500" {...field} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />

        <FormField
          control={form.control}
          name="paymentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit card">Credit Card</SelectItem>
                        <SelectItem value="bank transfer">Bank Transfer</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />

            <FormField
            control={form.control}
            name="paymentType"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="renewal">Renewal</SelectItem>
                        <SelectItem value="advance">Advance</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select payment status" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />

        <FormField
          control={form.control}
          name="invoiceNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice Number (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="INV-2024-001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
            </Button>
        </div>
      </form>
    </Form>
  );
}
