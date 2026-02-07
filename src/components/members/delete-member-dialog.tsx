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

type DeleteMemberDialogProps = {
  memberId: string;
  memberName: string;
};

export default function DeleteMemberDialog({ memberId, memberName }: DeleteMemberDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const memberRef = doc(firestore, "members", memberId);
      await deleteDoc(memberRef);
      toast({
        title: "Member Deleted",
        description: `${memberName} has been removed.`,
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Error deleting member: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete member. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4" />
           <span className="hidden sm:inline ml-2">Delete</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the member profile for <strong>{memberName}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
            {isDeleting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
