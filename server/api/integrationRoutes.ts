import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import OpenAI from 'openai';
import axios from 'axios';
import crypto from 'crypto';
import { ghlConfig } from '../config/ghlConfig';
import { openaiConfig } from '../config/openaiConfig';

// Import specialized integration route handlers
import availableAppsRouter from './integrationAvailableAppsRoutes';
import connectionRouter from './integrationConnectionsRoutes';
import documentationRouter from './integrationDocumentationRoutes';
import webhookRouter from './webhookRoutes';

const router = Router();

// Register specialized routes
router.use('/available-apps', availableAppsRouter);
router.use('/connections', connectionRouter);
router.use('/documentation', documentationRouter);
router.use('/webhooks', webhookRouter);

// Integration metadata types
interface IntegrationConfigField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  description?: string;
  placeholder?: string;
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
}

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

// Schema for validating integration data
const integrationSchema = z.object({
  provider: z.string(),
  access_token: z.string(),
  refresh_token: z.string().optional().nullable(),
  token_expires_at: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  config: z.record(z.any()).optional().nullable(),
});

/**
 * Get all integrations for the current user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get the authenticated user from session
    const userId = req.session.userId || 1; // Default to user 1 for development

    // Get all integration connections for this user
    const integrationsMap = new Map();
    const providers = ['gohighlevel', 'openai'];

    for (const provider of providers) {
      const connection = await storage.getIntegrationConnection(userId, provider);
      if (connection) {
        integrationsMap.set(provider, connection);
      }
    }

    // Convert map to array
    const integrations = Array.from(integrationsMap.values());

    return res.json({ 
      success: true, 
      data: integrations 
    });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch integrations' 
    });
  }
});

/**
 * Create or update an integration connection
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Get the authenticated user from session
    const userId = req.session.userId || 1; // Default to user 1 for development

    // Validate request body
    const validatedData = integrationSchema.parse(req.body);

    // Create integration connection data
    const integrationData = {
      user_id: userId,
      provider: validatedData.provider,
      access_token: validatedData.access_token,
      refresh_token: validatedData.refresh_token,
      token_expires_at: validatedData.token_expires_at ? new Date(validatedData.token_expires_at) : null,
      is_active: validatedData.is_active,
      config: validatedData.config,
    };

    // Get existing connection
    const existingConnection = await storage.getIntegrationConnection(userId, validatedData.provider);

    let connection;
    if (existingConnection) {
      // Update existing connection
      connection = await storage.updateIntegrationConnection(existingConnection.id, integrationData);
    } else {
      // Create new connection
      connection = await storage.createIntegrationConnection(integrationData);
    }

    return res.json({ 
      success: true, 
      data: connection 
    });
  } catch (error) {
    console.error('Error saving integration:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to save integration' 
    });
  }
});

/**
 * Test an integration connection
 */
router.post('/:provider/test', async (req: Request, res: Response) => {
  try {
    // Get the authenticated user from session
    const userId = req.session.userId || 1; // Default to user 1 for development
    const { provider } = req.params;

    // Get the integration connection
    const connection = await storage.getIntegrationConnection(userId, provider);
    if (!connection || !connection.access_token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Integration not configured' 
      });
    }

    // Test the connection based on provider
    let testResult = false;
    
    switch (provider) {
      case 'openai':
        testResult = await testOpenAIConnection(connection.access_token);
        break;
      case 'gohighlevel':
        testResult = await testGHLConnection(connection.access_token);
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Unsupported provider' 
        });
    }

    return res.json({ 
      success: testResult, 
      message: testResult ? 'Connection successful' : 'Connection failed' 
    });
  } catch (error) {
    console.error(`Error testing ${req.params.provider} integration:`, error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to test integration' 
    });
  }
});

/**
 * Delete an integration connection
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Get the authenticated user from session
    const userId = req.session.userId || 1; // Default to user 1 for development
    const integrationId = parseInt(req.params.id);

    // Get the integration to verify ownership
    const connection = await storage.getIntegrationConnection(userId, integrationId);
    if (!connection) {
      return res.status(404).json({ 
        success: false, 
        error: 'Integration not found' 
      });
    }

    // Delete the integration
    const result = await storage.deleteIntegrationConnection(integrationId);
    return res.json({ 
      success: result 
    });
  } catch (error) {
    console.error('Error deleting integration:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete integration' 
    });
  }
});

/**
 * Test OpenAI connection
 */
async function testOpenAIConnection(apiKey: string): Promise<boolean> {
  try {
    const openai = new OpenAI({ apiKey });
    
    // Make a simple request to test the API key
    await openai.models.list();
    return true;
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return false;
  }
}

/**
 * Test GoHighLevel connection
 */
async function testGHLConnection(apiKey: string): Promise<boolean> {
  try {
    // Make a request to GHL API to verify the token
    const response = await axios.get('https://services.msgsndr.com/locations/api/v1/locations', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    });

    return response.status === 200;
  } catch (error) {
    console.error('GHL connection test failed:', error);
    return false;
  }
}

/**
 * Get all available integrations
 */
router.get('/available', async (req: Request, res: Response) => {
  try {
    // Get the authenticated user
    const userId = req.session?.userId || 1; // Default to user 1 for development
    
    // Generate dynamic values for the user
    const ghlWebhookUrl = generateWebhookUrl(userId, 'gohighlevel');
    const openaiWebhookUrl = generateWebhookUrl(userId, 'openai');
    
    // Define available integrations
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
        documentationUrl: 'https://developers.gohighlevel.com/',
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
        documentationUrl: 'https://platform.openai.com/docs/introduction',
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
      }
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
 * Get connection webhook URL
 */
router.get('/:provider/webhook-url', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId || 1; // Default to user 1 for development
    const { provider } = req.params;
    
    const webhookUrl = generateWebhookUrl(userId, provider);
    
    return res.json({
      success: true,
      data: {
        webhookUrl
      }
    });
  } catch (error) {
    console.error('Error generating webhook URL:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate webhook URL'
    });
  }
});

export default router;