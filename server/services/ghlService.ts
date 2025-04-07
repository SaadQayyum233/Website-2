import axios from 'axios';
import { IStorage } from '../storage';
import { InsertContact, Contact, InsertEmailDelivery } from '@shared/schema';

// GHL API base URL
const GHL_API_BASE_URL = 'https://services.msgsndr.com';

/**
 * Service for handling GoHighLevel API integrations
 */
export class GHLService {
  private storage: IStorage;
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }
  
  /**
   * Get the GHL API client for a specific user
   * @param userId The user ID to get API key for
   * @returns Axios instance configured for GHL API
   */
  async getGHLApiClient(userId: number) {
    // Get the user's GHL integration settings
    const ghlConnection = await this.storage.getIntegrationConnection(userId, 'gohighlevel');
    
    if (!ghlConnection?.access_token) {
      throw new Error('No GHL API token found');
    }
    
    // Return configured axios instance
    return axios.create({
      baseURL: GHL_API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${ghlConnection.access_token}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    });
  }
  
  /**
   * Synchronize contacts from GHL to our database
   * @param userId User ID to sync contacts for
   * @param page Page number for pagination
   * @param limit Number of contacts to fetch per page
   * @returns Number of contacts synchronized
   */
  async syncContacts(userId: number, page: number = 1, limit: number = 100): Promise<number> {
    try {
      const api = await this.getGHLApiClient(userId);
      
      // Fetch contacts from GHL
      const response = await api.get('/contacts/api/v1/contacts', {
        params: { page, limit }
      });
      
      const contacts = response.data.contacts || [];
      let syncCount = 0;
      
      // Process each contact
      for (const ghlContact of contacts) {
        try {
          // Map GHL contact to our contact model
          const contactData: InsertContact = {
            name: ghlContact.name || null,
            email: ghlContact.email || '',
            ghl_id: ghlContact.id,
            tags: ghlContact.tags || [],
            custom_fields: ghlContact.customFields || null,
            contact_source: 'ghl',
            joined_date: ghlContact.dateAdded ? new Date(ghlContact.dateAdded) : null
          };
          
          // Skip contacts without email (required field)
          if (!contactData.email) continue;
          
          // Upsert the contact in our database
          await this.storage.upsertContactByGhlId(contactData);
          syncCount++;
        } catch (contactError) {
          console.error(`Error processing contact ${ghlContact.id}:`, contactError);
        }
      }
      
      // Handle pagination if there are more contacts
      if (response.data.meta?.nextPage) {
        // Recursively call to get next page
        const nextPageCount = await this.syncContacts(userId, page + 1, limit);
        syncCount += nextPageCount;
      }
      
      return syncCount;
    } catch (error) {
      console.error('Error syncing GHL contacts:', error);
      throw new Error(`Failed to sync GHL contacts: ${error.message}`);
    }
  }
  
  /**
   * Send an email to a contact via GHL
   * @param userId User ID sending the email
   * @param contact Contact to send to
   * @param subject Email subject
   * @param htmlBody HTML email body
   * @param textBody Plain text email body
   * @param emailId Our internal email ID
   * @param variantId Experiment variant ID if applicable
   * @returns Email delivery record
   */
  async sendEmail(
    userId: number,
    contact: Contact,
    subject: string,
    htmlBody: string,
    textBody: string,
    emailId: number,
    variantId?: number
  ): Promise<InsertEmailDelivery> {
    try {
      const api = await this.getGHLApiClient(userId);
      
      // Prepare email delivery record
      const emailDelivery: InsertEmailDelivery = {
        email_id: emailId,
        contact_id: contact.id,
        status: 'pending',
        variant_id: variantId || null
      };
      
      // Save initial delivery record
      const deliveryRecord = await this.storage.createEmailDelivery(emailDelivery);
      
      // Check if contact has GHL ID
      if (!contact.ghl_id) {
        throw new Error('Contact does not have a GHL ID');
      }
      
      // Send email via GHL
      const response = await api.post('/conversations/api/v1/conversations/messages', {
        contactId: contact.ghl_id,
        type: 'Email',
        subject,
        html: htmlBody,
        text: textBody || undefined
      });
      
      if (response.data && response.data.id) {
        // Update delivery record with GHL message ID and mark as sent
        await this.storage.updateEmailDeliveryStatus(deliveryRecord.id, 'sent');
        await this.storage.updateEmailDeliveryByGhlMessageId(
          response.data.id,
          { ghl_message_id: response.data.id }
        );
        
        return {
          ...emailDelivery,
          status: 'sent',
          ghl_message_id: response.data.id,
          sent_at: new Date()
        };
      } else {
        // Mark as failed if no message ID returned
        await this.storage.updateEmailDeliveryStatus(deliveryRecord.id, 'failed');
        return {
          ...emailDelivery,
          status: 'failed',
          error_message: 'No message ID returned from GHL'
        };
      }
    } catch (error) {
      console.error('Error sending email via GHL:', error);
      
      // Update delivery record as failed
      const errorMessage = error.response?.data?.message || error.message;
      await this.storage.updateEmailDelivery(
        deliveryRecord.id,
        { 
          status: 'failed',
          error_message: errorMessage
        }
      );
      
      throw new Error(`Failed to send email via GHL: ${errorMessage}`);
    }
  }
  
  /**
   * Process a webhook event from GHL
   * @param event GHL webhook event data
   */
  async processWebhookEvent(event: any): Promise<void> {
    try {
      if (!event || !event.type) {
        throw new Error('Invalid webhook event');
      }
      
      // Handle different event types
      switch (event.type) {
        case 'email_delivered':
          await this.processEmailDelivered(event);
          break;
        case 'email_opened':
          await this.processEmailOpened(event);
          break;
        case 'email_clicked':
          await this.processEmailClicked(event);
          break;
        case 'email_bounced':
          await this.processEmailBounced(event);
          break;
        default:
          console.log(`Unhandled GHL webhook event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error processing GHL webhook:', error);
      throw new Error(`Failed to process GHL webhook: ${error.message}`);
    }
  }
  
  /**
   * Process email delivery confirmation
   */
  private async processEmailDelivered(event: any): Promise<void> {
    if (event.messageId) {
      await this.storage.updateEmailDeliveryByGhlMessageId(
        event.messageId,
        { 
          status: 'delivered',
          delivered_at: event.timestamp ? new Date(event.timestamp) : new Date()
        }
      );
    }
  }
  
  /**
   * Process email opened event
   */
  private async processEmailOpened(event: any): Promise<void> {
    if (event.messageId) {
      await this.storage.updateEmailDeliveryByGhlMessageId(
        event.messageId,
        { 
          status: 'opened',
          opened_at: event.timestamp ? new Date(event.timestamp) : new Date()
        }
      );
    }
  }
  
  /**
   * Process email clicked event
   */
  private async processEmailClicked(event: any): Promise<void> {
    if (event.messageId) {
      await this.storage.updateEmailDeliveryByGhlMessageId(
        event.messageId,
        { 
          status: 'clicked',
          clicked_at: event.timestamp ? new Date(event.timestamp) : new Date(),
          clicked_url: event.url || null
        }
      );
    }
  }
  
  /**
   * Process email bounced event
   */
  private async processEmailBounced(event: any): Promise<void> {
    if (event.messageId) {
      await this.storage.updateEmailDeliveryByGhlMessageId(
        event.messageId,
        { 
          status: 'bounced',
          bounced_at: event.timestamp ? new Date(event.timestamp) : new Date(),
          error_message: event.reason || 'Email bounced'
        }
      );
    }
  }
}