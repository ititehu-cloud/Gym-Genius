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
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import RecordPaymentForm from "./record-payment-form";
import type { Member } from "@/lib/types";

type RecordPaymentDialogProps = {
    members: Member[];
}

export default function RecordPaymentDialog({ members }: RecordPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Record New Payment</DialogTitle>
          <DialogDescription>
            Fill in the details below to log a payment from a member.
          </DialogDescription>
        </DialogHeader>
        <RecordPaymentForm members={members} setDialogOpen={setIsOpen} />
      </DialogContent>
    </Dialog>
  );
}
