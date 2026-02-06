'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, LoaderCircle } from "lucide-react";
import { format, addMonths } from "date-fns";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { Plan } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Textarea } from "../ui/textarea";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  mobileNumber: z.string().min(10, { message: "Please enter a valid mobile number." }),
  address: z.string().min(5, { message: "Address is too short." }),
  planId: z.string({ required_error: "Please select a membership plan." }),
  joinDate: z.date({ required_error: "Please select a joining date." }),
  profilePic: z.any().optional(), // File upload validation can be complex, keeping it simple for now
});

type AddMemberFormProps = {
  setDialogOpen: (open: boolean) => void;
};

export default function AddMemberForm({ setDialogOpen }: AddMemberFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const plansRef = useMemoFirebase(() => collection(firestore, "plans"), [firestore]);
  const { data: plans, isLoading: isLoadingPlans } = useCollection<Plan>(plansRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      mobileNumber: "",
      address: "",
      joinDate: new Date(),
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    if (!plans) {
        toast({ variant: 'destructive', title: 'Error', description: 'Plans not loaded. Cannot calculate expiry date.' });
        setIsSubmitting(false);
        return;
    }

    const selectedPlan = plans.find(p => p.id === values.planId);
    if (!selectedPlan) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected plan not found.' });
        setIsSubmitting(false);
        return;
    }
    
    const expiryDate = addMonths(values.joinDate, selectedPlan.duration);

    // TODO: Implement image upload to a service like imgbb.cc and get the URL.
    // For now, using a placeholder.
    const imageUrl = `https://picsum.photos/seed/${Math.random()}/400/400`;
    
    try {
      const membersCollection = collection(firestore, "members");
      await addDoc(membersCollection, {
        ...values,
        joinDate: values.joinDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        status: 'active',
        imageUrl: imageUrl,
        createdAt: serverTimestamp()
      });

      toast({
        title: "Member Added!",
        description: `${values.name} has been successfully added.`,
      });
      form.reset();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error adding member:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem adding the member. Please try again.",
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} />
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
          name="profilePic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Picture</FormLabel>
              <FormControl>
                <Input type="file" accept="image/*" onChange={(e) => field.onChange(e.target.files)} />
              </FormControl>
               <FormDescription>
                Image upload to imgbb is not implemented. A placeholder will be used.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
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
                    <FormLabel className="mb-1">Joining Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
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
                            onSelect={field.onChange}
                            disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Add Member
            </Button>
        </div>
      </form>
    </Form>
  );
}
