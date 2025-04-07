import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { ghlConfig } from '../config/ghlConfig';

export const router = Router();

// Utility function to generate a webhook URL for a user and provider
function generateWebhookUrl(userId: number, provider: string): string {
  // Create a unique but deterministic token based on user ID and provider
  const hmac = crypto.createHmac('sha256', 'webhook-secret-key');
  hmac.update(`${userId}:${provider}`);
  const token = hmac.digest('hex');
  
  // Use the current host or a default
  const host = process.env.APP_HOST || 'https://app.yourservice.com';
  
  return `${host}/api/webhooks/incoming/${provider}/${token}`;
}

// Integration metadata types
interface IntegrationConfigField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  description?: string;
  placeholder?: string;
  options?: string[];
}

interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  requiresClientId: boolean;
  requiresClientSecret: boolean;
}

interface WebhookConfig {
  events: { id: string; name: string; description: string }[];
  requiresSecret: boolean;
}

interface ModuleConfig {
  id: string;
  name: string;
  type: string;
  description: string;
  configFields?: IntegrationConfigField[];
  requiredParams?: {
    name: string;
    type: string;
    description?: string;
  }[];
  requiredAuthMethod?: string;
  schema?: Record<string, any>;
}

interface IntegrationMetadata {
  id: string;
  name: string;
  iconUrl: string;
  backgroundColor: string;
  description: string;
  category: string;
  authMethod: 'oauth2' | 'apikey' | 'webhook' | 'ghl-oauth' | 'ghl-apikey' | 'none';
  badges: string[];
  configFields: IntegrationConfigField[];
  oauthConfig?: OAuthConfig;
  webhookConfig?: WebhookConfig;
  documentationUrl: string;
  setupInstructions?: string;
  availableTriggers?: ModuleConfig[];
  availableActions?: ModuleConfig[];
}

