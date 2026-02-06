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
import AddPlanForm from "./add-plan-form";

export default function AddPlanDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle />
          Add Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add New Plan</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new membership plan.
          </DialogDescription>
        </DialogHeader>
        <AddPlanForm setDialogOpen={setIsOpen} />
      </DialogContent>
    </Dialog>
  );
}
