'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FilePenLine } from "lucide-react";
import { useState } from "react";
import EditPaymentForm from "./edit-payment-form";
import type { Member, Payment } from "@/lib/types";

type EditPaymentDialogProps = {
  payment: Payment;
  members: Member[];
};

export default function EditPaymentDialog({ payment, members }: EditPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <FilePenLine className="h-4 w-4" />
          <span className="sr-only">Edit Payment</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Payment Details</DialogTitle>
          <DialogDescription>
            Update the payment record.
          </DialogDescription>
        </DialogHeader>
        <EditPaymentForm payment={payment} members={members} setDialogOpen={setIsOpen} />
      </DialogContent>
    </Dialog>
  );
}
