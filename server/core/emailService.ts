import { storage } from '../storage';
import { sendGHLEmail } from './ghlService';
import { Email, ExperimentVariant, Contact } from '@shared/schema';

// Send email via GHL
export async function sendEmail(
  email: Email,
  contact: Contact,
  variant?: ExperimentVariant | null
): Promise<{ messageId: string }> {
  try {
    // Check if contact has GHL ID
    if (!contact.ghl_id) {
      throw new Error(`Contact ${contact.id} does not have a GHL ID`);
    }
    
    // Determine which email content to use (variant or original)
    const subject = variant ? variant.subject : email.subject;
    const bodyHtml = variant ? variant.body_html : email.body_html;
    const bodyText = variant ? variant.body_text : email.body_text;
    
    if (!subject || !bodyHtml) {
      throw new Error('Email is missing required content (subject or body)');
    }
    
    // Send the email via GHL
    const result = await sendGHLEmail(
      contact.ghl_id,
      subject,
      bodyHtml,
      bodyText || undefined
    );
    
    return result;
  } catch (error) {
    // Log the error
    await storage.logError(
      'Send Email',
      error instanceof Error ? error.message : 'Unknown error sending email',
      error instanceof Error ? error.stack : undefined,
      { emailId: email.id, contactId: contact.id, variantId: variant?.id }
    );
    
    // Re-throw the error
    throw error;
  }
}

// Format email template with contact data
export function formatEmailTemplate(
  template: string,
  contact: Contact
): string {
  if (!template) return '';
  
  // Replace common placeholders
  let formatted = template
    .replace(/\{\{name\}\}/g, contact.name || 'there')
    .replace(/\{\{email\}\}/g, contact.email);
  
  // Replace custom field placeholders
  if (contact.custom_fields) {
    for (const [key, value] of Object.entries(contact.custom_fields)) {
      formatted = formatted.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        String(value)
      );
    }
  }
  
  return formatted;
}

// Prepare plain text version from HTML
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  
  // Simple conversion logic
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
