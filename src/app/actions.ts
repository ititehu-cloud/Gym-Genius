"use server";

import { getInactiveMemberInsights, type InactiveMemberInsightsInput, type InactiveMemberInsightsOutput } from '@/ai/flows/inactive-member-insights';
import { members, payments, attendance, plans } from '@/lib/data';

export async function fetchInactiveMemberInsights(): Promise<InactiveMemberInsightsOutput | { error: string }> {
  try {
    const memberDataForAI: InactiveMemberInsightsInput['memberData'] = members.map(member => {
      const memberPayments = payments.filter(p => p.memberId === member.id);
      const memberAttendance = attendance.filter(a => a.memberId === member.id);
      const memberPlan = plans.find(p => p.id === member.planId);

      return {
        memberId: member.id,
        joinDate: new Date(member.joinDate),
        membershipPlan: memberPlan?.name || 'Unknown',
        attendanceHistory: memberAttendance.map(a => new Date(a.date)),
        paymentHistory: memberPayments.map(p => ({
          date: new Date(p.date),
          amount: p.amount,
          status: p.status,
        })),
      };
    });

    const insights = await getInactiveMemberInsights({ memberData: memberDataForAI });
    return insights;
  } catch (e) {
    console.error(e);
    return { error: "Failed to fetch AI insights. Please try again." };
  }
}
