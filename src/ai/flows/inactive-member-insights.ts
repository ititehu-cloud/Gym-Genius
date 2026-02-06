'use server';

/**
 * @fileOverview AI tool that analyzes member data and proactively identifies members at risk of becoming inactive.
 *
 * - getInactiveMemberInsights - A function that analyzes member data and returns insights on members at risk of becoming inactive.
 * - InactiveMemberInsightsInput - The input type for the getInactiveMemberInsights function.
 * - InactiveMemberInsightsOutput - The return type for the getInactiveMemberInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InactiveMemberInsightsInputSchema = z.object({
  memberData: z
    .array(
      z.object({
        memberId: z.string(),
        attendanceHistory: z.array(z.date()),
        paymentHistory: z.array(z.object({
          date: z.date(),
          amount: z.number(),
          status: z.enum(['paid', 'pending'])
        })),
        membershipPlan: z.string(),
        joinDate: z.date(),
      })
    )
    .describe('An array of member data objects, each containing memberId, attendanceHistory, paymentHistory, membershipPlan and joinDate.'),
});
export type InactiveMemberInsightsInput = z.infer<typeof InactiveMemberInsightsInputSchema>;

const InactiveMemberInsightsOutputSchema = z.object({
  atRiskMembers: z.array(
    z.object({
      memberId: z.string(),
      riskReason: z.string().describe('The reason why the member is at risk of becoming inactive.'),
      suggestedInterventions: z.array(z.string()).describe('Suggested interventions to prevent churn.'),
    })
  ).describe('An array of members who are at risk of becoming inactive, with reasons and suggested interventions.'),
});
export type InactiveMemberInsightsOutput = z.infer<typeof InactiveMemberInsightsOutputSchema>;

export async function getInactiveMemberInsights(input: InactiveMemberInsightsInput): Promise<InactiveMemberInsightsOutput> {
  return inactiveMemberInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'inactiveMemberInsightsPrompt',
  input: {schema: InactiveMemberInsightsInputSchema},
  output: {schema: InactiveMemberInsightsOutputSchema},
  prompt: `You are an AI assistant designed to analyze gym member data and identify members who are at risk of becoming inactive. Analyze the provided member data, looking for patterns in attendance and payment history that indicate a risk of churn. Provide specific reasons for the identified risk and suggest potential interventions to prevent the member from becoming inactive.

Here is the member data:

{{#each memberData}}
Member ID: {{memberId}}
Attendance History: {{#each attendanceHistory}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
Payment History: {{#each paymentHistory}}Date: {{{date}}}, Amount: {{{amount}}}, Status: {{{status}}}{{#unless @last}}, {{/unless}}{{/each}}
Membership Plan: {{membershipPlan}}
Join Date: {{{joinDate}}}

{{/each}}

Based on this data, identify members at risk of becoming inactive and suggest interventions.

Output in the following JSON format:
{{{outputSchema.description}}}
`,
});

const inactiveMemberInsightsFlow = ai.defineFlow(
  {
    name: 'inactiveMemberInsightsFlow',
    inputSchema: InactiveMemberInsightsInputSchema,
    outputSchema: InactiveMemberInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
