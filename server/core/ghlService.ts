import axios from 'axios';
import { ghlConfig } from '../config/ghlConfig';
import { storage } from '../storage';
import { getGHLAccessToken } from '../api/ghlRoutes';
import { Contact, InsertContact } from '@shared/schema';

// Create GHL API client
const createGHLClient = async () => {
  // Get the access token
  const accessToken = await getGHLAccessToken();
  
  // Get user's connection to retrieve locationId
  const userId = 1; // Using user ID 1 for now
  const connection = await storage.getIntegrationConnection(userId, 'ghl');
  
  if (!connection || !connection.config || !connection.config.locationId) {
    throw new Error('GHL connection is missing locationId');
  }
  
  const locationId = connection.config.locationId;
  
  // Create axios instance
  return axios.create({
    baseURL: ghlConfig.apiBaseUrl,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Version': '2021-07-28',
      'Location-Id': locationId
    },
    timeout: ghlConfig.defaultRequestTimeout
  });
};

// Get contacts from GHL
export const fetchGHLContacts = async (page = 1, limit = 100): Promise<{
  contacts: any[];
  hasMore: boolean;
}> => {
  try {
    const client = await createGHLClient();
    
    const response = await client.get('/v1/contacts', {
      params: {
        page,
        limit
      }
    });
    
    const { contacts, meta } = response.data;
    
    return {
      contacts: contacts || [],
      hasMore: meta?.nextPage ? true : false
    };
  } catch (error) {
    await storage.logError(
      'GHL Fetch Contacts',
      error instanceof Error ? error.message : 'Unknown error fetching GHL contacts',
      error instanceof Error ? error.stack : undefined,
      { page, limit }
    );
    
    throw new Error(`Failed to fetch GHL contacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Map GHL contact to our Contact format
export const mapGHLContact = (ghlContact: any): InsertContact => {
  // Extract email - use primary or first email found
  let email = '';
  if (ghlContact.email) {
    email = ghlContact.email;
  } else if (ghlContact.emailAddresses && ghlContact.emailAddresses.length > 0) {
    email = ghlContact.emailAddresses[0].value;
  }
  
  // Extract name
  let name = '';
  if (ghlContact.name) {
    name = ghlContact.name;
  } else {
    const firstName = ghlContact.firstName || '';
    const lastName = ghlContact.lastName || '';
    name = `${firstName} ${lastName}`.trim();
  }
  
  // Map to our format
  return {
    ghl_id: ghlContact.id,
    email: email || `unknown-${ghlContact.id}@placeholder.com`, // Fallback for contacts without email
    name,
    tags: ghlContact.tags || [],
    custom_fields: ghlContact.customFields || {},
    joined_date: ghlContact.dateAdded ? new Date(ghlContact.dateAdded) : new Date(),
    contact_source: 'ghl_sync'
  };
};

// Send email via GHL
export const sendGHLEmail = async (
  contactId: string, 
  subject: string, 
  bodyHtml: string,
  bodyText: string = ''
): Promise<{ messageId: string }> => {
  try {
    const client = await createGHLClient();
    
    const response = await client.post('/v1/conversations/messages', {
      type: 'Email',
      contactId,
      subject,
      body: bodyHtml,
      textBody: bodyText || undefined
    });
    
    if (!response.data || !response.data.id) {
      throw new Error('GHL did not return a message ID');
    }
    
    return { messageId: response.data.id };
  } catch (error) {
    await storage.logError(
      'GHL Send Email',
      error instanceof Error ? error.message : 'Unknown error sending GHL email',
      error instanceof Error ? error.stack : undefined,
      { contactId, subject }
    );
    
    throw new Error(`Failed to send GHL email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Register webhook with GHL
export const registerGHLWebhook = async (webhookUrl: string): Promise<{ id: string }> => {
  try {
    const client = await createGHLClient();
    
    // Check if webhook already exists
    const existingWebhooks = await client.get('/v1/webhooks');
    
    const existing = existingWebhooks.data?.webhooks?.find(
      (hook: any) => hook.targetUrl === webhookUrl
    );
    
    if (existing) {
      return { id: existing.id };
    }
    
    // Register new webhook
    const response = await client.post('/v1/webhooks', {
      name: 'EmailFlow Integration',
      targetUrl: webhookUrl,
      events: ghlConfig.webhookEvents
    });
    
    if (!response.data || !response.data.id) {
      throw new Error('GHL did not return a webhook ID');
    }
    
    return { id: response.data.id };
  } catch (error) {
    await storage.logError(
      'GHL Register Webhook',
      error instanceof Error ? error.message : 'Unknown error registering GHL webhook',
      error instanceof Error ? error.stack : undefined,
      { webhookUrl }
    );
    
    throw new Error(`Failed to register GHL webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
