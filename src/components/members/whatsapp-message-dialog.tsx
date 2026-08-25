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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  const [activeTemplate, setActiveTemplate] = useState('payment_reminder');

  const nameOfGym = gymName || 'Your Gym';

  const templates = useMemo(() => {
    const joinDate = member.joinDate ? format(parseISO(member.joinDate), 'MMMM do, yyyy') : 'N/A';
    const expiryDate = member.expiryDate ? format(parseISO(member.expiryDate), 'MMMM do, yyyy') : 'N/A';
    const planType = plan ? `${plan.duration} month` : 'N/A';

    return {
      payment_reminder: `💪 *Due Details* 💪\n\n*From:* ${nameOfGym}\n👤 *Customer:* ${member.name}\n📱 *Mobile:* ${member.mobileNumber || 'N/A'}\n📅 *Date of Joining:* ${joinDate}\n📅 *Date of Expiry:* ${expiryDate}\n💰 *Plan Type:* ${planType}\n💵 *Amount Due:* ₹${dueAmount.toFixed(0)}\n\n🙏 Please clear the due amount as early as possible to continue your membership with the Gym.\n\nThank you!`,
      eid_mubarak: `Assalamu alaikum ${member.name},\n\nEid Mubarak to you and your family! May this Eid bring joy, peace, and prosperity to your life. From ${nameOfGym} 🌙✨`,
      thanks: `Thank you ${member.name} for being such a valuable part of ${nameOfGym}! We truly appreciate your commitment to your fitness journey. Keep it up! 🏋️‍♂️💪`,
      happy_new_year: `Happy New Year ${member.name}! 🎆\n\nLet's make this year your strongest one yet. See you at ${nameOfGym} to crush those resolutions! 🤜🤛`,
      custom: `Hi ${member.name}, `,
    };
  }, [member, plan, dueAmount, nameOfGym]);

  useEffect(() => {
    if (isOpen) {
      setMessage(templates[activeTemplate as keyof typeof templates] || '');
    }
  }, [isOpen, activeTemplate, templates]);

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

  const templateOptions = [
    { id: 'payment_reminder', label: 'Payment reminder' },
    { id: 'eid_mubarak', label: 'Eid Mubarak' },
    { id: 'thanks', label: 'Thanks' },
    { id: 'happy_new_year', label: 'Happy new year' },
    { id: 'custom', label: 'Add custom message' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-3xl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold text-gray-700 leading-tight">
            Send Whatsapp message:<br />
            <span>{member.mobileNumber}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 pt-4 space-y-6">
          <div className="relative">
            <Label htmlFor="message" className="absolute -top-2 left-3 px-1 bg-white text-[10px] text-gray-400 uppercase font-bold tracking-wider z-10">message....</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[140px] bg-gray-50/50 pt-4 resize-none border-gray-200 focus-visible:ring-primary rounded-xl text-gray-600"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500">Select Template</h3>
            <RadioGroup 
                value={activeTemplate} 
                onValueChange={setActiveTemplate}
                className="space-y-0"
            >
              {templateOptions.map((option) => (
                <div 
                  key={option.id} 
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 cursor-pointer"
                  onClick={() => setActiveTemplate(option.id)}
                >
                  <Label 
                    htmlFor={option.id} 
                    className="text-base font-medium text-gray-500 flex-1 cursor-pointer"
                  >
                    {option.label}
                  </Label>
                  <RadioGroupItem 
                    value={option.id} 
                    id={option.id} 
                    className="h-5 w-5 border-2 border-gray-300 text-primary"
                  />
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 flex flex-row items-center justify-end gap-6">
          <button 
            onClick={() => onOpenChange(false)} 
            className="text-gray-500 font-semibold text-base"
          >
            Cancel
          </button>
          <Button 
            onClick={handleSend} 
            className="bg-[#467c6d] hover:bg-[#3a6358] text-white font-bold px-10 rounded-xl h-11 text-base"
          >
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
