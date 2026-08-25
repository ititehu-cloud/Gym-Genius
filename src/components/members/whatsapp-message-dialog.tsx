'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Member, Plan } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

type WhatsAppMessageDialogProps = {
  member: Member;
  plan?: Plan;
  dueAmount?: number;
  gymName?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function WhatsAppMessageDialog({ member, plan, dueAmount = 0, gymName, isOpen, onOpenChange }: WhatsAppMessageDialogProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('expiry');

  const nameOfGym = gymName || 'Your Gym';

  const templates = useMemo(() => {
    const joinDate = member.joinDate ? format(parseISO(member.joinDate), 'MMMM do, yyyy') : 'N/A';
    const expiryDate = member.expiryDate ? format(parseISO(member.expiryDate), 'MMMM do, yyyy') : 'N/A';
    const planType = plan ? `${plan.duration} month` : 'N/A';

    return {
      welcome: `Welcome to ${nameOfGym}, ${member.name}! We're excited to have you with us. Let's get fit together! 🏋️‍♂️💪`,
      expiry: `💪 *Due Details* 💪\n\n*From:* ${nameOfGym}\n👤 *Customer:* ${member.name}\n📱 *Mobile:* ${member.mobileNumber || 'N/A'}\n📅 *Date of Joining:* ${joinDate}\n📅 *Date of Expiry:* ${expiryDate}\n💰 *Plan Type:* ${planType}\n💵 *Amount Due:* ₹${dueAmount.toFixed(0)}\n\n🙏 Please clear the due amount as early as possible to continue your membership with the Gym.\n\nThank you!`,
      general: `Hi ${member.name}, just a friendly reminder from ${nameOfGym} to stay consistent with your workouts! See you at the gym! 🤜🤛`,
    };
  }, [member, plan, dueAmount, nameOfGym]);

  useEffect(() => {
    if (isOpen) {
      setMessage(templates[activeTab as keyof typeof templates]);
    }
  }, [isOpen, activeTab, templates]);

  const handleSend = () => {
    if (!member.mobileNumber) {
      toast({ variant: 'destructive', title: 'Error', description: 'Member has no mobile number.' });
      return;
    }

    // Clean phone number
    let sanitizedPhone = member.mobileNumber.replace(/\D/g, '');
    if (sanitizedPhone.startsWith('0')) sanitizedPhone = sanitizedPhone.substring(1);
    if (sanitizedPhone.length === 10) sanitizedPhone = `91${sanitizedPhone}`;

    const encodedMsg = encodeURIComponent(message);
    
    // Determine platform
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    let whatsappUrl;
    if (isIOS) {
      whatsappUrl = `whatsapp://send?phone=${sanitizedPhone}&text=${encodedMsg}`;
    } else if (isMobile) {
      whatsappUrl = `https://api.whatsapp.com/send/?phone=${sanitizedPhone}&text=${encodedMsg}&app_absent=0&type=phone_number`;
    } else {
      whatsappUrl = `https://web.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodedMsg}`;
    }

    if (isIOS) {
      window.location.href = whatsappUrl;
      setTimeout(() => {
        if (document.hasFocus()) {
          window.location.href = `https://wa.me/${sanitizedPhone}?text=${encodedMsg}`;
        }
      }, 500);
    } else {
      const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      if (!newWindow || newWindow.closed) {
        window.location.href = `https://wa.me/${sanitizedPhone}?text=${encodedMsg}`;
      }
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold leading-tight">
            Send Message:<br />
            <span className="text-primary">{member.mobileNumber}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="expiry">Expiry</TabsTrigger>
              <TabsTrigger value="welcome">Welcome</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative">
            <Label htmlFor="message" className="absolute -top-2 left-3 px-1 bg-background text-[10px] text-muted-foreground uppercase font-bold tracking-wider z-10">Message Preview</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[220px] bg-muted/5 pt-4 resize-none border-muted-foreground/20 focus-visible:ring-primary font-mono text-xs"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-semibold text-muted-foreground">Cancel</Button>
          <Button onClick={handleSend} className="bg-[#467c6d] hover:bg-[#3a6358] text-white font-bold px-10 rounded-xl h-11">Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
