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
import { LoaderCircle, AlertCircle } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { useFirestore, useMemoFirebase, useUser, useCollection } from "@/firebase";
import { doc, updateDoc, serverTimestamp, query, collection, where } from "firebase/firestore";
import type { Member, Payment } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  memberId: z.string({ required_error: "Please select a member." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  paymentDate: z.string({ required_error: "Please select a payment date." }),
  paymentMethod: z.string().min(1, { message: "Payment method cannot be empty." }),
  paymentType: z.enum(['monthly', 'renewal', 'advance'], { required_error: "Please select a payment type." }),
  status: z.enum(['paid', 'pending']),
  invoiceNumber: z.string().optional(),
});

type EditPaymentFormProps = {
  payment: Payment;
  members: Member[];
  setDialogOpen: (open: boolean) => void;
};

export default function EditPaymentForm({ payment, members, setDialogOpen }: EditPaymentFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: payment.memberId,
      amount: payment.amount,
      paymentDate: format(parseISO(payment.paymentDate), 'yyyy-MM-dd'),
      paymentMethod: payment.paymentMethod,
      paymentType: payment.paymentType,
      status: payment.status,
      invoiceNumber: payment.invoiceNumber || "",
    },
  });

  const watchedMemberId = form.watch('memberId');
  const watchedDate = form.watch('paymentDate');

  const memberPaymentsQuery = useMemoFirebase(() => {
    if (!firestore || !watchedMemberId || !user) return null;
    return query(
      collection(firestore, "payments"),
      where("userId", "==", user.uid),
      where("memberId", "==", watchedMemberId)
    );
  }, [firestore, watchedMemberId, user]);
  const { data: memberPayments } = useCollection<Payment>(memberPaymentsQuery);

  const isDuplicate = useMemo(() => {
    if (!memberPayments || !watchedDate) return false;
    const targetDate = new Date(watchedDate + 'T00:00:00');
    // Check if any other payment (different ID) has the same date
    return memberPayments.some(p => p.id !== payment.id && isSameDay(parseISO(p.paymentDate), targetDate));
  }, [memberPayments, watchedDate, payment.id]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setDuplicateError(null);

    if (isDuplicate) {
        setDuplicateError(`Another payment record already exists for this member on ${format(new Date(values.paymentDate + 'T00:00:00'), 'dd MMM yyyy')}. Duplicate payments on the same date are not allowed.`);
        return;
    }

    setIsSubmitting(true);
    
    try {
      const paymentDocRef = doc(firestore, "payments", payment.id);
      const { invoiceNumber, ...rest } = values;

      const dataToSave: Partial<Payment> & { updatedAt: any } = {
        ...rest,
        paymentDate: new Date(values.paymentDate + 'T00:00:00').toISOString(),
        updatedAt: serverTimestamp(),
        ...(invoiceNumber && { invoiceNumber }),
      };

      await updateDoc(paymentDocRef, dataToSave);

      toast({
        title: "Payment Updated!",
        description: `The payment record has been successfully updated.`,
      });
      form.reset(values);
      setDialogOpen(false);
    } catch (error) {
      console.error("Error updating payment:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem updating the payment.",
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {duplicateError && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Duplicate Entry</AlertTitle>
                <AlertDescription>{duplicateError}</AlertDescription>
            </Alert>
        )}

        <FormField
          control={form.control}
          name="memberId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Member</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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

        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
               <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a payment method" />
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
              <FormLabel>Payment Type</FormLabel>
               <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a payment type" />
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
            <Button type="submit" disabled={isSubmitting || isDuplicate}>
                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </div>
      </form>
    </Form>
  );
}
