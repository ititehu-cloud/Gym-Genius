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
import EditMemberForm from "./edit-member-form";
import type { Member } from "@/lib/types";

type EditMemberDialogProps = {
  member: Member;
};

export default function EditMemberDialog({ member }: EditMemberDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-full w-full rounded-none bg-slate-500 hover:bg-slate-600 text-white p-0">
          <FilePenLine className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Member Details</DialogTitle>
          <DialogDescription>
            Update the details for {member.name}.
          </DialogDescription>
        </DialogHeader>
        <EditMemberForm member={member} setDialogOpen={setIsOpen} />
      </DialogContent>
    </Dialog>
  );
}