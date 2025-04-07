import OpenAI from "openai";
import { openaiConfig } from "../config/openaiConfig";
import { storage } from "../storage";
import { Email, UserSettings, ExperimentVariant } from "@shared/schema";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: openaiConfig.apiKey
});

// Interface for variant generation results
interface GeneratedVariant {
  variantLetter: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  keyAngle: string;
  aiParameters: {
    model: string;
    prompt: string;
    temperature: number;
  };
}

/**
 * Generate email variants using OpenAI
 */
export async function generateEmailVariants(
  baseEmail: Email,
  userSettings: UserSettings,
  count: number = openaiConfig.defaultVariantCount
): Promise<GeneratedVariant[]> {
  try {
    // Validate inputs
    if (!baseEmail.subject || !baseEmail.body_html) {
      throw new Error("Base email must have a subject and body content");
    }

    if (!openaiConfig.apiKey) {
      throw new Error("OpenAI API key is not configured");
    }

    // Limit variant count to reasonable range
    const variantCount = Math.min(Math.max(count, 1), 5);

    // Create prompt with user settings and email content
    const prompt = createPrompt(baseEmail, userSettings, variantCount);

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: openaiConfig.defaultModel, // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert email copywriter specializing in creating high-converting email variations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: openaiConfig.temperature,
      response_format: { type: "json_object" }
    });

    // Extract and validate the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from AI service");
    }

    // Parse the JSON response
    const parsedResponse = JSON.parse(content);
    
    if (!parsedResponse.variants || !Array.isArray(parsedResponse.variants)) {
      throw new Error("Invalid AI response format");
    }

    // Map the variants to our format
    const variants: GeneratedVariant[] = parsedResponse.variants.map((variant: any, index: number) => {
      const variantLetter = String.fromCharCode(65 + index); // A, B, C, etc.
      
      return {
        variantLetter,
        subject: variant.subject || baseEmail.subject,
        bodyHtml: variant.bodyHtml || baseEmail.body_html,
        bodyText: variant.bodyText || baseEmail.body_text || "",
        keyAngle: variant.keyAngle || variant.angle || "",
        aiParameters: {
          model: openaiConfig.defaultModel,
          prompt,
          temperature: openaiConfig.temperature
        }
      };
    });

    return variants;
  } catch (error) {
    // Log the error
    await storage.logError(
      "AI Email Generation",
      error instanceof Error ? error.message : "Unknown error generating email variants",
      error instanceof Error ? error.stack : undefined,
      { emailId: baseEmail.id }
    );

    // Re-throw the error
    throw error;
  }
}

/**
 * Create prompt for OpenAI with user settings and email content
 */
function createPrompt(
  email: Email,
  userSettings: UserSettings,
  variantCount: number
): string {
  return `
Create ${variantCount} distinct variations of the following email, optimized for high engagement.

BASE EMAIL:
Subject: ${email.subject}
Key Angle: ${email.key_angle || "Not specified"}
Body:
${email.body_html}

AVATAR (SENDER) PROFILE:
Name: ${userSettings.avatar_name || "Not specified"}
Role: ${userSettings.avatar_role || "Not specified"}
Company: ${userSettings.avatar_company_name || "Not specified"}
Bio: ${userSettings.avatar_bio || "Not specified"}

IDEAL CUSTOMER PROFILE (ICP):
Description: ${userSettings.icp_description || "Not specified"}
Key Pain Points: ${userSettings.icp_pain_points || "Not specified"}
Fears: ${userSettings.icp_fears || "Not specified"}
Insecurities: ${userSettings.icp_insecurities || "Not specified"}
Desired Transformations: ${userSettings.icp_transformations || "Not specified"}
Key Objectives: ${userSettings.icp_key_objectives || "Not specified"}

INSTRUCTIONS:
1. Create ${variantCount} unique and improved variations while maintaining the core message.
2. For each variation, provide:
   - A compelling subject line
   - A key angle or hook that differentiates this variant
   - HTML email body (maintain HTML formatting)
   - Plain text version of the email body

3. Make each variation meaningfully different using these approaches:
   - Different emotional appeals (e.g., fear, aspiration, curiosity)
   - Different key benefits or value propositions
   - Different tones (formal, casual, urgent)
   - Different storytelling approaches

4. Ensure all copy addresses the ICP's pain points and desires while aligning with the Avatar's brand voice.

Return the results as a JSON object with this structure:
{
  "variants": [
    {
      "subject": "Subject line for variant 1",
      "keyAngle": "Main hook or angle for variant 1",
      "bodyHtml": "Full HTML content for variant 1",
      "bodyText": "Plain text version for variant 1"
    },
    // Additional variants...
  ]
}
`;
}
