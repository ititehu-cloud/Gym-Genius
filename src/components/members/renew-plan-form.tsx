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
import { LoaderCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { Member } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const formSchema = z.object({
  newExpiryDate: z.string({ required_error: "Please select a new expiry date." }),
});

type RenewPlanFormProps = {
  member: Member;
  setDialogOpen: (open: boolean) => void;
};

export default function RenewPlanForm({ member, setDialogOpen }: RenewPlanFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newExpiryDate: format(parseISO(member.expiryDate), 'yyyy-MM-dd'),
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
      const memberDocRef = doc(firestore, "members", member.id);
      
      // The input type="date" returns a string in "yyyy-MM-dd" format.
      // We need to account for timezone differences when creating a Date object from it,
      // so we append T00:00:00 to treat it as local time at midnight.
      const newExpiryDateISO = new Date(values.newExpiryDate + 'T00:00:00').toISOString();

      await updateDoc(memberDocRef, {
        expiryDate: newExpiryDateISO,
        status: 'active' // Renewing should make them active
      });

      toast({
        title: "Membership Renewed!",
        description: `${member.name}'s membership has been extended.`,
      });
      setDialogOpen(false);
    } catch (error) {
      console.error("Error renewing membership:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem renewing the membership.",
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="newExpiryDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Expiry Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Renew
            </Button>
        </div>
      </form>
    </Form>
  );
}
