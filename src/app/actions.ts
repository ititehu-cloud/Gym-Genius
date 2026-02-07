"use server";

import { getInactiveMemberInsights, type InactiveMemberInsightsInput, type InactiveMemberInsightsOutput } from '@/ai/flows/inactive-member-insights';
import { members, payments, plans } from '@/lib/data';

export async function fetchInactiveMemberInsights(): Promise<InactiveMemberInsightsOutput | { error: string }> {
  try {
    const memberDataForAI: InactiveMemberInsightsInput['memberData'] = members.map(member => {
      const memberPayments = payments.filter(p => p.memberId === member.id);
      const memberPlan = plans.find(p => p.id === member.planId);

      return {
        memberId: member.id,
        joinDate: new Date(member.joinDate),
        membershipPlan: memberPlan?.name || 'Unknown',
        attendanceHistory: [],
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

export async function uploadImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const apiKey = process.env.IMGBB_API_KEY;

  if (!apiKey || apiKey === "your_imgbb_api_key_here" || apiKey === "") {
    console.error("IMGBB_API_KEY is not set in the environment variables.");
    return { error: 'Image upload service is not configured. Please add your imgBB API key to the .env file.' };
  }

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('imgBB upload failed:', errorText);
        return { error: `Failed to upload image. Status: ${response.status}` };
    }

    const jsonResponse = await response.json();
    
    if (jsonResponse.success) {
      return { url: jsonResponse.data.url };
    } else {
      console.error('imgBB API did not return a success status or valid data:', jsonResponse);
      return { error: 'Failed to process upload response from image service.' };
    }
  } catch (error) {
    console.error('Error uploading image to imgBB:', error);
    if (error instanceof Error) {
        return { error: `An unexpected error occurred during image upload: ${error.message}` };
    }
    return { error: 'An unexpected error occurred during image upload.' };
  }
}