/**
 * Get all available integration apps
 * GET /api/integrations/available-apps
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get the authenticated user
    const userId = req.session?.userId || 1; // Default to user 1 for development
    
    // Generate dynamic values for the user
    const ghlWebhookUrl = generateWebhookUrl(userId, 'gohighlevel');
    const openaiWebhookUrl = generateWebhookUrl(userId, 'openai');
    
    // Define available integrations with enhanced metadata
    const availableIntegrations: IntegrationMetadata[] = [
      {
        id: 'gohighlevel',
        name: 'GoHighLevel',
        iconUrl: 'https://assets.gohighlevel.com/images/brand/logos/logo.svg',
        backgroundColor: '#4CAF50',
        description: 'Connect to GoHighLevel to synchronize contacts and send emails',
        category: 'CRM',
        authMethod: 'ghl-oauth',
        badges: ['Core', 'Required'],
        configFields: [
          {
            name: 'locationId',
            label: 'Location ID',
            type: 'text',
            required: true,
            description: 'The GHL Location ID to connect with',
            placeholder: 'Enter location ID'
          },
          {
            name: 'webhookSecret',
            label: 'Webhook Secret',
            type: 'password',
            required: false,
            description: 'Used to verify incoming webhooks from GHL',
            placeholder: 'Enter webhook secret'
          }
        ],
        oauthConfig: {
          authUrl: ghlConfig.authUrl,
          tokenUrl: ghlConfig.tokenUrl,
          scopes: ghlConfig.scopes.split(' '),
          requiresClientId: true,
          requiresClientSecret: true
        },
        webhookConfig: {
          events: [
            { id: 'contact.created', name: 'Contact Created', description: 'Triggered when a new contact is created in GHL' },
            { id: 'contact.updated', name: 'Contact Updated', description: 'Triggered when a contact is updated in GHL' },
            { id: 'contact.deleted', name: 'Contact Deleted', description: 'Triggered when a contact is deleted in GHL' },
            { id: 'email.delivered', name: 'Email Delivered', description: 'Triggered when an email is delivered to a contact' },
            { id: 'email.opened', name: 'Email Opened', description: 'Triggered when a contact opens an email' },
            { id: 'email.clicked', name: 'Email Clicked', description: 'Triggered when a contact clicks a link in an email' }
          ],
          requiresSecret: true
        },
        availableTriggers: [
          {
            id: 'ghl_contact_created',
            name: 'Contact Created',
            type: 'webhook',
            description: 'Triggered when a new contact is created in GHL',
            configFields: [
              {
                name: 'tagFilter',
                label: 'Tag Filter',
                type: 'text',
                required: false,
                description: 'Only trigger for contacts with this tag'
              }
            ]
          },
          {
            id: 'ghl_contact_updated',
            name: 'Contact Updated',
            type: 'webhook',
            description: 'Triggered when a contact is updated in GHL'
          },
          {
            id: 'ghl_email_opened',
            name: 'Email Opened',
            type: 'webhook',
            description: 'Triggered when a contact opens an email sent through GHL'
          },
          {
            id: 'ghl_email_clicked',
            name: 'Email Clicked',
            type: 'webhook',
            description: 'Triggered when a contact clicks a link in an email'
          }
        ],
        availableActions: [
          {
            id: 'ghl_add_contact',
            name: 'Add Contact',
            type: 'api_call',
            description: 'Create a new contact in GHL',
            configFields: [
              {
                name: 'firstName',
                label: 'First Name',
                type: 'text',
                required: true,
                description: 'Contact first name'
              },
              {
                name: 'lastName',
                label: 'Last Name',
                type: 'text',
                required: false,
                description: 'Contact last name'
              },
              {
                name: 'email',
                label: 'Email',
                type: 'text',
                required: true,
                description: 'Contact email address'
              },
              {
                name: 'phone',
                label: 'Phone',
                type: 'text',
                required: false,
                description: 'Contact phone number'
              },
              {
                name: 'tags',
                label: 'Tags',
                type: 'text',
                required: false,
                description: 'Comma-separated list of tags to add'
              }
            ],
            requiredAuthMethod: 'oauth2'
          },
          {
            id: 'ghl_send_email',
            name: 'Send Email',
            type: 'api_call',
            description: 'Send an email to a contact via GHL',
            configFields: [
              {
                name: 'contactId',
                label: 'Contact ID',
                type: 'text',
                required: true,
                description: 'The GHL contact ID to send to'
              },
              {
                name: 'templateId',
                label: 'Template ID',
                type: 'text',
                required: false,
                description: 'GHL email template ID (optional)'
              },
              {
                name: 'subject',
                label: 'Subject',
                type: 'text',
                required: true,
                description: 'Email subject line'
              },
              {
                name: 'body',
                label: 'Body',
                type: 'textarea',
                required: true,
                description: 'Email body content (HTML supported)'
              }
            ],
            requiredAuthMethod: 'oauth2'
          },
          {
            id: 'ghl_add_tag',
            name: 'Add Tag',
            type: 'api_call',
            description: 'Add a tag to an existing contact',
            configFields: [
              {
                name: 'contactId',
                label: 'Contact ID',
                type: 'text',
                required: true,
                description: 'The GHL contact ID'
              },
              {
                name: 'tag',
                label: 'Tag',
                type: 'text',
                required: true,
                description: 'Tag to add to the contact'
              }
            ],
            requiredAuthMethod: 'oauth2'
          }
        ],
        documentationUrl: '/api/integrations/documentation?id=gohighlevel',
        setupInstructions: `
# Setting up GoHighLevel Integration

## Step 1: Create an App in GHL Marketplace
1. Log in to your GoHighLevel account
2. Navigate to Settings > API > External Authentication
3. Click "Add a New App"
4. Fill in the following details:
   - App Name: Your SaaS Name
   - Description: A brief description of your integration
   - Developer Contact Email: Your email
   - Privacy Policy URL: Your privacy policy URL
   - Terms of Service URL: Your terms of service URL
   - Authorized Redirect URI: ${ghlConfig.redirectUri}
   - Scopes: Select the permissions your app needs

## Step 2: Configure Webhooks
1. Navigate to Settings > API > Webhooks
2. Click "Create Webhook"
3. Use this Webhook URL: ${ghlWebhookUrl}
4. Select the events you want to receive

## Step 3: Complete Connection
1. Enter the Client ID and Client Secret provided by GHL
2. Click "Connect" to authorize your account
3. Select the location you want to connect
`
      },
      {
        id: 'openai',
        name: 'OpenAI',
        iconUrl: 'https://cdn.worldvectorlogo.com/logos/openai-2.svg',
        backgroundColor: '#10A37F',
        description: 'Connect to OpenAI to generate email variations and analyze performance',
        category: 'AI',
        authMethod: 'apikey',
        badges: ['Verified'],
        configFields: [
          {
            name: 'apiKey',
            label: 'API Key',
            type: 'password',
            required: true,
            description: 'Your OpenAI API key',
            placeholder: 'sk-...'
          },
          {
            name: 'model',
            label: 'Default Model',
            type: 'text',
            required: false,
            description: 'The OpenAI model to use by default',
            placeholder: 'gpt-4o'
          },
          {
            name: 'temperature',
            label: 'Temperature',
            type: 'text',
            required: false,
            description: 'Controls randomness (0-1), lower values are more focused',
            placeholder: '0.7'
          }
        ],
        availableActions: [
          {
            id: 'openai_generate_text',
            name: 'Generate Text',
            type: 'api_call',
            description: 'Generate text using OpenAI models',
            configFields: [
              {
                name: 'prompt',
                label: 'Prompt',
                type: 'textarea',
                required: true,
                description: 'The prompt to send to OpenAI'
              },
              {
                name: 'model',
                label: 'Model',
                type: 'select',
                required: false,
                description: 'OpenAI model to use',
                options: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
              },
              {
                name: 'temperature',
                label: 'Temperature',
                type: 'text',
                required: false,
                description: 'Controls randomness (0-1)',
                placeholder: '0.7'
              },
              {
                name: 'max_tokens',
                label: 'Maximum Length',
                type: 'number',
                required: false,
                description: 'Maximum number of tokens to generate',
                placeholder: '500'
              }
            ],
            requiredAuthMethod: 'apikey'
          },
          {
            id: 'openai_analyze_text',
            name: 'Analyze Text',
            type: 'api_call',
            description: 'Analyze text content using OpenAI',
            configFields: [
              {
                name: 'text',
                label: 'Text to Analyze',
                type: 'textarea',
                required: true,
                description: 'The text content to analyze'
              },
              {
                name: 'analysis_type',
                label: 'Analysis Type',
                type: 'select',
                required: true,
                description: 'Type of analysis to perform',
                options: ['sentiment', 'key_points', 'topics', 'custom']
              },
              {
                name: 'custom_instructions',
                label: 'Custom Instructions',
                type: 'textarea',
                required: false,
                description: 'Custom analysis instructions (if type is custom)'
              }
            ],
            requiredAuthMethod: 'apikey'
          },
          {
            id: 'openai_email_variations',
            name: 'Generate Email Variations',
            type: 'api_call',
            description: 'Create different variations of an email',
            configFields: [
              {
                name: 'email_content',
                label: 'Original Email',
                type: 'textarea',
                required: true,
                description: 'The original email content'
              },
              {
                name: 'variation_count',
                label: 'Number of Variations',
                type: 'number',
                required: true,
                description: 'How many variations to generate',
                placeholder: '3'
              },
              {
                name: 'instructions',
                label: 'Instructions',
                type: 'textarea',
                required: false,
                description: 'Instructions for how to vary the email (tone, format, etc.)'
              }
            ],
            requiredAuthMethod: 'apikey'
          }
        ],
        documentationUrl: '/api/integrations/documentation?id=openai',
        setupInstructions: `
# Setting up OpenAI Integration

## Step 1: Get an API Key
1. Log in to your OpenAI account at [https://platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys section
3. Click "Create new secret key"
4. Give your key a name and click "Create"
5. Copy your API key (it won't be shown again)

## Step 2: Configure Integration
1. Paste your API Key in the form
2. Choose your preferred model (we recommend gpt-4o for best results)
3. Adjust temperature if needed (0.7 is a good default)
4. Click "Save" to connect

## Step 3: Test Your Connection
After saving, click "Test Connection" to verify your API key is working properly.
`
      },
      {
        id: 'http',
        name: 'HTTP',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/2165/2165004.png',
        backgroundColor: '#5D4037',
        description: 'Make HTTP requests to external APIs and services',
        category: 'Integration',
        authMethod: 'none',
        badges: ['Built-in'],
        configFields: [
          {
            name: 'connectionName',
            label: 'Connection Name',
            type: 'text',
            required: true,
            description: 'A name to identify this HTTP connection',
            placeholder: 'My API Connection'
          },
          {
            name: 'baseUrl',
            label: 'Base URL',
            type: 'text',
            required: false,
            description: 'Optional base URL for all requests with this connection',
            placeholder: 'https://api.example.com'
          }
        ],
        availableActions: [
          {
            id: 'http_request',
            name: 'Make a Request',
            type: 'api_call',
            description: 'Send an HTTP request to any endpoint',
            configFields: [
              {
                name: 'url',
                label: 'URL',
                type: 'text',
                required: true,
                description: 'The full URL to send the request to',
                placeholder: 'https://api.example.com/endpoint'
              },
              {
                name: 'method',
                label: 'Method',
                type: 'select',
                required: true,
                description: 'HTTP method to use',
                options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
              },
              {
                name: 'headers',
                label: 'Headers',
                type: 'key_value',
                required: false,
                description: 'HTTP headers to include in the request'
              },
              {
                name: 'queryParams',
                label: 'Query Parameters',
                type: 'key_value',
                required: false,
                description: 'URL query parameters'
              },
              {
                name: 'body',
                label: 'Request Body',
                type: 'textarea',
                required: false,
                description: 'JSON body to send with the request'
              },
              {
                name: 'parseResponse',
                label: 'Parse Response JSON',
                type: 'checkbox',
                required: false,
                description: 'Automatically parse JSON response'
              }
            ]
          }
        ],
        documentationUrl: '/api/integrations/documentation?id=http'
      },
      {
        id: 'webhook',
        name: 'Custom Webhook',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/1505/1505569.png',
        backgroundColor: '#607D8B',
        description: 'Create a custom webhook endpoint to receive data from any external system',
        category: 'Integration',
        authMethod: 'webhook',
        badges: ['Advanced'],
        configFields: [
          {
            name: 'webhookName',
            label: 'Webhook Name',
            type: 'text',
            required: true,
            description: 'A name to identify this webhook',
            placeholder: 'My External System'
          },
          {
            name: 'webhookSecret',
            label: 'Webhook Secret',
            type: 'password',
            required: false,
            description: 'Secret key to validate webhook requests',
            placeholder: 'Enter a secret key'
          },
          {
            name: 'payloadMapping',
            label: 'Payload Mapping',
            type: 'textarea',
            required: false,
            description: 'JSON mapping of webhook payload to internal fields',
            placeholder: '{\n  "email": "data.user.email",\n  "name": "data.user.name"\n}'
          }
        ],
        webhookConfig: {
          events: [
            { id: 'webhook.received', name: 'Webhook Received', description: 'Triggered when any data is received on this webhook' }
          ],
          requiresSecret: true
        },
        availableTriggers: [
          {
            id: 'webhook_received',
            name: 'Webhook Received',
            type: 'webhook',
            description: 'Triggered when data is received on this webhook endpoint',
            configFields: [
              {
                name: 'expectedFormat',
                label: 'Expected Data Format',
                type: 'select',
                required: false,
                description: 'Expected format of incoming data',
                options: ['JSON', 'Form Data', 'XML', 'Any']
              }
            ]
          }
        ],
        documentationUrl: '/api/integrations/documentation?id=webhooks'
      },
      // The integrations for Mailchimp, Zapier, Slack, Twilio, and HubSpot have been removed as per requirements
    ];
    
    return res.json({
      success: true,
      data: availableIntegrations
    });
  } catch (error) {
    console.error('Error fetching available integrations:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch available integrations'
    });
  }
});

/**
 * Get a specific integration app by ID
 * GET /api/integrations/available-apps/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Get the authenticated user
    const userId = req.session?.userId || 1; // Default to user 1 for development
    const { id } = req.params;
    
    // Generate dynamic values for the user
    const webhookUrl = generateWebhookUrl(userId, id);
    
    // Get all available apps and find the requested one
    const availableIntegrations = await getAllAvailableApps(userId);
    const integration = availableIntegrations.find(app => app.id === id);
    
    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration app not found'
      });
    }
    
    return res.json({
      success: true,
      data: integration
    });
  } catch (error) {
    console.error(`Error fetching integration app ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch integration app'
    });
  }
});

/**
 * Helper function to get all available apps
 */
