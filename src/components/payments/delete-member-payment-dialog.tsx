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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { deleteDoc, doc } from "firebase/firestore";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
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

  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => parseISO(b.paymentDate).getTime() - parseISO(a.paymentDate).getTime());
  }, [payments]);

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
    <>
      <Button 
        variant="ghost" 
        className="flex flex-col gap-1 w-full h-full rounded-none hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        onClick={() => setIsOpen(true)}
      >
        <Trash2 className="h-5 w-5" />
        <span className="text-[9px] font-bold uppercase tracking-tighter">Delete</span>
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete a payment for {memberName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected payment record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {sortedPayments.length > 0 ? (
              <Select onValueChange={setSelectedPaymentId} value={selectedPaymentId}>
                  <SelectTrigger>
                      <SelectValue placeholder="Select a payment to delete" />
                  </SelectTrigger>
                  <SelectContent>
                      {sortedPayments.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                              {`₹${p.amount} (${p.paymentType}) on ${format(parseISO(p.paymentDate), 'dd MMM yyyy')}`}
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
    </>
  );
}