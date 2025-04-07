import OpenAI from "openai";
import { IStorage } from "../storage";
import { InsertExperimentVariant } from "@shared/schema";

// Interface for AI generation parameters
export interface AIGenerationParams {
  companyInfo?: string;
  targetAudience?: string;
  emailType?: string;
  keyAngle?: string;
  tone?: string;
  length?: string;
  additionalInstructions?: string;
}

/**
 * Service for handling OpenAI integrations
 */
export class OpenAIService {
  private storage: IStorage;
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }
  
  /**
   * Get an OpenAI client for a specific user
   * @param userId The user ID to get API key for
   * @returns OpenAI client instance
   */
  async getOpenAIClient(userId: number): Promise<OpenAI | null> {
    try {
      // Get the user's integration settings for OpenAI
      const openaiConnection = await this.storage.getIntegrationConnection(userId, 'openai');
      
      if (!openaiConnection?.access_token) {
        console.error(`No OpenAI API key found for user ${userId}`);
        return null;
      }
      
      // Create a new OpenAI client with the user's API key
      return new OpenAI({ 
        apiKey: openaiConnection.access_token 
      });
    } catch (error) {
      console.error('Error creating OpenAI client:', error);
      return null;
    }
  }
  
  /**
   * Generate email variants using OpenAI
   * @param userId The user ID
   * @param emailId The email ID to generate variants for
   * @param originalSubject The original email subject
   * @param originalBody The original email body
   * @param numVariants Number of variants to generate
   * @param params Additional parameters for generation
   * @returns Array of generated variants
   */
  async generateEmailVariants(
    userId: number,
    emailId: number,
    originalSubject: string,
    originalBody: string,
    numVariants: number = 2,
    params: AIGenerationParams = {}
  ): Promise<InsertExperimentVariant[]> {
    const openai = await this.getOpenAIClient(userId);
    
    if (!openai) {
      throw new Error("OpenAI API key not configured");
    }
    
    const variants: InsertExperimentVariant[] = [];
    const variantLetters = ['A', 'B', 'C', 'D', 'E']; // Limit to 5 max variants
    
    // Use the latest model - gpt-4o
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const model = "gpt-4o";
    
    try {
      // Build system prompt with parameters
      const systemPrompt = this.buildSystemPrompt(params);
      
      // Generate each variant
      for (let i = 0; i < Math.min(numVariants, 5); i++) {
        const response = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: `Please create a variant of the following email with a different angle or tone. The original email has subject: "${originalSubject}" and body: "${originalBody}".
              
              Generate a JSON response with the following structure:
              {
                "subject": "The new subject line",
                "body_html": "The HTML content of the email",
                "body_text": "The plain text version of the email",
                "key_angle": "The main angle or approach of this variant"
              }`
            }
          ],
          response_format: { type: "json_object" }
        });
        
        const content = response.choices[0].message.content;
        if (!content) continue;
        
        try {
          const parsedResponse = JSON.parse(content);
          
          variants.push({
            email_id: emailId,
            variant_letter: variantLetters[i] || String.fromCharCode(65 + i), // A, B, C, etc.
            subject: parsedResponse.subject,
            body_html: parsedResponse.body_html,
            body_text: parsedResponse.body_text,
            key_angle: parsedResponse.key_angle,
            ai_parameters: params
          });
        } catch (parseError) {
          console.error("Error parsing OpenAI response:", parseError);
        }
      }
      
      return variants;
    } catch (error) {
      console.error("Error generating email variants:", error);
      throw new Error(`Failed to generate email variants: ${error.message}`);
    }
  }
  
  /**
   * Build system prompt for email generation based on parameters
   */
  private buildSystemPrompt(params: AIGenerationParams): string {
    const {
      companyInfo,
      targetAudience,
      emailType = "marketing",
      keyAngle,
      tone = "professional",
      length = "medium",
      additionalInstructions
    } = params;
    
    let prompt = `You are an expert email copywriter for ${emailType} emails.`;
    
    if (companyInfo) {
      prompt += ` The company information is: ${companyInfo}.`;
    }
    
    if (targetAudience) {
      prompt += ` The target audience is: ${targetAudience}.`;
    }
    
    if (keyAngle) {
      prompt += ` The key angle to focus on is: ${keyAngle}.`;
    }
    
    prompt += ` The tone should be ${tone} and the length should be ${length}.`;
    
    prompt += ` Generate both HTML and plain text versions of the email. The HTML version should include basic formatting like paragraphs, bold for emphasis, and occasional bullet points where appropriate.`;
    
    if (additionalInstructions) {
      prompt += ` Additional instructions: ${additionalInstructions}`;
    }
    
    return prompt;
  }
  
  /**
   * Analyze email performance using OpenAI
   */
  async analyzeEmailPerformance(
    userId: number,
    emailPerformanceData: any
  ): Promise<{ analysis: string; recommendations: string[] }> {
    const openai = await this.getOpenAIClient(userId);
    
    if (!openai) {
      throw new Error("OpenAI API key not configured");
    }
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert email marketing analyst. Analyze the provided email performance data and provide insights and recommendations."
          },
          {
            role: "user",
            content: `Please analyze this email performance data and provide insights and recommendations: ${JSON.stringify(emailPerformanceData)}`
          }
        ],
        response_format: { type: "json_object" }
      });
      
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }
      
      const parsedResponse = JSON.parse(content);
      return {
        analysis: parsedResponse.analysis || "No analysis provided",
        recommendations: parsedResponse.recommendations || []
      };
    } catch (error) {
      console.error("Error analyzing email performance:", error);
      throw new Error(`Failed to analyze email performance: ${error.message}`);
    }
  }
}