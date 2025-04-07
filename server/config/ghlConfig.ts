// GoHighLevel Configuration

const GHL_CLIENT_ID = process.env.GHL_CLIENT_ID || "";
const GHL_CLIENT_SECRET = process.env.GHL_CLIENT_SECRET || "";
const GHL_REDIRECT_URI = process.env.GHL_REDIRECT_URI || "https://localhost:5000/api/auth/ghl/callback";
const GHL_WEBHOOK_SECRET = process.env.GHL_WEBHOOK_SECRET || "";

// Check if required environment variables are set
if (!GHL_CLIENT_ID || !GHL_CLIENT_SECRET) {
  console.warn("Warning: GHL_CLIENT_ID or GHL_CLIENT_SECRET is not set. GHL integration will not function correctly.");
}

export const ghlConfig = {
  clientId: GHL_CLIENT_ID,
  clientSecret: GHL_CLIENT_SECRET,
  redirectUri: GHL_REDIRECT_URI,
  webhookSecret: GHL_WEBHOOK_SECRET,
  scopes: "contacts.readonly contacts.write conversations.readonly conversations.write locations.readonly locations.write opportunities.readonly opportunities.write calendars.readonly calendars.write users.readonly users.write forms.readonly forms.write workflows.readonly workflows.write email.readonly email.write sms.readonly sms.write", // Add or remove scopes as needed
  apiBaseUrl: "https://services.leadconnectorhq.com",
  authUrl: "https://marketplace.gohighlevel.com/oauth/chooselocation",
  tokenUrl: "https://services.leadconnectorhq.com/oauth/token",
  webhookEvents: [
    "contact.created",
    "contact.updated",
    "contact.deleted",
    "email.delivered",
    "email.opened",
    "email.clicked",
    "email.bounced",
    "email.complained"
  ],
  contactSyncInterval: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
  defaultRequestTimeout: 30000, // 30 seconds
  apiRateLimit: {
    maxRequests: 10,
    perTimeWindow: 1000, // 1 second
    staggeringDelay: 100 // milliseconds between requests
  }
};
