import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertUserSettingsSchema } from '@shared/schema';

const router = express.Router();

// Get user settings
router.get('/', async (req: Request, res: Response) => {
  try {
    // Using user ID 1 for now (will be updated in multi-user implementation)
    const userId = 1;
    
    const settings = await storage.getUserSettings(userId);
    
    // If no settings exist yet, return empty settings object
    if (!settings) {
      return res.json({
        user_id: userId,
        avatar_name: '',
        avatar_bio: '',
        avatar_company_name: '',
        avatar_inspiration_name: '',
        avatar_role: '',
        avatar_website: '',
        email_signature_html: '',
        icp_fears: '',
        icp_pain_points: '',
        icp_insecurities: '',
        icp_transformations: '',
        icp_description: '',
        icp_key_objectives: ''
      });
    }
    
    res.json(settings);
  } catch (error) {
    await storage.logError(
      'Get User Settings',
      error instanceof Error ? error.message : 'Unknown error retrieving user settings',
      error instanceof Error ? error.stack : undefined
    );
    
    res.status(500).json({ error: 'Failed to retrieve user settings' });
  }
});

// Update user settings
router.put('/', async (req: Request, res: Response) => {
  try {
    // Using user ID 1 for now
    const userId = 1;
    
    // Validate request body
    const validatedData = insertUserSettingsSchema.partial().parse(req.body);
    
    // Check if settings already exist
    const existingSettings = await storage.getUserSettings(userId);
    
    let updatedSettings;
    
    if (existingSettings) {
      // Update existing settings
      updatedSettings = await storage.updateUserSettings(userId, validatedData);
    } else {
      // Create new settings
      updatedSettings = await storage.createUserSettings({
        user_id: userId,
        ...validatedData
      });
    }
    
    res.json(updatedSettings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    
    await storage.logError(
      'Update User Settings',
      error instanceof Error ? error.message : 'Unknown error updating user settings',
      error instanceof Error ? error.stack : undefined,
      { body: req.body }
    );
    
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

// Get available integrations
router.get('/integrations/available-apps', async (_req: Request, res: Response) => {
  try {
    // This would normally fetch from a database, but we'll hardcode for now
    const availableApps = [
      {
        id: 'ghl',
        name: 'GoHighLevel',
        iconUrl: 'https://assets.gohighlevel.com/images/brand/logos/logo.svg',
        backgroundColor: '#4CAF50',
        type: 'oauth',
        description: 'Connect your GoHighLevel account to sync contacts and send emails.',
        category: 'CRM',
        badges: ['Core', 'Required'],
        configurationFields: []
      },
      {
        id: 'openai',
        name: 'OpenAI (ChatGPT)',
        iconUrl: 'https://cdn.worldvectorlogo.com/logos/openai-2.svg',
        backgroundColor: '#10A37F',
        type: 'apikey',
        description: 'Power AI-driven email experimentation with GPT-4o.',
        category: 'AI',
        badges: ['Verified'],
        configurationFields: [
          { name: 'api_key', label: 'API Key', type: 'password', required: true }
        ]
      },
      {
        id: 'webhook',
        name: 'Custom Webhook',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/5261/5261933.png',
        backgroundColor: '#6C63FF',
        type: 'webhook',
        description: 'Set up custom webhooks to integrate with other systems.',
        category: 'Integration',
        badges: [],
        configurationFields: [
          { name: 'webhook_url', label: 'Your Webhook URL', type: 'displayOnly', displayValue: 'https://example.com/webhook/{{USER_TOKEN}}' }
        ]
      }
    ];
    
    res.json(availableApps);
  } catch (error) {
    await storage.logError(
      'Get Available Integrations',
      error instanceof Error ? error.message : 'Unknown error retrieving available integrations',
      error instanceof Error ? error.stack : undefined
    );
    
    res.status(500).json({ error: 'Failed to retrieve available integrations' });
  }
});

// Get user's connected integrations
router.get('/integrations/connections', async (_req: Request, res: Response) => {
  try {
    // Using user ID 1 for now
    const userId = 1;
    
    // This would normally fetch all connections for the user
    // For now, let's just check GHL and OpenAI connections
    const ghlConnection = await storage.getIntegrationConnection(userId, 'ghl');
    const openaiConnection = await storage.getIntegrationConnection(userId, 'openai');
    
    const connections = [];
    
    if (ghlConnection && ghlConnection.is_active) {
      connections.push({
        id: ghlConnection.id,
        provider: 'ghl',
        connected: true,
        connectedAt: ghlConnection.created_at
      });
    }
    
    if (openaiConnection && openaiConnection.is_active) {
      connections.push({
        id: openaiConnection.id,
        provider: 'openai',
        connected: true,
        connectedAt: openaiConnection.created_at
      });
    }
    
    res.json(connections);
  } catch (error) {
    await storage.logError(
      'Get Integration Connections',
      error instanceof Error ? error.message : 'Unknown error retrieving integration connections',
      error instanceof Error ? error.stack : undefined
    );
    
    res.status(500).json({ error: 'Failed to retrieve integration connections' });
  }
});

// Create or update integration connection
router.post('/integrations/connections', async (req: Request, res: Response) => {
  try {
    const { provider, ...config } = req.body;
    
    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }
    
    // Using user ID 1 for now
    const userId = 1;
    
    // Check if connection already exists
    const existingConnection = await storage.getIntegrationConnection(userId, provider);
    
    let connectionData;
    
    // Handle different types of connections
    switch (provider) {
      case 'openai':
        // API key connection
        if (!config.api_key) {
          return res.status(400).json({ error: 'API key is required' });
        }
        
        connectionData = {
          user_id: userId,
          provider,
          is_active: true,
          access_token: config.api_key,
          config: { ...config }
        };
        break;
        
      case 'webhook':
        // Webhook connection
        connectionData = {
          user_id: userId,
          provider,
          is_active: true,
          config: { ...config }
        };
        break;
        
      default:
        // OAuth connections like GHL should be handled via the OAuth flow, not directly
        if (provider === 'ghl') {
          return res.status(400).json({ 
            error: 'GHL connections must be created through the OAuth flow' 
          });
        }
        
        return res.status(400).json({ error: 'Unsupported provider' });
    }
    
    let connection;
    
    if (existingConnection) {
      // Update existing connection
      connection = await storage.updateIntegrationConnection(existingConnection.id, connectionData);
    } else {
      // Create new connection
      connection = await storage.createIntegrationConnection(connectionData);
    }
    
    // Don't return sensitive data like access tokens
    const { access_token, refresh_token, ...safeConnection } = connection;
    
    res.json({
      ...safeConnection,
      connected: true
    });
  } catch (error) {
    await storage.logError(
      'Create/Update Integration Connection',
      error instanceof Error ? error.message : 'Unknown error updating integration connection',
      error instanceof Error ? error.stack : undefined,
      { body: req.body }
    );
    
    res.status(500).json({ error: 'Failed to create/update integration connection' });
  }
});

// Delete/disconnect integration
router.delete('/integrations/connections/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    
    // Using user ID 1 for now
    const userId = 1;
    
    const connection = await storage.getIntegrationConnection(userId, provider);
    
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // Instead of deleting, mark as inactive
    await storage.updateIntegrationConnection(connection.id, {
      is_active: false
    });
    
    res.status(204).end();
  } catch (error) {
    await storage.logError(
      'Delete Integration Connection',
      error instanceof Error ? error.message : 'Unknown error deleting integration connection',
      error instanceof Error ? error.stack : undefined,
      { provider: req.params.provider }
    );
    
    res.status(500).json({ error: 'Failed to delete integration connection' });
  }
});

export default router;
