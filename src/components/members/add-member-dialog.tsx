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
import AddMemberForm from "./add-member-form";

export default function AddMemberDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-none w-full h-screen h-[100dvh] m-0 p-0 rounded-none border-none flex flex-col bg-background">
        <DialogHeader className="p-6 border-b shrink-0">
          <DialogTitle className="text-2xl font-bold tracking-tight">Add New Member</DialogTitle>
          <DialogDescription>
            Fill in the details below to register a new member and record their initial payment.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
            <AddMemberForm setDialogOpen={setIsOpen} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
