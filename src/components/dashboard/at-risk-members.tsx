"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertTriangle, Lightbulb, Target, User, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchInactiveMemberInsights } from '@/app/actions';
import type { InactiveMemberInsightsOutput } from '@/ai/flows/inactive-member-insights';
import { members } from '@/lib/data';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export default function AtRiskMembers() {
  const [insights, setInsights] = useState<InactiveMemberInsightsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadInsights() {
      setIsLoading(true);
      setError(null);
      const result = await fetchInactiveMemberInsights();
      if ('error' in result) {
        setError(result.error);
      } else {
        setInsights(result);
      }
      setIsLoading(false);
    }
    loadInsights();
  }, []);

  const getMemberName = (memberId: string) => {
    return members.find(m => m.id === memberId)?.name || 'Unknown Member';
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
      return <p className="text-muted-foreground">No members currently identified as at-risk. Great job!</p>;
    }

    return (
      <Accordion type="single" collapsible className="w-full">
        {insights.atRiskMembers.map((member, index) => (
          <AccordionItem value={`item-${index}`} key={member.memberId}>
            <AccordionTrigger className="font-medium hover:no-underline">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <span>{getMemberName(member.memberId)}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="flex items-start gap-3 text-sm">
                <AlertTriangle className="h-5 w-5 mt-0.5 text-destructive" />
                <div>
                  <h4 className="font-semibold">Risk Reason</h4>
                  <p className="text-muted-foreground">{member.riskReason}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Lightbulb className="h-5 w-5 mt-0.5 text-amber-500" />
                 <div>
                  <h4 className="font-semibold">Suggested Interventions</h4>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {member.suggestedInterventions.map((intervention, i) => (
                      <li key={i}>{intervention}</li>
                    ))}
                  </ul>
                 </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-destructive" />
            <CardTitle className="font-headline text-2xl">At-Risk Members</CardTitle>
        </div>
        <CardDescription>AI-powered insights to identify members who might become inactive.</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