async function getAllAvailableApps(userId: number): Promise<IntegrationMetadata[]> {
  // Generate dynamic values for the user
  const ghlWebhookUrl = generateWebhookUrl(userId, 'gohighlevel');
  const openaiWebhookUrl = generateWebhookUrl(userId, 'openai');
  
  // This would typically come from a database in production
  return [
    {
      id: 'gohighlevel',
      name: 'GoHighLevel',
      iconUrl: 'https://assets.gohighlevel.com/images/brand/logos/logo.svg',
      backgroundColor: '#4CAF50',
      description: 'Connect to GoHighLevel to synchronize contacts and send emails',
      category: 'CRM',
      authMethod: 'ghl-oauth',
      badges: ['Core', 'Required'],
      configFields: [
        {
          name: 'locationId',
          label: 'Location ID',
          type: 'text',
          required: true,
          description: 'The GHL Location ID to connect with',
          placeholder: 'Enter location ID'
        },
        {
          name: 'webhookSecret',
          label: 'Webhook Secret',
          type: 'password',
          required: false,
          description: 'Used to verify incoming webhooks from GHL',
          placeholder: 'Enter webhook secret'
        },
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: false,
          description: 'Your GHL API key for direct API access',
          placeholder: 'Enter API key'
        }
      ],
      oauthConfig: {
        authUrl: ghlConfig.authUrl,
        tokenUrl: ghlConfig.tokenUrl,
        scopes: ghlConfig.scopes.split(' '),
        requiresClientId: true,
        requiresClientSecret: true
      },
      webhookConfig: {
        events: [
          { id: 'contact.created', name: 'Contact Created', description: 'Triggered when a new contact is created in GHL' },
          { id: 'contact.updated', name: 'Contact Updated', description: 'Triggered when a contact is updated in GHL' },
          { id: 'contact.deleted', name: 'Contact Deleted', description: 'Triggered when a contact is deleted in GHL' },
          { id: 'email.delivered', name: 'Email Delivered', description: 'Triggered when an email is delivered to a contact' },
          { id: 'email.opened', name: 'Email Opened', description: 'Triggered when a contact opens an email' },
          { id: 'email.clicked', name: 'Email Clicked', description: 'Triggered when a contact clicks a link in an email' }
        ],
        requiresSecret: true
      },
      documentationUrl: '/api/integrations/documentation?id=gohighlevel',
      setupInstructions: `
# Setting up GoHighLevel Integration

## Step 1: Create an App in GHL Marketplace
1. Log in to your GoHighLevel account
2. Navigate to Settings > API > External Authentication
3. Click "Add a New App"
4. Fill in the following details:
   - App Name: Your SaaS Name
   - Description: A brief description of your integration
   - Developer Contact Email: Your email
   - Privacy Policy URL: Your privacy policy URL
   - Terms of Service URL: Your terms of service URL
   - Authorized Redirect URI: ${ghlConfig.redirectUri}
   - Scopes: Select the permissions your app needs

## Step 2: Configure Webhooks
1. Navigate to Settings > API > Webhooks
2. Click "Create Webhook"
3. Use this Webhook URL: ${ghlWebhookUrl}
4. Select the events you want to receive

## Step 3: Complete Connection
1. Enter the Client ID and Client Secret provided by GHL
2. Click "Connect" to authorize your account
3. Select the location you want to connect

## Alternative: Direct API Connection 
If you prefer direct API access instead of OAuth:
1. Navigate to Settings > API > API Keys
2. Create a new API key with appropriate permissions
3. Select this method and enter your API Key
`
    },
    {
      id: 'openai',
      name: 'OpenAI',
      iconUrl: 'https://cdn.worldvectorlogo.com/logos/openai-2.svg',
      backgroundColor: '#10A37F',
      description: 'Connect to OpenAI to generate email variations and analyze performance',
      category: 'AI',
      authMethod: 'apikey',
      badges: ['Verified'],
      configFields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          description: 'Your OpenAI API key',
          placeholder: 'sk-...'
        },
        {
          name: 'model',
          label: 'Default Model',
          type: 'text',
          required: false,
          description: 'The OpenAI model to use by default',
          placeholder: 'gpt-4o'
        },
        {
          name: 'temperature',
          label: 'Temperature',
          type: 'text',
          required: false,
          description: 'Controls randomness (0-1), lower values are more focused',
          placeholder: '0.7'
        }
      ],
      documentationUrl: '/api/integrations/documentation?id=openai',
      setupInstructions: `
# Setting up OpenAI Integration

## Step 1: Get an API Key
1. Log in to your OpenAI account at [https://platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys section
3. Click "Create new secret key"
4. Give your key a name and click "Create"
5. Copy your API key (it won't be shown again)

## Step 2: Configure Integration
1. Paste your API Key in the form
2. Choose your preferred model (we recommend gpt-4o for best results)
3. Adjust temperature if needed (0.7 is a good default)
4. Click "Save" to connect

## Step 3: Test Your Connection
After saving, click "Test Connection" to verify your API key is working properly.
`
    },
    {
      id: 'http',
      name: 'HTTP',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/2165/2165004.png',
      backgroundColor: '#5D4037',
      description: 'Make HTTP requests to external APIs and services',
      category: 'Integration',
      authMethod: 'none',
      badges: ['Built-in'],
      configFields: [
        {
          name: 'connectionName',
          label: 'Connection Name',
          type: 'text',
          required: true,
          description: 'A name to identify this HTTP connection',
          placeholder: 'My API Connection'
        },
        {
          name: 'baseUrl',
          label: 'Base URL',
          type: 'text',
          required: true,
          description: 'The base URL for API requests',
          placeholder: 'https://api.example.com'
        },
        {
          name: 'defaultHeaders',
          label: 'Default Headers',
          type: 'textarea',
          required: false,
          description: 'Default headers as JSON: {"Content-Type": "application/json"}',
          placeholder: '{"Content-Type": "application/json"}'
        }
      ],
      documentationUrl: '/api/integrations/documentation?id=http'
    },
    {
      id: 'webhook',
      name: 'Custom Webhook',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/9918/9918694.png',
      backgroundColor: '#607D8B',
      description: 'Create webhooks to receive data from external systems',
      category: 'Integration',
      authMethod: 'webhook',
      badges: ['Built-in'],
      configFields: [
        {
          name: 'connectionName',
          label: 'Webhook Name',
          type: 'text',
          required: true,
          description: 'A name to identify this webhook',
          placeholder: 'My Application Webhook'
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          required: false,
          description: 'Description of what this webhook is for',
          placeholder: 'Receives events from my application'
        },
        {
          name: 'secret',
          label: 'Webhook Secret',
          type: 'password',
          required: false,
          description: 'Secret to validate incoming webhook requests',
          placeholder: 'Enter a secret key'
        }
      ],
      documentationUrl: '/api/integrations/documentation?id=webhook'
    }
    // Mailchimp, Zapier, Slack, Twilio, and HubSpot integrations removed
  ];
}

export default router;