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
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, LoaderCircle } from "lucide-react";
import { addMonths, format, parseISO } from "date-fns";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { Member, Plan } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Textarea } from "../ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "../ui/alert-dialog";


const formSchema = z.object({
  memberId: z.string().min(1, { message: "Member ID cannot be empty." }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  mobileNumber: z.string().min(10, { message: "Please enter a valid mobile number." }),
  address: z.string().min(5, { message: "Address is too short." }),
  planId: z.string({ required_error: "Please select a membership plan." }),
  joinDate: z.date({ required_error: "Please select a joining date." }),
  status: z.enum(['active', 'expired', 'due']),
});

type EditMemberFormProps = {
  member: Member;
  setDialogOpen: (open: boolean) => void;
};

export default function EditMemberForm({ member, setDialogOpen }: EditMemberFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmationOpen, setConfirmationOpen] = useState(false);
  const [formData, setFormData] = useState<z.infer<typeof formSchema> | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const plansRef = useMemoFirebase(() => collection(firestore, "plans"), [firestore]);
  const { data: plans, isLoading: isLoadingPlans } = useCollection<Plan>(plansRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: member.memberId || '',
      name: member.name,
      mobileNumber: member.mobileNumber,
      address: member.address,
      planId: member.planId,
      joinDate: parseISO(member.joinDate),
      status: member.status,
    },
  });

  const planChanged = form.watch('planId') !== member.planId;
  const joinDateChanged = form.watch('joinDate')?.toISOString().split('T')[0] !== parseISO(member.joinDate).toISOString().split('T')[0];

  function onFormSubmit(values: z.infer<typeof formSchema>) {
    setFormData(values);
    if (planChanged || joinDateChanged) {
        setConfirmationOpen(true);
    } else {
        handleUpdate(values);
    }
  }

  async function handleUpdate(values: z.infer<typeof formSchema>, updateExpiry: boolean = false) {
    setIsSubmitting(true);
    setConfirmationOpen(false);

    if (!plans) {
      toast({ variant: 'destructive', title: 'Error', description: 'Plans not loaded.' });
      setIsSubmitting(false);
      return;
    }

    const memberDocRef = doc(firestore, "members", member.id);

    const updateData: Partial<Member & {updatedAt: any}> = {
        ...values,
        joinDate: values.joinDate.toISOString(),
        updatedAt: serverTimestamp()
    };
    
    if(updateExpiry) {
        const selectedPlan = plans.find(p => p.id === values.planId);
        if (!selectedPlan) {
            toast({ variant: 'destructive', title: 'Error', description: 'Selected plan not found.' });
            setIsSubmitting(false);
            return;
        }
        const newExpiryDate = addMonths(values.joinDate, selectedPlan.duration);
        updateData.expiryDate = newExpiryDate.toISOString();
    }


    try {
      await updateDoc(memberDocRef, updateData);

      toast({
        title: "Member Updated!",
        description: `${values.name}'s details have been successfully updated.`,
      });
      form.reset(values);
      setDialogOpen(false);
    } catch (error) {
      console.error("Error updating member:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem updating the member. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="memberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Member ID</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., GYM-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mobileNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number</FormLabel>
                <FormControl>
                  <Input placeholder="9876543210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Textarea placeholder="123, Main Street, Anytown..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="planId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Membership Plan</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingPlans}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingPlans ? "Loading plans..." : "Select a plan"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {plans?.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ₹{plan.price}
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
            name="joinDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Joining Date</FormLabel>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        type="button"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setIsCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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
                                    <SelectValue placeholder="Select member status" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                                <SelectItem value="due">Due</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
          <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
              </Button>
          </div>
        </form>
      </Form>
      <AlertDialog open={isConfirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Update Expiry Date?</AlertDialogTitle>
                <AlertDialogDescription>
                    You have changed the membership plan or the joining date. Do you want to automatically recalculate and update the membership expiry date based on the new selection?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <Button variant="outline" onClick={() => formData && handleUpdate(formData, false)} disabled={isSubmitting}>
                    No, Keep Old Expiry
                </Button>
                <AlertDialogAction onClick={() => formData && handleUpdate(formData, true)} disabled={isSubmitting}>
                    {isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Yes, Update Expiry
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
