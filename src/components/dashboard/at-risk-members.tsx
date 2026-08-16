"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertTriangle, Lightbulb, User, TrendingDown, Share2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchInactiveMemberInsights } from '@/app/actions';
import type { InactiveMemberInsightsInput, InactiveMemberInsightsOutput } from '@/ai/flows/inactive-member-insights';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Member, Payment, Plan, Attendance } from '@/lib/types';
import { parseISO } from 'date-fns';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';

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

        const message = `Hello ${member.name}, we missed you! ${riskReason}.\n\nSuggestions:\n${suggestedInterventions.map(i => `• ${i}`).join('\n')}\n\nHope to see you back soon!`;
        
        let sanitizedPhone = member.mobileNumber.replace(/\D/g, '');
        if (sanitizedPhone.length === 10) sanitizedPhone = `91${sanitizedPhone}`;

        // Direct WhatsApp deep link to bypass browser landing page
        const whatsappUrl = `whatsapp://send?phone=${sanitizedPhone}&text=${encodeURIComponent(message)}`;
        
        try {
            // Priority 1: Native Share API (Text only here)
            if (navigator.share) {
                await navigator.share({
                    title: 'Gym Activity Update',
                    text: message,
                });
                return;
            }
        } catch (err) {
            // Fallback to deep link
        }

        // Force native app launch
        window.location.href = whatsappUrl;
        
        // Fallback for desktop/non-deep-link support
        setTimeout(() => {
            const webFallback = `https://api.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodeURIComponent(message)}`;
            window.open(webFallback, '_blank');
        }, 500);

        toast({ title: "Opening WhatsApp", description: "Launching native application..." });
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
            <Accordion type="single" collapsible className="w-full">
                {insights.atRiskMembers.map((atRisk, index) => {
                    const member = getMember(atRisk.memberId);
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
                                {member?.mobileNumber && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full"
                                        onClick={() => handleWhatsAppShare(atRisk.memberId, atRisk.riskReason, atRisk.suggestedInterventions)}
                                    >
                                        <Share2 className="mr-2 h-4 w-4" />
                                        Share via WhatsApp
                                    </Button>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
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
