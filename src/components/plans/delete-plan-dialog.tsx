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
import { useState } from "react";

type DeletePlanDialogProps = {
  planId: string;
  planName: string;
};

export default function DeletePlanDialog({ planId, planName }: DeletePlanDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const planRef = doc(firestore, "plans", planId);
      await deleteDoc(planRef);
      toast({
        title: "Plan Deleted",
        description: `${planName} has been removed.`,
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Error deleting plan: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete plan. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon"
        className="h-10 w-10 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive border"
        onClick={() => setIsOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Delete Plan</span>
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the membership plan <strong>{planName}</strong>. 
              Note: Existing members already assigned to this plan will remain assigned, but you won't be able to select it for new registrations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-white">
              {isDeleting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
