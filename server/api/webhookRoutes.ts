import express, { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { EmailDeliveryStatus, EmailDeliveryStatusValues, WebhookType, WebhookTypeValues, InsertWebhook } from '@shared/schema';
import { ghlConfig } from '../config/ghlConfig';
import crypto from 'crypto';

const router = express.Router();

// Interface for webhook payload
interface WebhookPayload {
  event: string;
  data: any;
  provider?: string;
  timestamp?: string | number;
  [key: string]: any;
}

// Function to verify a webhook token (used for dynamic incoming webhooks)
function verifyWebhookToken(token: string, userId: number, provider: string): boolean {
  // Create a hash using the same algorithm as when generating the token
  const hmac = crypto.createHmac('sha256', 'webhook-secret-key');
  hmac.update(`${userId}:${provider}`);
  const expectedToken = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedToken),
    Buffer.from(token)
  );
}

// Middleware to verify GHL webhook signature (if webhook secret is configured)
const verifyGHLWebhook = (req: Request, res: Response, next: Function) => {
  if (!ghlConfig.webhookSecret) {
    // Skip verification if no secret is configured
    return next();
  }
  
  const signature = req.headers['x-ghl-signature'];
  
  if (!signature) {
    return res.status(401).json({ error: 'Missing GHL webhook signature' });
  }
  
  // Get the raw body
  const payload = JSON.stringify(req.body);
  
  // Calculate expected signature
  const hmac = crypto.createHmac('sha256', ghlConfig.webhookSecret);
  hmac.update(payload);
  const calculatedSignature = hmac.digest('hex');
  
  // Compare signatures
  if (calculatedSignature !== signature) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  
  next();
};

// Handle GHL webhooks
router.post('/ghl', verifyGHLWebhook, async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;
    
    if (!event || !data) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }
    
    // Handle contact events
    if (event === 'contact.created' || event === 'contact.updated') {
      await handleContactEvent(event, data);
    }
    // Handle contact deletion
    else if (event === 'contact.deleted') {
      await handleContactDeletion(data);
    }
    // Handle email events
    else if (event.startsWith('email.')) {
      await handleEmailEvent(event, data);
    }
    
    // Always respond with success to avoid webhook retries
    res.status(200).json({ success: true });
  } catch (error) {
    await storage.logError(
      'GHL Webhook Handler',
      error instanceof Error ? error.message : 'Unknown error processing GHL webhook',
      error instanceof Error ? error.stack : undefined,
      { body: req.body }
    );
    
    // Always respond with success to avoid webhook retries
    res.status(200).json({ success: true });
  }
});

// Handle contact created/updated webhook
async function handleContactEvent(event: string, data: any): Promise<void> {
  try {
    const ghlId = data.id;
    if (!ghlId) {
      throw new Error('Missing contact ID in webhook payload');
    }
    
    // Extract relevant contact data from the webhook payload
    const contactData = {
      ghl_id: ghlId,
      email: data.email,
      name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      custom_fields: data.customFields || {},
      joined_date: data.createdAt ? new Date(data.createdAt) : undefined,
      contact_source: 'ghl_webhook'
    };
    
    // Upsert contact in database
    await storage.upsertContactByGhlId(contactData);
    
    console.log(`Processed ${event} webhook for contact ${ghlId}`);
  } catch (error) {
    await storage.logError(
      'GHL Contact Webhook Handler',
      error instanceof Error ? error.message : 'Unknown error processing contact webhook',
      error instanceof Error ? error.stack : undefined,
      { event, data }
    );
  }
}

// Handle contact deletion webhook
async function handleContactDeletion(data: any): Promise<void> {
  try {
    const ghlId = data.id;
    if (!ghlId) {
      throw new Error('Missing contact ID in webhook payload');
    }
    
    // Find contact in our database
    const contact = await storage.getContactByGhlId(ghlId);
    
    if (contact) {
      // Delete the contact
      await storage.deleteContact(contact.id);
      console.log(`Deleted contact ${ghlId} due to GHL webhook`);
    }
  } catch (error) {
    await storage.logError(
      'GHL Contact Deletion Handler',
      error instanceof Error ? error.message : 'Unknown error processing contact deletion webhook',
      error instanceof Error ? error.stack : undefined,
      { data }
    );
  }
}

