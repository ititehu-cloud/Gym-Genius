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
import { LoaderCircle, ClipboardList, Calendar, Banknote, CreditCard, MessageSquare } from "lucide-react";
import { format, addMonths, parseISO, startOfDay } from "date-fns";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where } from "firebase/firestore";
import type { Member, Plan } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import { ScrollArea } from "../ui/scroll-area";

const formSchema = z.object({
  planId: z.string({ required_error: "Please select a plan." }),
  planStartDate: z.string({ required_error: "Please select a start date." }),
  paymentDate: z.string({ required_error: "Please select a payment date." }),
  paidAmount: z.coerce.number().min(0, { message: "Paid amount cannot be negative." }),
  paymentMethod: z.string({ required_error: "Please select a payment method." }),
  comments: z.string().optional(),
});

type RenewPlanFormProps = {
  member: Member;
  setDialogOpen: (open: boolean) => void;
};

export default function RenewPlanForm({ member, setDialogOpen }: RenewPlanFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const plansRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "plans"), where("userId", "==", user.uid));
  }, [firestore, user]);
  const { data: plans } = useCollection<Plan>(plansRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      planId: member.planId,
      planStartDate: format(new Date(), 'yyyy-MM-dd'),
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paidAmount: 0,
      paymentMethod: "cash",
      comments: "",
    },
  });

  const watchedPlanId = form.watch('planId');
  const watchedPaidAmount = form.watch('paidAmount') || 0;

  const selectedPlan = useMemo(() => plans?.find(p => p.id === watchedPlanId), [plans, watchedPlanId]);
  const dueAmount = useMemo(() => (selectedPlan?.price || 0) - watchedPaidAmount, [selectedPlan, watchedPaidAmount]);

  // Pre-fill amount when plan changes
  useEffect(() => {
    if (selectedPlan) {
      form.setValue('paidAmount', selectedPlan.price);
    }
  }, [selectedPlan, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !selectedPlan) return;
    setIsSubmitting(true);
    
    try {
      const startDate = new Date(values.planStartDate + 'T00:00:00');
      const newExpiryDate = addMonths(startDate, selectedPlan.duration);

      // 1. Update Member Profile (Anchoring the cycle)
      const memberDocRef = doc(firestore, "members", member.id);
      await updateDoc(memberDocRef, {
        planId: values.planId,
        joinDate: startDate.toISOString(),
        expiryDate: newExpiryDate.toISOString(),
        status: 'active',
        updatedAt: serverTimestamp()
      });

      // 2. Record Payment
      if (values.paidAmount > 0) {
        await addDoc(collection(firestore, "payments"), {
          userId: user.uid,
          memberId: member.id,
          amount: values.paidAmount,
          paymentDate: new Date(values.paymentDate + 'T00:00:00').toISOString(),
          paymentMethod: values.paymentMethod,
          paymentType: 'renewal',
          status: 'paid',
          createdAt: serverTimestamp()
        });
      }

      // 3. Add Note for Comments
      if (values.comments?.trim()) {
        await addDoc(collection(firestore, "notes"), {
          userId: user.uid,
          memberId: member.id,
          content: `Renewal Comment: ${values.comments.trim()}`,
          noteDate: new Date().toISOString(),
          createdAt: serverTimestamp()
        });
      }

      toast({
        title: "Plan Renewed!",
        description: `${member.name}'s membership has been successfully updated.`,
      });
      setDialogOpen(false);
    } catch (error) {
      console.error("Renewal error:", error);
      toast({
        variant: "destructive",
        title: "Renewal Failed",
        description: "An error occurred while updating the plan. Please try again.",
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-5">
            {/* Select Gym Plan */}
            <FormField
              control={form.control}
              name="planId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Select Gym Plan</FormLabel>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00695c]">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="pl-11 h-12 bg-white border-gray-200 rounded-xl shadow-sm focus:ring-[#00695c]">
                          <SelectValue placeholder="Choose a plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans?.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.price})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="px-1 text-sm font-bold text-gray-700">
                Plan Amount: ₹{selectedPlan?.price || 0}
            </div>

            {/* Plan Start Date */}
            <FormField
              control={form.control}
              name="planStartDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Plan Start Date *</FormLabel>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00695c]">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <FormControl>
                      <Input type="date" className="pl-11 h-12 bg-white border-gray-200 rounded-xl shadow-sm" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Date */}
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00695c]">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <FormControl>
                      <Input type="date" placeholder="Payment Date" className="pl-11 h-12 bg-white border-gray-200 rounded-xl shadow-sm" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Paid Amount */}
            <FormField
              control={form.control}
              name="paidAmount"
              render={({ field }) => (
                <FormItem>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00695c]">
                      <Banknote className="h-5 w-5" />
                    </div>
                    <FormControl>
                      <Input type="number" placeholder="Paid Amount" className="pl-11 h-12 bg-white border-gray-200 rounded-xl shadow-sm text-lg font-bold" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00695c]">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="pl-11 h-12 bg-white border-gray-200 rounded-xl shadow-sm">
                          <SelectValue placeholder="Payment Method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className={`px-1 text-sm font-bold ${dueAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                Due Amount: ₹{dueAmount}
            </div>

            {/* Comments */}
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <div className="relative">
                    <div className="absolute left-3 top-4 text-[#00695c]">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <FormControl>
                      <Input placeholder="Comments" className="pl-11 h-12 bg-white border-gray-200 rounded-xl shadow-sm" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setDialogOpen(false)}
                className="font-bold text-gray-500"
            >
                Cancel
            </Button>
            <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#00695c] hover:bg-[#004d40] text-white font-bold h-12 px-8 rounded-xl min-w-[140px] shadow-lg shadow-[#00695c]/20"
            >
                {isSubmitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : "RENEW PLAN"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
