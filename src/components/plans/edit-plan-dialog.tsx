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
import EditPlanForm from "./edit-plan-form";
import type { Plan } from "@/lib/types";

type EditPlanDialogProps = {
  plan: Plan;
};

export default function EditPlanDialog({ plan }: EditPlanDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <FilePenLine className="mr-2 h-4 w-4" />
          Edit Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Plan Details</DialogTitle>
          <DialogDescription>
            Update the details for the {plan.name} plan.
          </DialogDescription>
        </DialogHeader>
        <EditPlanForm plan={plan} setDialogOpen={setIsOpen} />
      </DialogContent>
    </Dialog>
  );
}
