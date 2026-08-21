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

/**
 * Uploads an image to imgBB.
 * Accepts either a FormData object (standard file upload) or a base64 string.
 */
export async function uploadImage(imageInput: FormData | string): Promise<{ url?: string; error?: string }> {
  const apiKey = process.env.IMGBB_API_KEY;

  if (!apiKey || apiKey === "your_imgbb_api_key_here" || apiKey === "") {
    console.error("IMGBB_API_KEY is not set in the environment variables.");
    return { error: 'Image upload service is not configured. Please add the IMGBB_API_KEY to your project environment variables.' };
  }

  try {
    let body: FormData;

    if (typeof imageInput === 'string') {
      // If base64 string, wrap it in FormData as expected by imgBB API
      body = new FormData();
      body.append('image', imageInput);
    } else {
      // If it's already a FormData object (passed from client), use it directly
      body = imageInput;
    }

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: body,
    });

    const jsonResponse = await response.json();

    if (response.ok && jsonResponse.success) {
      return { url: jsonResponse.data.url };
    } else {
      console.error('imgBB upload failed:', jsonResponse);
      const errorMessage = jsonResponse.error?.message || `Status: ${response.status}`;
      return { error: `Upload failed: ${errorMessage}` };
    }
  } catch (error) {
    console.error('Error uploading image to imgBB:', error);
    return { error: 'An unexpected error occurred during image upload.' };
  }
}