// Handle email event webhook
async function handleEmailEvent(event: string, data: any): Promise<void> {
  try {
    const { messageId, contactId } = data;
    
    if (!messageId) {
      throw new Error('Missing message ID in webhook payload');
    }
    
    // Map GHL event to our status
    let status;
    let timestamp = new Date();
    
    switch (event) {
      case 'email.delivered':
        status = EmailDeliveryStatus.DELIVERED;
        break;
      case 'email.opened':
        status = EmailDeliveryStatus.OPENED;
        break;
      case 'email.clicked':
        status = EmailDeliveryStatus.CLICKED;
        break;
      case 'email.bounced':
        status = EmailDeliveryStatus.BOUNCED;
        break;
      case 'email.complained':
        status = EmailDeliveryStatus.COMPLAINED;
        break;
      default:
        throw new Error(`Unsupported email event: ${event}`);
    }
    
    // Find the email delivery record in our database
    const delivery = await storage.updateEmailDeliveryByGhlMessageId(messageId, {
      status: status as EmailDeliveryStatusValues
    });
    
    // If delivery found and it's a significant event (open/click), update contact tags if needed
    if (delivery && (status === EmailDeliveryStatus.OPENED || status === EmailDeliveryStatus.CLICKED)) {
      // Get the email to check its type
      const email = await storage.getEmail(delivery.email_id);
      
      if (email) {
        // Get the contact
        const contact = await storage.getContact(delivery.contact_id);
        
        if (contact) {
          // Add relevant tags based on interaction and email type
          if (status === EmailDeliveryStatus.OPENED) {
            await storage.addTagToContact(contact.id, 'opened_email');
            
            if (email.type === 'priority') {
              await storage.addTagToContact(contact.id, 'opened_priority_email');
            }
          }
          
          if (status === EmailDeliveryStatus.CLICKED) {
            await storage.addTagToContact(contact.id, 'clicked_email');
            await storage.addTagToContact(contact.id, 'high_intent');
            
            if (email.type === 'priority') {
              await storage.addTagToContact(contact.id, 'clicked_priority_email');
            }
          }
        }
      }
    }
    
    console.log(`Processed ${event} webhook for message ${messageId}`);
  } catch (error) {
    await storage.logError(
      'GHL Email Event Handler',
      error instanceof Error ? error.message : 'Unknown error processing email event webhook',
      error instanceof Error ? error.stack : undefined,
      { event, data }
    );
  }
}

// Generic webhook handler for dynamically created webhook URLs
router.post('/incoming/:provider/:token', async (req: Request, res: Response) => {
  try {
    const { provider, token } = req.params;
    
    // First, find the user associated with this webhook token
    // For simplicity, we'll validate the token for a default user (ID=1)
    // In production, we would look up which user this token is associated with
    const userId = 1; // Default to user 1 for development
    
    // Verify the token is valid
    const isValidToken = verifyWebhookToken(token, userId, provider);
    
    if (!isValidToken) {
      return res.status(401).json({ success: false, error: 'Invalid webhook token' });
    }
    
    // Log the incoming webhook
    console.log(`Received webhook from ${provider} for user ${userId}`);
    
    // Process the webhook based on provider
    let processed = false;
    
    switch (provider) {
      case 'gohighlevel':
        // Process GHL webhook (already handled by the /ghl endpoint)
        const { event, data } = req.body;
        
        if (event && data) {
          // Handle contact events
          if (event === 'contact.created' || event === 'contact.updated') {
            await handleContactEvent(event, data);
            processed = true;
          }
          // Handle contact deletion
          else if (event === 'contact.deleted') {
            await handleContactDeletion(data);
            processed = true;
          }
          // Handle email events
          else if (event.startsWith('email.')) {
            await handleEmailEvent(event, data);
            processed = true;
          }
        }
        break;
        
      case 'openai':
        // For future OpenAI webhooks
        // Not currently used but reserved for future functionality
        processed = true;
        break;
        
      default:
        // Log unknown provider
        await storage.logError(
          'Webhook Handler',
          `Received webhook for unsupported provider: ${provider}`,
          undefined,
          { body: req.body }
        );
    }
    
    if (!processed) {
      await storage.logError(
        `${provider} Webhook Handler`,
        'Failed to process webhook - invalid payload structure',
        undefined,
        { body: req.body }
      );
    }
    
    // Always respond with success to avoid webhook retries
    return res.status(200).json({ success: true });
  } catch (error) {
    // Log the error
    await storage.logError(
      'Dynamic Webhook Handler',
      error instanceof Error ? error.message : 'Unknown error processing webhook',
      error instanceof Error ? error.stack : undefined,
      { params: req.params, body: req.body }
    );
    
    // Always respond with success to avoid webhook retries
    return res.status(200).json({ success: true });
  }
});

