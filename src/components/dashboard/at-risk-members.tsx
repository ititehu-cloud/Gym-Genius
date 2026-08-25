"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertTriangle, Lightbulb, User, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchInactiveMemberInsights } from '@/app/actions';
import type { InactiveMemberInsightsOutput, InactiveMemberInsightsInput } from '@/ai/flows/inactive-member-insights';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Member, Payment, Plan, Attendance, UserProfile } from '@/lib/types';
import { parseISO, startOfDay, endOfDay } from 'date-fns';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WhatsAppIcon } from '../icons/whatsapp-icon';
import WhatsAppMessageDialog from '../members/whatsapp-message-dialog';

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
    const [selectedMemberForWhatsApp, setSelectedMemberForWhatsApp] = useState<Member | null>(null);
    const [isWhatsAppDialogOpen, setWhatsAppDialogOpen] = useState(false);

    const { user } = useUser();
    const firestore = useFirestore();
    
    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);

    const attendanceQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'attendance'), where('userId', '==', user.uid));
    }, [firestore, user]);
    
    const { data: attendanceHistory, isLoading: isLoadingAttendance } = useCollection<Attendance>(attendanceQuery);

    const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);
    const planMap = useMemo(() => new Map(plans.map(p => [p.id, p])), [plans]);

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

    const calculateDueAmount = (member: Member, plan: Plan | undefined) => {
        if (!plan) return 0;
        const joinDate = parseISO(member.joinDate);
        const expiryDate = parseISO(member.expiryDate);
        const leadTimeMs = 30 * 24 * 60 * 60 * 1000;
        const leadDate = new Date(joinDate.getTime() - leadTimeMs);

        const memberPayments = payments.filter(p => p.memberId === member.id);
        const cyclePayments = memberPayments.filter(p => {
            const pDate = parseISO(p.paymentDate);
            return pDate >= startOfDay(leadDate) && 
                   pDate <= endOfDay(expiryDate) && 
                   p.status === 'paid';
        });

        const totalPaid = cyclePayments.reduce((acc, p) => acc + p.amount, 0);
        return Math.max(0, plan.price - totalPaid);
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
                                            onClick={() => {
                                                if (member) {
                                                    setSelectedMemberForWhatsApp(member);
                                                    setWhatsAppDialogOpen(true);
                                                }
                                            }}
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

    const selectedMemberPlan = selectedMemberForWhatsApp ? planMap.get(selectedMemberForWhatsApp.planId) : undefined;
    const selectedMemberDue = selectedMemberForWhatsApp ? calculateDueAmount(selectedMemberForWhatsApp, selectedMemberPlan) : 0;

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

            {selectedMemberForWhatsApp && (
                <WhatsAppMessageDialog 
                    member={selectedMemberForWhatsApp}
                    plan={selectedMemberPlan}
                    dueAmount={selectedMemberDue}
                    gymName={userProfile?.displayName}
                    isOpen={isWhatsAppDialogOpen}
                    onOpenChange={setWhatsAppDialogOpen}
                />
            )}
        </Card>
    );
}
