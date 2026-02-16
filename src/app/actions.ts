"use server";

import { getInactiveMemberInsights, type InactiveMemberInsightsInput, type InactiveMemberInsightsOutput } from '@/ai/flows/inactive-member-insights';

export async function fetchInactiveMemberInsights(input: InactiveMemberInsightsInput): Promise<InactiveMemberInsightsOutput | { error: string }> {
  try {
    const insights = await getInactiveMemberInsights(input);
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
    const isProduction = process.env.NODE_ENV === 'production';
    const errorMessage = isProduction
        ? 'Image upload service is not configured. Please add the IMGBB_API_KEY to your Vercel project environment variables.'
        : 'Image upload service is not configured. Please add your imgBB API key to the .env file.';
    return { error: errorMessage };
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
