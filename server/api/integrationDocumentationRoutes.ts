import { Router, Request, Response } from 'express';

export const router = Router();

// Define the structure of a documentation section
interface DocumentationSection {
  title: string;
  content: string;
}

// Define the structure of a complete documentation
interface Documentation {
  id: string;
  title: string;
  sections: DocumentationSection[];
}

/**
 * Map of integration IDs to their documentation
 * This would typically come from a database in production
 */
const documentationMap: Record<string, Documentation> = {
  gohighlevel: {
    id: 'gohighlevel',
    title: 'GoHighLevel Integration',
    sections: [
      {
        title: 'Overview',
        content: `
# GoHighLevel Integration Guide

GoHighLevel (GHL) is a comprehensive platform designed for agencies, marketers, and businesses to manage client interactions, marketing campaigns, and sales funnels. This integration enables you to leverage GHL's powerful CRM and communication features with our platform.

## What You Can Do With This Integration

- **Contact Sync**: Automatically sync contacts between GoHighLevel and our platform
- **Email Integration**: Send emails through GHL and track opens, clicks, and deliveries
- **Webhook Automation**: Trigger actions in our platform based on GHL events
- **Campaign Management**: Create and manage GHL campaigns directly from our interface
        `
      },
      {
        title: 'Authentication Setup',
        content: `
## Setting Up GHL Authentication

To connect your GoHighLevel account, you'll need to:

1. **Create an App in GHL Marketplace**
   - Log in to your GoHighLevel account
   - Navigate to Settings > API > External Authentication
   - Click "Add a New App"
   - Fill in the required details for your integration
   - Make sure to include your redirect URI (provided in our setup wizard)

2. **Obtain API Credentials**
   - After creating your app, GHL will provide you with:
     - Client ID
     - Client Secret
   - These credentials are required to authenticate with GHL

3. **Connect Your Account**
   - Use our setup wizard and enter the Client ID and Client Secret
   - Authorize the connection when prompted by GHL
   - Select the location you want to connect with

4. **Verify Connection**
   - After authorizing, our system will verify your connection
   - The status will show as "Connected" when successful
        `
      },
      {
        title: 'Webhook Setup',
        content: `
## Setting Up GHL Webhooks

Webhooks allow GoHighLevel to send real-time notifications to our platform when specific events occur.

1. **Navigate to Webhook Settings**
   - In your GHL account, go to Settings > API > Webhooks
   - Click "Create Webhook"

2. **Configure Webhook**
   - **Name**: Enter a descriptive name (e.g., "My SaaS Platform")
   - **URL**: Use the webhook URL provided in our setup wizard
   - **Events**: Select the events you want to track:
     - \`Contact Created\` - When a new contact is added to GHL
     - \`Contact Updated\` - When contact information changes
     - \`Email Delivered\` - When an email is successfully delivered
     - \`Email Opened\` - When a recipient opens an email
     - \`Email Clicked\` - When a recipient clicks a link in an email

3. **Secret Key (Optional but Recommended)**
   - Generate a secure random string to use as your webhook secret
   - Enter this same secret in our GHL integration settings
   - This validates that webhook requests are legitimately from GHL

4. **Test Webhook**
   - GHL provides a test button to send a sample payload
   - Verify in our platform that the test event was received
        `
      },
      {
        title: 'Working with Contacts',
        content: `
## Contact Management with GHL

Our integration allows for bi-directional contact synchronization with GoHighLevel.

### Importing GHL Contacts

1. Navigate to Contacts > Import
2. Select "GoHighLevel" as the source
3. Choose which location to import from
4. Select contact fields to import
5. Start the import process

### Contact Field Mapping

| GHL Field | Our Platform Field | Notes |
|-----------|-------------------|-------|
| \`email\` | \`email\` | Primary identifier |
| \`name\` | \`name\` | Full name |
| \`phone\` | \`phone\` | Primary phone number |
| \`address\` | \`address\` | Contact address |
| \`tags\` | \`tags\` | Synchronized as tags |
| \`custom_fields\` | \`custom_fields\` | Mapped to corresponding fields |

### Contact Tags

Tags are synchronized between platforms:

\`\`\`
// Example: Adding a tag in our platform
await addTagToContact(contactId, "newsletter-subscriber");
// This will also add the tag in GHL
\`\`\`
        `
      },
      {
        title: 'Email Integration',
        content: `
## Email Sending & Tracking with GHL

Our platform leverages GoHighLevel's email capabilities for sending and tracking emails.

### Email Delivery Process

1. When you send an email through our platform:
   - The email content is sent to GHL
   - GHL delivers the email to the recipient
   - Our platform receives delivery status updates via webhooks

2. Email performance metrics are tracked:
   - Delivery status
   - Open rate
   - Click-through rate
   - Response rate

### Email Templates

You can use our email editor to create templates that are compatible with GHL:

\`\`\`html
<!-- Example template with GHL variables -->
<p>Hello {{contact.first_name}},</p>
<p>Thank you for your interest in {{location.name}}.</p>
<p>Click <a href="{{tracking_link}}">here</a> to learn more.</p>
\`\`\`

### Email Tracking

Our dashboard displays all tracked metrics from your GHL email campaigns:

1. **Delivery Statistics**
   - Total sent
   - Delivered rate
   - Bounce rate

2. **Engagement Metrics**
   - Open rate
   - Click-through rate
   - Reply rate
        `
      },
      {
        title: 'Troubleshooting',
        content: `
## Troubleshooting GHL Integration

If you encounter issues with your GoHighLevel integration, try these common solutions:

### Connection Issues

**Problem**: Unable to connect to GHL
**Solutions**:
- Verify your Client ID and Client Secret
- Ensure your redirect URI matches exactly what's configured in GHL
- Check that your GHL account has API access enabled

### Webhook Problems

**Problem**: Not receiving webhook events
**Solutions**:
- Verify the webhook URL in GHL is correct
- Ensure all desired events are selected
- Check that your webhook secret matches
- Try sending a test webhook from GHL

### Contact Sync Issues

**Problem**: Contacts not syncing properly
**Solutions**:
- Check field mappings in both systems
- Verify the contact has a valid email address
- Ensure you have proper permissions in GHL

### API Rate Limits

**Problem**: Hitting GHL API rate limits
**Solutions**:
- Spread out bulk operations
- Implement exponential backoff for retries
- Contact GHL support for increased limits

### Getting Support

If you continue to experience issues:
1. Check our [Knowledge Base](https://help.example.com)
2. Contact our support team with:
   - Your GHL location ID
   - Error messages you're receiving
   - Steps to reproduce the issue
        `
      }
    ]
  },
  openai: {
    id: 'openai',
    title: 'OpenAI Integration',
    sections: [
      {
        title: 'Overview',
        content: `
# OpenAI Integration Guide

The OpenAI integration allows you to leverage advanced AI capabilities to enhance your email campaigns, analyze content, and generate personalized communications.

## What You Can Do With This Integration

- **Email Generation**: Create multiple AI-generated email variations based on your input
- **Content Analysis**: Analyze email performance and identify content patterns
- **A/B Testing**: Automatically generate different versions of emails for A/B testing
- **Sentiment Analysis**: Measure the emotional tone of your emails
- **Personalization**: Create personalized email content at scale
        `
      },
      {
        title: 'Authentication Setup',
        content: `
## Setting Up OpenAI Authentication

To connect your OpenAI account, you'll need an API key:

1. **Create an OpenAI Account**
   - Sign up at [platform.openai.com](https://platform.openai.com)
   - Verify your email address

2. **Generate an API Key**
   - Log in to your OpenAI account
   - Navigate to API Keys section
   - Click "Create new secret key"
   - Give your key a name and click "Create"
   - Copy your API key immediately (it won't be shown again)

3. **Enter Your API Key**
   - In our platform, navigate to Integrations > OpenAI
   - Paste your API key in the designated field
   - Set your preferred model (we recommend gpt-4o)
   - Click "Save"

4. **Verify Connection**
   - Our system will verify your API key
   - The status will show as "Connected" when successful
        `
      },
      {
        title: 'Using AI for Emails',
        content: `
## Email Generation with OpenAI

Our platform utilizes OpenAI to help you create effective email content:

### Email Variation Generation

1. **Create a Base Email**
   - Write your core message or provide a brief description
   - Specify your target audience and communication goals

2. **Generate Variations**
   - Select the number of variations (1-5)
   - Choose tone options (professional, friendly, persuasive, etc.)
   - Specify key points to emphasize

3. **Review and Edit**
   - Compare generated variations side by side
   - Edit as needed or regenerate specific sections
   - Save preferred versions as templates

### Example Prompts

Our system uses advanced prompts like these to generate emails:

\`\`\`
Generate 3 variations of a follow-up email for a marketing agency client
who hasn't responded in 2 weeks. Tone should be professional but warm.
Key points: new campaign results, scheduling next steps, value proposition.
\`\`\`

### AI Models and Settings

You can customize which OpenAI model and parameters to use:

| Setting | Description | Recommended Value |
|---------|-------------|-------------------|
| Model | AI model to use | gpt-4o |
| Temperature | Creativity level (0-1) | 0.7 |
| Max Tokens | Maximum response length | 1000 |
| Frequency Penalty | Repetition reduction | 0.5 |
        `
      },
      {
        title: 'A/B Testing with AI',
        content: `
## A/B Testing Email Campaigns with AI

Our AI integration enables sophisticated A/B testing of email content:

### Creating AI-Powered A/B Tests

1. **Define Test Variables**
   - Subject lines
   - Email introductions
   - Call-to-action phrases
   - Overall tone or approach

2. **Generate Variations**
   - Let AI create different versions based on your parameters
   - Select which elements to test
   - Choose how many variations to create

3. **Deploy Your Test**
   - Set your audience size and split
   - Schedule the campaign
   - Configure result tracking metrics

4. **Analyze Results**
   - View comprehensive performance metrics
   - See which variations performed best
   - Get AI-generated insights on patterns and trends

### Example A/B Test Scenario

\`\`\`
Test: Product Announcement Email
Variables: 
- Subject Line (3 variations)
- Introduction Paragraph (2 variations)
- CTA Button Text (2 variations)

Total Combinations: 12 variations
Target Metrics: Open rate, click rate, conversion rate
\`\`\`

### AI Analysis of Results

After your A/B test completes, our AI analyzes results to provide insights:

\`\`\`
"Based on the test results, variations with shorter subject lines (7-9 words)
showed 23% higher open rates. Emails that highlighted the product benefit in
the first sentence had 17% better click-through rates compared to those that
opened with company news."
\`\`\`
        `
      },
      {
        title: 'Advanced Features',
        content: `
## Advanced OpenAI Features

Our integration includes several advanced capabilities:

### Sentiment Analysis

The AI evaluates the emotional tone of your emails:

\`\`\`
// Example sentiment analysis result
{
  "overall_tone": "Professional",
  "sentiment_score": 0.78,  // 0-1 scale
  "tone_breakdown": {
    "professional": 0.82,
    "friendly": 0.65,
    "urgent": 0.28,
    "persuasive": 0.73
  },
  "suggestions": [
    "Consider adding more warmth in the introduction",
    "The closing paragraph feels slightly too formal"
  ]
}
\`\`\`

### Content Optimization

AI can analyze your best-performing emails and suggest optimizations:

1. **Performance Pattern Detection**
   - Identifies common elements in high-performing emails
   - Suggests structural improvements

2. **Readability Enhancement**
   - Analyzes complexity and reading level
   - Recommends clarity improvements

3. **Engagement Prediction**
   - Predicts open and click rates
   - Suggests improvements to increase engagement

### Personalization at Scale

Generate highly personalized content based on contact attributes:

\`\`\`
// Example personalization parameters
{
  "contact": {
    "industry": "healthcare",
    "role": "director",
    "previous_engagement": "downloaded_whitepaper",
    "company_size": "enterprise"
  },
  "personalization_level": "high",
  "key_message": "Schedule product demo"
}
\`\`\`
        `
      },
      {
        title: 'Troubleshooting',
        content: `
## Troubleshooting OpenAI Integration

If you encounter issues with your OpenAI integration, try these solutions:

### API Key Issues

**Problem**: "Invalid API key" or authentication errors
**Solutions**:
- Verify you've entered the complete API key correctly
- Ensure your OpenAI account is in good standing
- Check if you have billing set up in your OpenAI account
- Generate a new API key if necessary

### Rate Limiting

**Problem**: Hitting OpenAI's API rate limits
**Solutions**:
- Space out requests by adding delays between API calls
- Implement caching for similar requests
- Consider upgrading your OpenAI plan for higher limits
- Monitor usage in the OpenAI dashboard

### Content Generation Issues

**Problem**: Generated content doesn't match expectations
**Solutions**:
- Adjust temperature setting (lower for more predictable results)
- Provide more detailed prompts with clear instructions
- Check token limits aren't cutting off your responses
- Try a different model (e.g., switch to gpt-4o for better results)

### Cost Management

**Problem**: Unexpected OpenAI API costs
**Solutions**:
- Set up usage limits in your OpenAI account
- Monitor your API usage in our dashboard
- Cache responses when appropriate
- Use smaller models for less complex tasks

### Getting Support

If you continue to experience issues:
1. Check our [Knowledge Base](https://help.example.com)
2. Contact our support team with:
   - Error messages you're receiving
   - Details of the operation that's failing
   - Your OpenAI model settings
        `
      }
    ]
  },
  webhooks: {
    id: 'webhooks',
    title: 'Custom Webhooks',
    sections: [
      {
        title: 'Overview',
        content: `
# Custom Webhooks Guide

Our webhooks integration allows you to connect external systems to our platform by receiving data via HTTP requests. This enables real-time data syncing and automation with virtually any system that can send webhook requests.

## What You Can Do With Webhooks

- **Real-time Data Ingest**: Receive data from external systems in real-time
- **Custom Integrations**: Connect with any platform that supports webhook sending
- **Event-based Automation**: Trigger workflows based on external events
- **Two-way Synchronization**: Keep data in sync across multiple systems
        `
      },
      {
        title: 'Webhook Setup',
        content: `
## Setting Up Custom Webhooks

Follow these steps to set up a webhook endpoint:

1. **Create a New Webhook**
   - Navigate to Integrations > Custom Webhook
   - Click "Add Integration"
   - Provide a name for your webhook

2. **Configure Webhook Settings**
   - Copy your unique webhook URL
   - Set a webhook secret for security (recommended)
   - Configure payload mapping if needed

3. **Webhook URL Format**
   Your webhook URL will have this format:
   \`\`\`
   https://app.example.com/api/webhooks/incoming/custom/{your-unique-token}
   \`\`\`

4. **Provide URL to External System**
   - Configure the external system to send data to your webhook URL
   - Ensure proper authentication is set up
        `
      },
      {
        title: 'Security',
        content: `
## Webhook Security Best Practices

Securing your webhooks is crucial to prevent unauthorized data submissions:

### Webhook Signatures

We support signature validation using a secret key:

1. **Set a Webhook Secret**
   - Generate a strong random string
   - Store this in our webhook configuration
   - Provide the same secret to your sending system

2. **How Signatures Work**
   - The sending system creates an HMAC signature of the payload
   - Our system verifies this signature before processing
   - Requests with invalid signatures are rejected

Example signature creation (pseudo-code):
\`\`\`
signature = HMAC_SHA256(webhook_secret, request_body)
\`\`\`

### Headers to Include

When sending requests to our webhook, include these headers:

\`\`\`
X-Webhook-Signature: {hmac_signature}
Content-Type: application/json
\`\`\`

### IP Whitelisting

For additional security, you can whitelist IPs:

1. Navigate to your webhook settings
2. Add approved IP addresses
3. All requests from other IPs will be rejected
        `
      },
      {
        title: 'Payload Mapping',
        content: `
## Webhook Payload Mapping

Our webhook system allows you to map incoming data to our internal data structure:

### Basic Mapping Configuration

Specify how external data fields map to our system fields:

\`\`\`json
{
  "contact": {
    "email": "data.user.email",
    "name": "data.user.fullName",
    "phone": "data.user.phoneNumber",
    "tags": "data.user.categories"
  },
  "metadata": {
    "source": "data.source",
    "external_id": "data.id"
  }
}
\`\`\`

### Nested Field Access

Access deeply nested properties using dot notation:

\`\`\`
data.subscription.plan.name
\`\`\`

### Array Handling

Process arrays in incoming webhooks:

\`\`\`json
{
  "contacts": "data.users[*]",
  "contact_mapping": {
    "email": "email",
    "name": "name"
  }
}
\`\`\`

### Transformation Functions

Apply basic transformations to incoming data:

\`\`\`json
{
  "contact": {
    "email": "lowercase(data.email)",
    "name": "concatenate(data.firstName, ' ', data.lastName)",
    "joined_date": "toISODate(data.joinedAt)"
  }
}
\`\`\`
        `
      },
      {
        title: 'Testing & Debugging',
        content: `
## Testing and Debugging Webhooks

Test your webhook configuration to ensure proper functionality:

### Built-in Testing Tool

Our platform includes a webhook testing tool:

1. Navigate to your webhook settings
2. Click "Test Webhook"
3. Send a sample payload
4. View the processed result

### Request Logs

All webhook requests are logged for debugging:

1. Access the webhook logs section
2. View request timestamps, payloads, and processing status
3. Filter logs by status or date range

Example log entry:
\`\`\`
Timestamp: 2023-06-15T14:23:45Z
Source IP: 203.0.113.42
Signature Valid: Yes
Status: Processed
Payload: { "data": { "user": { "email": "test@example.com", ... } } }
Processing Result: Contact created (ID: 12345)
\`\`\`

### Webhook Simulation

Test your mappings with sample payloads:

1. Go to webhook settings
2. Click "Simulate Webhook"
3. Paste a sample JSON payload
4. View how it would be processed

### Common Error Codes

| HTTP Code | Meaning |
|-----------|---------|
| 200 | Success - webhook processed |
| 400 | Bad request - invalid payload format |
| 401 | Unauthorized - invalid signature |
| 403 | Forbidden - IP not in allowlist |
| 422 | Unprocessable Entity - valid but cannot be processed |
| 429 | Too Many Requests - rate limit exceeded |
        `
      },
      {
        title: 'Advanced Usage',
        content: `
## Advanced Webhook Features

Our webhook system supports several advanced capabilities:

### Conditional Processing

Process webhooks based on conditions:

\`\`\`json
{
  "conditions": [
    {
      "if": "data.event_type == 'user.created'",
      "then": {
        "action": "create_contact",
        "mapping": {
          "email": "data.user.email",
          "name": "data.user.name"
        }
      }
    },
    {
      "if": "data.event_type == 'user.updated'",
      "then": {
        "action": "update_contact",
        "finder": "data.user.email",
        "mapping": {
          "name": "data.user.name",
          "phone": "data.user.phone"
        }
      }
    }
  ]
}
\`\`\`

### Webhook Chaining

Trigger outgoing webhooks when receiving an incoming webhook:

1. Configure an incoming webhook
2. Set up a workflow triggered by that webhook
3. Add an outgoing webhook action to the workflow

### Custom Code Transformations

For complex transformations, use custom JavaScript:

1. Navigate to advanced webhook settings
2. Add a JavaScript transformation function
3. Your function will receive the webhook payload as input

Example transformation function:
\`\`\`javascript
function transform(data) {
  // Custom logic here
  const fullName = [data.firstName, data.middleName, data.lastName]
    .filter(Boolean)
    .join(' ');
  
  return {
    email: data.email.toLowerCase(),
    name: fullName,
    tags: data.interests.split(',').map(i => i.trim())
  };
}
\`\`\`
        `
      }
    ]
  }
};

/**
 * Get documentation for a specific integration
 * GET /api/integrations/documentation
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    
    // If an ID is provided, return documentation for that specific integration
    if (id && typeof id === 'string') {
      const documentation = documentationMap[id];
      
      if (!documentation) {
        return res.status(404).json({
          success: false,
          error: 'Documentation not found'
        });
      }
      
      return res.json({
        success: true,
        data: [documentation]  // Return as array for consistency with the "all" response
      });
    }
    
    // Otherwise, return all documentation
    const allDocumentation = Object.values(documentationMap);
    
    return res.json({
      success: true,
      data: allDocumentation
    });
  } catch (error) {
    console.error('Error fetching documentation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch documentation'
    });
  }
});

export default router;