import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import OpenAI from 'openai';
import axios from 'axios';

export const router = Router();

// Schema for validating integration data
const integrationSchema = z.object({
  provider: z.string(),
  name: z.string().optional(),
  iconUrl: z.string().optional(),
  backgroundColor: z.string().optional(),
  access_token: z.string(),
  refresh_token: z.string().optional().nullable(),
  token_expires_at: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  config: z.record(z.any()).optional().nullable(),
});

/**
 * Get all user's integration connections
 * GET /api/integrations/connections
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get the authenticated user from session
    const userId = req.session?.userId || 1; // Default to user 1 for development

    // Get all connection data with app info
    const connections = await getAllUserConnections(userId);

    return res.json({
      success: true,
      data: connections
    });
  } catch (error) {
    console.error('Error fetching user connections:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch connections'
    });
  }
});

/**
 * Create or update an integration connection
 * POST /api/integrations/connections
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Get the authenticated user from session
    const userId = req.session?.userId || 1; // Default to user 1 for development

    // Validate request body
    const validatedData = integrationSchema.parse(req.body);

    // Get existing connection
    const existingConnection = await storage.getIntegrationConnection(userId, validatedData.provider);

    let connection;
    if (existingConnection) {
      // Update existing connection
      const updateData = {
        name: validatedData.name, 
        iconUrl: validatedData.iconUrl,
        backgroundColor: validatedData.backgroundColor,
        access_token: validatedData.access_token,
        refresh_token: validatedData.refresh_token,
        token_expires_at: validatedData.token_expires_at ? new Date(validatedData.token_expires_at) : null,
        is_active: validatedData.is_active,
        config: validatedData.config,
      };

      connection = await storage.updateIntegrationConnection(existingConnection.id, updateData);
    } else {
      // Create new connection
      const connectionData = {
        user_id: userId,
        provider: validatedData.provider,
        name: validatedData.name || getAppNameByProvider(validatedData.provider),
        iconUrl: validatedData.iconUrl || getAppIconByProvider(validatedData.provider),
        backgroundColor: validatedData.backgroundColor || getAppBackgroundColorByProvider(validatedData.provider),
        access_token: validatedData.access_token,
        refresh_token: validatedData.refresh_token,
        token_expires_at: validatedData.token_expires_at ? new Date(validatedData.token_expires_at) : null,
        is_active: validatedData.is_active,
        config: validatedData.config,
      };

      connection = await storage.createIntegrationConnection(connectionData);
    }

    // Fetch app metadata to return with the connection (only if missing)
    const enhancedConnection = {
      ...connection,
      // Only include these if they aren't already in the connection object
      name: connection.name || getAppNameByProvider(connection.provider),
      iconUrl: connection.iconUrl || getAppIconByProvider(connection.provider),
      backgroundColor: connection.backgroundColor || getAppBackgroundColorByProvider(connection.provider),
      // Maintain backward compatibility with existing code
      app_name: connection.name || getAppNameByProvider(connection.provider),
      app_icon: connection.iconUrl || getAppIconByProvider(connection.provider),
      app_background_color: connection.backgroundColor || getAppBackgroundColorByProvider(connection.provider)
    };

    return res.json({
      success: true,
      data: enhancedConnection
    });
  } catch (error) {
    console.error('Error saving connection:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof z.ZodError 
        ? error.errors.map(e => e.message).join(', ') 
        : 'Failed to save connection'
    });
  }
});

/**
 * Get a specific integration connection
 * GET /api/integrations/connections/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Get the authenticated user from session
    const userId = req.session?.userId || 1; // Default to user 1 for development
    
    // Get connection ID from params (could be numeric ID or provider string)
    const connId = req.params.id;
    
    // Check if the ID is a provider name or a numeric ID
    let connection;
    if (isNaN(parseInt(connId))) {
      // It's a provider name
      connection = await storage.getIntegrationConnection(userId, connId);
    } else {
      // It's a numeric ID - future implementation
      // For now, return 400 error
      return res.status(400).json({
        success: false,
        error: 'Numeric IDs not supported, use provider name'
      });
    }
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }
    
    // Enhance connection with app metadata (only if missing)
    const enhancedConnection = {
      ...connection,
      // Only include these if they aren't already in the connection object
      name: connection.name || getAppNameByProvider(connection.provider),
      iconUrl: connection.iconUrl || getAppIconByProvider(connection.provider),
      backgroundColor: connection.backgroundColor || getAppBackgroundColorByProvider(connection.provider),
      // Maintain backward compatibility with existing code
      app_name: connection.name || getAppNameByProvider(connection.provider),
      app_icon: connection.iconUrl || getAppIconByProvider(connection.provider),
      app_background_color: connection.backgroundColor || getAppBackgroundColorByProvider(connection.provider)
    };
    
    return res.json({
      success: true,
      data: enhancedConnection
    });
  } catch (error) {
    console.error(`Error fetching connection ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch connection'
    });
  }
});

/**
 * Delete an integration connection
 * DELETE /api/integrations/connections/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Get the authenticated user from session
    const userId = req.session?.userId || 1; // Default to user 1 for development
    
    // Get connection ID from params (could be numeric ID or provider string)
    const connId = req.params.id;
    
    // Check if the ID is a provider name or a numeric ID
    let connection;
    let connectionId: number;
    
    if (isNaN(parseInt(connId))) {
      // It's a provider name
      connection = await storage.getIntegrationConnection(userId, connId);
      if (!connection) {
        return res.status(404).json({
          success: false,
          error: 'Connection not found'
        });
      }
      connectionId = connection.id;
    } else {
      // It's a numeric ID
      connectionId = parseInt(connId);
      
      // Verify the connection exists and belongs to the user
      // This step is skipped for now, assuming it's checked in the delete method
    }
    
    // Delete the connection
    const result = await storage.deleteIntegrationConnection(connectionId);
    
    return res.json({
      success: result,
      message: result ? 'Connection deleted successfully' : 'Failed to delete connection'
    });
  } catch (error) {
    console.error(`Error deleting connection ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete connection'
    });
  }
});

/**
 * Test an integration connection
 * POST /api/integrations/connections/:id/test
 */
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    // Get the authenticated user from session
    const userId = req.session?.userId || 1; // Default to user 1 for development
    
    // Get provider from the URL parameter
    const provider = req.params.id;
    
    // Get the connection for this provider
    const connection = await storage.getIntegrationConnection(userId, provider);
    
    if (!connection || !connection.access_token) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found or missing credentials'
      });
    }
    
    // Test the connection based on provider
    let testResult = false;
    let testDetails = null;
    
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
    
    // Update the connection with the test result
    await storage.updateIntegrationConnection(connection.id, {
      lastTested: new Date(),
      lastTestSuccess: testResult
    });
    
    return res.json({
      success: testResult,
      message: testResult ? 'Connection test successful' : 'Connection test failed',
      details: testDetails
    });
  } catch (error) {
    console.error(`Error testing connection ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to test connection'
    });
  }
});

/**
 * Helper function to get all user's connections with app info
 */
async function getAllUserConnections(userId: number) {
  // Get all integration connections for this user
  const providers = ['gohighlevel', 'openai', 'webhook'];
  const connections = [];
  
  for (const provider of providers) {
    const connection = await storage.getIntegrationConnection(userId, provider);
    if (connection) {
      connections.push({
        ...connection,
        // Only include these if they aren't already in the connection object
        name: connection.name || getAppNameByProvider(connection.provider),
        iconUrl: connection.iconUrl || getAppIconByProvider(connection.provider),
        backgroundColor: connection.backgroundColor || getAppBackgroundColorByProvider(connection.provider),
        // Maintain backward compatibility with existing code
        app_name: connection.name || getAppNameByProvider(connection.provider),
        app_icon: connection.iconUrl || getAppIconByProvider(connection.provider),
        app_background_color: connection.backgroundColor || getAppBackgroundColorByProvider(connection.provider)
      });
    }
  }
  
  return connections;
}

/**
 * Helper functions for app metadata
 */
function getAppNameByProvider(provider: string): string {
  const appNames: {[key: string]: string} = {
    'gohighlevel': 'GoHighLevel',
    'openai': 'OpenAI',
    'webhook': 'Custom Webhook',
    'mailchimp': 'Mailchimp',
    'zapier': 'Zapier',
    'slack': 'Slack',
    'twilio': 'Twilio',
    'hubspot': 'HubSpot'
  };
  
  return appNames[provider] || 'Unknown App';
}

function getAppIconByProvider(provider: string): string {
  const appIcons: {[key: string]: string} = {
    'gohighlevel': 'https://assets.gohighlevel.com/images/brand/logos/logo.svg',
    'openai': 'https://cdn.worldvectorlogo.com/logos/openai-2.svg',
    'webhook': 'https://cdn-icons-png.flaticon.com/512/1505/1505569.png',
    'mailchimp': 'https://cdn.worldvectorlogo.com/logos/mailchimp-freddie-icon.svg',
    'zapier': 'https://cdn.worldvectorlogo.com/logos/zapier-1.svg',
    'slack': 'https://cdn.worldvectorlogo.com/logos/slack-new-logo.svg',
    'twilio': 'https://cdn.worldvectorlogo.com/logos/twilio-2.svg',
    'hubspot': 'https://cdn.worldvectorlogo.com/logos/hubspot-2.svg'
  };
  
  return appIcons[provider] || 'https://cdn-icons-png.flaticon.com/512/2885/2885417.png';
}

function getAppBackgroundColorByProvider(provider: string): string {
  const appColors: {[key: string]: string} = {
    'gohighlevel': '#4CAF50',
    'openai': '#10A37F',
    'webhook': '#607D8B',
    'mailchimp': '#FFE01B',
    'zapier': '#FF4A00',
    'slack': '#4A154B',
    'twilio': '#F22F46',
    'hubspot': '#FF7A59'
  };
  
  return appColors[provider] || '#6E6E6E';
}

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
    if (!apiKey || apiKey.trim().length < 10) {
      console.log('GHL connection test failed: Invalid API key format');
      return false;
    }
    
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
    if (axios.isAxiosError(error)) {
      console.log('Response status:', error.response?.status);
      console.log('Response data:', error.response?.data);
    }
    return false;
  }
}

export default router;