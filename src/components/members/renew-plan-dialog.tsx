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
import { CalendarClock } from "lucide-react";
import { useState } from "react";
import RenewPlanForm from "./renew-plan-form";
import type { Member } from "@/lib/types";

type RenewPlanDialogProps = {
  member: Member;
};

export default function RenewPlanDialog({ member }: RenewPlanDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Renew Plan">
          <CalendarClock className="h-4 w-4" />
          <span className="sr-only">Renew Plan</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renew Membership</DialogTitle>
          <DialogDescription>
            Set a new expiry date for {member.name}.
          </DialogDescription>
        </DialogHeader>
        <RenewPlanForm member={member} setDialogOpen={setIsOpen} />
      </DialogContent>
    </Dialog>
  );
}
