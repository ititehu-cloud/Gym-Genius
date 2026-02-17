'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { deleteDoc, doc } from "firebase/firestore";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Payment } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { format, parseISO } from "date-fns";

type DeleteMemberPaymentDialogProps = {
  payments: Payment[];
  memberName: string;
};

export default function DeleteMemberPaymentDialog({ payments, memberName }: DeleteMemberPaymentDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');

  const handleDelete = async () => {
    if (!selectedPaymentId) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Please select a payment to delete.",
        });
        return;
    }
    setIsDeleting(true);
    try {
      const paymentRef = doc(firestore, "payments", selectedPaymentId);
      await deleteDoc(paymentRef);
      toast({
        title: "Payment Deleted",
        description: `The payment record for ${memberName} has been removed.`,
      });
      setIsOpen(false);
      setSelectedPaymentId('');
    } catch (error) {
      console.error("Error deleting payment: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete payment. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button title="Delete Payment" className="flex-1 w-full rounded-none bg-yellow-500 hover:bg-yellow-600 text-white"><Trash2 /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete a payment for {memberName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the selected payment record. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {payments.length > 0 ? (
            <Select onValueChange={setSelectedPaymentId} value={selectedPaymentId}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a payment to delete" />
                </SelectTrigger>
                <SelectContent>
                    {payments.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                            {`₹${p.amount} on ${format(parseISO(p.paymentDate), 'PPP')}`}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No payments found for this member.</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting || !selectedPaymentId} className="bg-destructive hover:bg-destructive/90">
            {isDeleting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
