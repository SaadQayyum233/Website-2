// OpenAI Configuration

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Check if required environment variable is set
if (!OPENAI_API_KEY) {
  console.warn("Warning: OPENAI_API_KEY is not set. OpenAI integration will not function correctly without a key.");
}

export const openaiConfig = {
  apiKey: OPENAI_API_KEY,
  defaultModel: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  fallbackModel: "gpt-3.5-turbo",
  defaultTemperature: 0.7,
  emailVariantTemperature: 0.9, // Higher temperature for more creative email variants
  defaultMaxTokens: 500,
  emailMaxTokens: 800,
  defaultRequestTimeout: 30000, // 30 seconds
  apiRateLimit: {
    maxRequests: 5,
    perTimeWindow: 60000, // 1 minute
    staggeringDelay: 300 // milliseconds between requests
  },
  models: {
    text: "gpt-4o",
    vision: "gpt-4o",
    embedding: "text-embedding-3-large"
  },
  defaultSystemPrompts: {
    emailVariation: `You are an expert email marketing copywriter. 
Your task is to rewrite the given email to create a new variation 
with a fresh angle while maintaining the core message and call to action.
Focus on the specified key angle in your rewrite.`,
    
    subjectLine: `You are an expert at creating engaging email subject lines. 
Create a subject line that will maximize open rates. 
The subject should be clear, enticing, and under 50 characters if possible.`,
    
    emailAnalysis: `You are an expert email marketing analyst.
Analyze the provided email copy for clarity, persuasiveness,
and potential effectiveness. Provide specific suggestions for improvement.`
  }
};