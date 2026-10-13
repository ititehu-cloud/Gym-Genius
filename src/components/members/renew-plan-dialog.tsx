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
import { CalendarSync } from "lucide-react";
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
        <Button variant="ghost" className="flex flex-col gap-1 h-full rounded-none hover:bg-muted/30 text-muted-foreground">
          <CalendarSync className="h-5 w-5 text-foreground" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Renew</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
        <DialogHeader className="p-6 bg-primary text-primary-foreground">
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            Renew Plan
          </DialogTitle>
          <DialogDescription className="text-primary-foreground/70">
            Set a new membership cycle and record payment for {member.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted/10">
            <RenewPlanForm member={member} setDialogOpen={setIsOpen} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
