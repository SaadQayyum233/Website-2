import { storage } from '../storage';
import { sendEmail } from '../core/emailService';
import { EmailDeliveryStatus, EmailType } from '@shared/schema';

/**
 * Process and send active priority emails
 */
export async function processPriorityEmails() {
  console.log('Starting priority email processor...');
  
  try {
    // Get all active priority emails
    const activeEmails = await storage.getActiveEmails();
    const priorityEmails = activeEmails.filter(email => email.type === EmailType.PRIORITY);
    
    if (priorityEmails.length === 0) {
      console.log('No active priority emails to process');
      return { success: true, emailsSent: 0 };
    }
    
    console.log(`Found ${priorityEmails.length} active priority emails to process`);
    
    let totalSent = 0;
    
    // Process each priority email
    for (const email of priorityEmails) {
      // Skip emails without subject or body
      if (!email.subject || !email.body_html) {
        console.log(`Skipping email ${email.id}: Missing subject or body`);
        continue;
      }
      
      // Validate date range
      const now = new Date();
      if (email.start_date && new Date(email.start_date) > now) {
        console.log(`Skipping email ${email.id}: Start date is in the future`);
        continue;
      }
      if (email.end_date && new Date(email.end_date) < now) {
        console.log(`Skipping email ${email.id}: End date is in the past`);
        continue;
      }
      
      console.log(`Processing priority email: ${email.id} - ${email.name}`);
      
      // Get tag information or use standard naming convention
      const priorityTag = `priority_email_${email.id}`;
      
      // Get contacts with the tag
      const contacts = await storage.getContactsByTag(priorityTag);
      
      if (contacts.length === 0) {
        console.log(`No contacts found with tag: ${priorityTag}`);
        continue;
      }
      
      console.log(`Found ${contacts.length} contacts for email ${email.id}`);
      
      // Send email to each contact
      for (const contact of contacts) {
        try {
          // Skip contacts without GHL ID
          if (!contact.ghl_id) {
            console.log(`Skipping contact ${contact.id}: No GHL ID`);
            continue;
          }
          
          // Check if we've already sent this email to this contact
          const existingDeliveries = await storage.getEmailDeliveriesByContactId(contact.id);
          const alreadySent = existingDeliveries.some(
            delivery => delivery.email_id === email.id && 
            (delivery.status !== EmailDeliveryStatus.FAILED && 
             delivery.status !== EmailDeliveryStatus.QUEUED)
          );
          
          if (alreadySent) {
            console.log(`Already sent email ${email.id} to contact ${contact.id}`);
            continue;
          }
          
          // Create delivery record
          const delivery = await storage.createEmailDelivery({
            email_id: email.id,
            contact_id: contact.id,
            status: EmailDeliveryStatus.QUEUED
          });
          
          // Send the email
          const result = await sendEmail(email, contact);
          
          // Update delivery status
          await storage.updateEmailDeliveryStatus(delivery.id, EmailDeliveryStatus.SENT);
          await storage.updateEmailDelivery(delivery.id, {
            ghl_message_id: result.messageId,
            sent_at: new Date()
          });
          
          // Optionally remove tag if successful
          // await storage.removeTagFromContact(contact.id, priorityTag);
          
          totalSent++;
          
          // Add delay to prevent API rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          // Log error but continue with next contact
          await storage.logError(
            'Priority Email Sender',
            error instanceof Error ? error.message : 'Unknown error sending priority email',
            error instanceof Error ? error.stack : undefined,
            { emailId: email.id, contactId: contact.id }
          );
          
          console.error(`Error sending email ${email.id} to contact ${contact.id}:`, error);
        }
      }
    }
    
    console.log(`Priority email processor completed. Sent ${totalSent} emails.`);
    
    return {
      success: true,
      emailsSent: totalSent
    };
  } catch (error) {
    // Log the error
    await storage.logError(
      'Priority Email Processor',
      error instanceof Error ? error.message : 'Unknown error in priority email processor',
      error instanceof Error ? error.stack : undefined
    );
    
    console.error('Error in priority email processor:', error);
    
    throw error;
  }
}