// Create a custom webhook
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, name, description, provider = 'custom', user_id = 1 } = req.body;
    
    console.log('Webhook creation request received:', req.body);
    
    if (!type || !name) {
      console.log('Required fields missing:', { type, name });
      return res.status(400).json({ 
        success: false, 
        error: 'Required fields missing' 
      });
    }

    // Generate unique token for incoming webhooks
    let endpoint_token;
    if (type === WebhookType.INCOMING) {
      const hmac = crypto.createHmac('sha256', 'webhook-secret-key');
      hmac.update(`${user_id}:${provider}:${Date.now()}`);
      endpoint_token = hmac.digest('hex');
    }
    
    // Prepare webhook data
    const webhookData: InsertWebhook = {
      user_id,
      type: type as WebhookTypeValues,
      name,
      description,
      provider,
      is_active: true,
      
      // Incoming webhook fields
      endpoint_token,
      secret_key: req.body.secretKey,
      event_handling: req.body.eventHandling || [],
      notification_email: req.body.notificationEmail,
      
      // Outgoing webhook fields
      trigger_event: req.body.trigger_event,
      target_url: req.body.target_url,
      http_method: req.body.http_method,
      headers: req.body.headers || {},
      selected_fields: req.body.selected_fields || [],
      payload_template: req.body.payload_template,
    };
    
    console.log('Attempting to create webhook with data:', webhookData);
    
    // Create the webhook in the database
    const webhook = await storage.createWebhook(webhookData);
    
    console.log('Webhook created successfully:', webhook);
    
    return res.status(201).json({ 
      success: true, 
      webhook
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    
    await storage.logError(
      'Create Webhook',
      error instanceof Error ? error.message : 'Unknown error creating webhook',
      error instanceof Error ? error.stack : undefined,
      { body: req.body }
    );
    
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create webhook' 
    });
  }
});

// Get all webhooks for a user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Default for development
    const webhooks = await storage.getWebhooksByUserId(userId);
    
    return res.status(200).json(webhooks);
  } catch (error) {
    await storage.logError(
      'Get Webhooks',
      error instanceof Error ? error.message : 'Unknown error retrieving webhooks',
      error instanceof Error ? error.stack : undefined
    );
    
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve webhooks' 
    });
  }
});

// Get a single webhook by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const webhook = await storage.getWebhook(parseInt(id));
    
    if (!webhook) {
      return res.status(404).json({ 
        success: false, 
        error: 'Webhook not found' 
      });
    }
    
    return res.status(200).json(webhook);
  } catch (error) {
    await storage.logError(
      'Get Webhook',
      error instanceof Error ? error.message : 'Unknown error retrieving webhook',
      error instanceof Error ? error.stack : undefined,
      { params: req.params }
    );
    
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve webhook' 
    });
  }
});

// Update a webhook
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const webhookId = parseInt(id);
    
    // Get existing webhook to make sure it exists
    const existingWebhook = await storage.getWebhook(webhookId);
    
    if (!existingWebhook) {
      return res.status(404).json({ 
        success: false, 
        error: 'Webhook not found' 
      });
    }
    
    // Prepare update data based on webhook type
    const updateData: Partial<InsertWebhook> = {
      name: req.body.name,
      description: req.body.description,
      is_active: req.body.is_active ?? existingWebhook.is_active,
    };
    
    // Add type-specific fields
    if (existingWebhook.type === WebhookType.INCOMING) {
      updateData.secret_key = req.body.secretKey;
      updateData.event_handling = req.body.eventHandling;
      updateData.notification_email = req.body.notificationEmail;
    } else if (existingWebhook.type === WebhookType.OUTGOING) {
      updateData.trigger_event = req.body.trigger_event;
      updateData.target_url = req.body.target_url;
      updateData.http_method = req.body.http_method;
      updateData.headers = req.body.headers;
      updateData.selected_fields = req.body.selected_fields;
      updateData.payload_template = req.body.payload_template;
    }
    
    // Update the webhook
    const updatedWebhook = await storage.updateWebhook(webhookId, updateData);
    
    return res.status(200).json({ 
      success: true, 
      webhook: updatedWebhook 
    });
  } catch (error) {
    await storage.logError(
      'Update Webhook',
      error instanceof Error ? error.message : 'Unknown error updating webhook',
      error instanceof Error ? error.stack : undefined,
      { params: req.params, body: req.body }
    );
    
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update webhook' 
    });
  }
});

// Delete a webhook
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const webhookId = parseInt(id);
    
    // Delete the webhook
    const success = await storage.deleteWebhook(webhookId);
    
    if (!success) {
      return res.status(404).json({ 
        success: false, 
        error: 'Webhook not found or could not be deleted' 
      });
    }
    
    return res.status(200).json({ 
      success: true,
      message: 'Webhook deleted successfully' 
    });
  } catch (error) {
    await storage.logError(
      'Delete Webhook',
      error instanceof Error ? error.message : 'Unknown error deleting webhook',
      error instanceof Error ? error.stack : undefined,
      { params: req.params }
    );
    
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete webhook' 
    });
  }
});

export default router;
