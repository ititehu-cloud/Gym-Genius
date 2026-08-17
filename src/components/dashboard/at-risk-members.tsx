"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertTriangle, Lightbulb, User, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchInactiveMemberInsights } from '@/app/actions';
import type { InactiveMemberInsightsOutput, InactiveMemberInsightsInput } from '@/ai/flows/inactive-member-insights';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Member, Payment, Plan, Attendance } from '@/lib/types';
import { parseISO } from 'date-fns';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className} 
    xmlns="http://www.w3.org/2000/svg"
    style={{ overflow: 'visible' }}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .015 5.394 0 12.03c0 2.12.551 4.189 1.595 6.04L0 24l4.062-1.065a11.85 11.85 0 005.733 1.488h.005c6.632 0 12.032-5.396 12.033-12.034a11.83 11.83 0 00-3.353-8.697"/>
  </svg>
)

type WithId<T> = T & { id: string };

type AtRiskMembersProps = {
    members: WithId<Member>[];
    payments: WithId<Payment>[];
    plans: WithId<Plan>[];
};

export default function AtRiskMembers({ members, payments, plans }: AtRiskMembersProps) {
    const [insights, setInsights] = useState<InactiveMemberInsightsOutput | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const firestore = useFirestore();
    const { data: attendanceHistory, isLoading: isLoadingAttendance } = useCollection<Attendance>(
        useMemoFirebase(() => collection(firestore, 'attendance'), [firestore])
    );

    const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);

    useEffect(() => {
        if (isLoadingAttendance || !members || !payments || !plans || !attendanceHistory) {
            return;
        }

        async function loadInsights() {
            setIsLoading(true);
            setError(null);
            
            const memberDataForAI: InactiveMemberInsightsInput['memberData'] = members.map(member => {
                const memberPayments = payments.filter(p => p.memberId === member.id);
                const memberPlan = plans.find(p => p.id === member.planId);
                const memberAttendance = attendanceHistory.filter(a => a.memberId === member.id);

                return {
                    memberId: member.id,
                    joinDate: parseISO(member.joinDate),
                    membershipPlan: memberPlan?.name || 'Unknown',
                    attendanceHistory: memberAttendance.map(a => parseISO(a.checkInTime)),
                    paymentHistory: memberPayments.map(p => ({
                        date: parseISO(p.paymentDate),
                        amount: p.amount,
                        status: p.status,
                    })),
                };
            });

            if (memberDataForAI.length === 0) {
              setIsLoading(false);
              return;
            }

            const result = await fetchInactiveMemberInsights({ memberData: memberDataForAI });
            if ('error' in result) {
                setError(result.error);
            } else {
                setInsights(result);
            }
            setIsLoading(false);
        }
        loadInsights();
    }, [members, payments, plans, attendanceHistory, isLoadingAttendance]);

    const getMember = (memberId: string) => {
        return memberMap.get(memberId);
    };

    const handleWhatsAppShare = async (memberId: string, riskReason: string, suggestedInterventions: string[]) => {
        const member = getMember(memberId);
        if (!member || !member.mobileNumber) return;

        const message = `Hello ${member.name}, we missed you at the gym! ${riskReason}.\n\nSuggestions:\n${suggestedInterventions.map(i => `• ${i}`).join('\n')}\n\nHope to see you back soon!`;
        
        let sanitizedPhone = member.mobileNumber.replace(/\D/g, '');
        if (sanitizedPhone.startsWith('0')) sanitizedPhone = sanitizedPhone.substring(1);
        if (sanitizedPhone.length === 10) sanitizedPhone = `91${sanitizedPhone}`;

        const whatsappUrl = `whatsapp://send?phone=${sanitizedPhone}&text=${encodeURIComponent(message)}`;
        
        window.location.href = whatsappUrl;
        
        setTimeout(() => {
            if (document.hasFocus()) {
              window.open(`https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`, '_blank');
            }
        }, 1000);

        toast({ title: "Opening WhatsApp", description: "Launching application..." });
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            );
        }

        if (error) {
            return (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )
        }

        if (!insights || insights.atRiskMembers.length === 0) {
            return <p className="text-muted-foreground">No members identified as at-risk. Great job!</p>;
        }

        return (
            <TooltipProvider>
              <Accordion type="single" collapsible className="w-full">
                  {insights.atRiskMembers.map((atRisk, index) => {
                      const member = getMember(atRisk.memberId);
                      const hasPhone = !!member?.mobileNumber && member.mobileNumber.trim().length > 0;

                      return (
                          <AccordionItem value={`item-${index}`} key={atRisk.memberId}>
                              <AccordionTrigger className="font-medium hover:no-underline">
                                  <div className="flex items-center gap-3">
                                      <User className="h-5 w-5 text-primary" />
                                      <span>{member?.name || 'Unknown Member'}</span>
                                  </div>
                              </AccordionTrigger>
                              <AccordionContent className="space-y-4 pt-2">
                                  <div className="flex items-start gap-3 text-sm">
                                      <AlertTriangle className="h-5 w-5 mt-0.5 text-destructive" />
                                      <div>
                                          <h4 className="font-semibold">Risk Reason</h4>
                                          <p className="text-muted-foreground">{atRisk.riskReason}</p>
                                      </div>
                                  </div>
                                  <div className="flex items-start gap-3 text-sm">
                                      <Lightbulb className="h-5 w-5 mt-0.5 text-amber-500" />
                                      <div>
                                          <h4 className="font-semibold">Suggested Interventions</h4>
                                          <ul className="list-disc pl-5 text-muted-foreground">
                                              {atRisk.suggestedInterventions.map((intervention, i) => (
                                                  <li key={i}>{intervention}</li>
                                              ))}
                                          </ul>
                                      </div>
                                  </div>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="w-full">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="w-full gap-2"
                                            disabled={!hasPhone}
                                            onClick={() => handleWhatsAppShare(atRisk.memberId, atRisk.riskReason, atRisk.suggestedInterventions)}
                                        >
                                            <WhatsAppIcon className="h-4 w-4" />
                                            Message via WhatsApp
                                        </Button>
                                      </div>
                                    </TooltipTrigger>
                                    {!hasPhone && <TooltipContent>N/A</TooltipContent>}
                                  </Tooltip>
                              </AccordionContent>
                          </AccordionItem>
                      )
                  })}
              </Accordion>
            </TooltipProvider>
        );
    };

    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <TrendingDown className="h-6 w-6 text-destructive" />
                    <CardTitle className="font-headline text-2xl">At-Risk Members</CardTitle>
                </div>
                <CardDescription>AI insights identifying members who might become inactive soon.</CardDescription>
            </CardHeader>
            <CardContent>
                {renderContent()}
            </CardContent>
        </Card>
    );
}
