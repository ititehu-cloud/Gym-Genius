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
        <Button variant="outline" size="icon">
          <FilePenLine className="h-4 w-4" />
          <span className="sr-only">Edit Member</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
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
