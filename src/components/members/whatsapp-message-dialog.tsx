'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { Member } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

type WhatsAppMessageDialogProps = {
  member: Member;
  gymName?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function WhatsAppMessageDialog({ member, gymName, isOpen, onOpenChange }: WhatsAppMessageDialogProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState('payment_reminder');
  const [message, setMessage] = useState('');

  const nameOfGym = gymName || 'Your Gym';

  const getTemplates = () => ({
    payment_reminder: `Assalam walikum,\nyour membership expires today so please renew it.\nRegards, ${nameOfGym}`,
    eid_mubarak: `Assalam walikum,\nEid Mubarak to you and your family! Wishing you a blessed and joyful Eid.\nBest regards, ${nameOfGym}`,
    thanks: `Assalam walikum,\nThank you for choosing ${nameOfGym}. We appreciate your commitment to your fitness journey!`,
    happy_new_year: `Assalam walikum,\nHappy New Year! Let's make this year your strongest and healthiest yet.\nRegards, ${nameOfGym}`,
    custom: `Assalam walikum,\n`
  });

  useEffect(() => {
    if (isOpen) {
        const t = getTemplates();
        setMessage(t[selectedTemplate as keyof typeof t]);
    }
  }, [isOpen, selectedTemplate, gymName]);

  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
  };

  const handleSend = () => {
    if (!member.mobileNumber) {
      toast({ variant: 'destructive', title: 'Error', description: 'Member has no mobile number.' });
      return;
    }

    let sanitizedPhone = member.mobileNumber.replace(/\D/g, '');
    if (sanitizedPhone.startsWith('0')) sanitizedPhone = sanitizedPhone.substring(1);
    if (sanitizedPhone.length === 10) sanitizedPhone = `91${sanitizedPhone}`;

    const encodedMsg = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=${sanitizedPhone}&text=${encodedMsg}`;
    const waMeUrl = `https://wa.me/${sanitizedPhone}?text=${encodedMsg}`;
    
    // Direct trigger
    window.location.href = whatsappUrl;
    
    // Fallback to wa.me (better auto-open than api.whatsapp.com)
    setTimeout(() => {
      if (document.hasFocus()) {
        window.open(waMeUrl, '_blank');
      }
    }, 1000);

    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold leading-tight">
            Send Whatsapp message:<br />
            <span className="text-primary">{member.mobileNumber}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="relative">
            <Label htmlFor="message" className="absolute -top-2 left-3 px-1 bg-background text-[10px] text-muted-foreground uppercase font-bold tracking-wider z-10">message....</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[140px] bg-muted/5 pt-4 resize-none border-muted-foreground/20 focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Select Template</h4>
            <RadioGroup value={selectedTemplate} onValueChange={handleTemplateChange} className="space-y-0">
              <div className="flex items-center justify-between py-3 border-b border-muted/30">
                <Label htmlFor="payment_reminder" className="flex-1 cursor-pointer text-base font-medium">Payment reminder</Label>
                <RadioGroupItem value="payment_reminder" id="payment_reminder" className="text-primary border-primary" />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-muted/30">
                <Label htmlFor="eid_mubarak" className="flex-1 cursor-pointer text-base font-medium">Eid Mubarak</Label>
                <RadioGroupItem value="eid_mubarak" id="eid_mubarak" className="text-primary border-primary" />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-muted/30">
                <Label htmlFor="thanks" className="flex-1 cursor-pointer text-base font-medium">Thanks</Label>
                <RadioGroupItem value="thanks" id="thanks" className="text-primary border-primary" />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-muted/30">
                <Label htmlFor="happy_new_year" className="flex-1 cursor-pointer text-base font-medium">Happy new year</Label>
                <RadioGroupItem value="happy_new_year" id="happy_new_year" className="text-primary border-primary" />
              </div>
              <div className="flex items-center justify-between py-3">
                <Label htmlFor="custom" className="flex-1 cursor-pointer text-base font-medium">Add custom message</Label>
                <RadioGroupItem value="custom" id="custom" className="text-primary border-primary" />
              </div>
            </RadioGroup>
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
