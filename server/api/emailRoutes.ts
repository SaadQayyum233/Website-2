import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { 
  insertEmailSchema, 
  insertExperimentVariantSchema, 
  EmailType, 
  EmailDeliveryStatus 
} from '@shared/schema';
import { generateEmailVariants } from '../core/aiService';
import { sendEmail } from '../core/emailService';

const router = express.Router();

// Get all emails
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, page = '1', limit = '50', isActive } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    
    let emails;
    
    if (type) {
      // Filter by type
      emails = await storage.getEmailsByType(type as string);
    } else if (isActive === 'true') {
      // Get only active emails
      emails = await storage.getActiveEmails();
    } else {
      // Get all emails with pagination
      emails = await storage.getAllEmails(pageNum, limitNum);
    }
    
    res.json(emails);
  } catch (error) {
    await storage.logError(
      'Get Emails',
      error instanceof Error ? error.message : 'Unknown error retrieving emails',
      error instanceof Error ? error.stack : undefined,
      { query: req.query }
    );
    
    res.status(500).json({ error: 'Failed to retrieve emails' });
  }
});

// Get a specific email
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const email = await storage.getEmail(id);
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // If it's an experiment email, also get its variants
    if (email.type === EmailType.EXPERIMENT) {
      const variants = await storage.getVariantsByEmailId(id);
      return res.json({ ...email, variants });
    }
    
    res.json(email);
  } catch (error) {
    await storage.logError(
      'Get Email by ID',
      error instanceof Error ? error.message : 'Unknown error retrieving email',
      error instanceof Error ? error.stack : undefined,
      { emailId: req.params.id }
    );
    
    res.status(500).json({ error: 'Failed to retrieve email' });
  }
});

// Create a new email
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = insertEmailSchema.parse(req.body);
    
    // Create email in database
    const email = await storage.createEmail(validatedData);
    
    res.status(201).json(email);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    
    await storage.logError(
      'Create Email',
      error instanceof Error ? error.message : 'Unknown error creating email',
      error instanceof Error ? error.stack : undefined,
      { body: req.body }
    );
    
    res.status(500).json({ error: 'Failed to create email' });
  }
});

// Update an email
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Validate request body
    const validatedData = insertEmailSchema.partial().parse(req.body);
    
    // Update email in database
    const updatedEmail = await storage.updateEmail(id, validatedData);
    
    if (!updatedEmail) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    res.json(updatedEmail);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    
    await storage.logError(
      'Update Email',
      error instanceof Error ? error.message : 'Unknown error updating email',
      error instanceof Error ? error.stack : undefined,
      { emailId: req.params.id, body: req.body }
    );
    
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// Delete an email
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.deleteEmail(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    await storage.logError(
      'Delete Email',
      error instanceof Error ? error.message : 'Unknown error deleting email',
      error instanceof Error ? error.stack : undefined,
      { emailId: req.params.id }
    );
    
    res.status(500).json({ error: 'Failed to delete email' });
  }
});

// Generate AI variants for an experiment email
router.post('/:id/generate-variants', async (req: Request, res: Response) => {
  try {
    const emailId = parseInt(req.params.id);
    const { count = 3 } = req.body;
    
    // Get the base email
    const baseEmail = await storage.getEmail(emailId);
    if (!baseEmail) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Only allow for experiment emails
    if (baseEmail.type !== EmailType.EXPERIMENT) {
      return res.status(400).json({ error: 'Variants can only be generated for experiment emails' });
    }
    
    // Get user settings for AI personalization
    const userId = baseEmail.user_id || 1; // Default to user 1 if not set
    const userSettings = await storage.getUserSettings(userId);
    
    if (!userSettings) {
      return res.status(400).json({ 
        error: 'User settings not found. Please complete your Avatar and ICP settings first.' 
      });
    }
    
    // Generate variants using AI
    const variants = await generateEmailVariants(baseEmail, userSettings, count);
    
    // Store the generated variants in database
    const savedVariants = [];
    for (const variant of variants) {
      const savedVariant = await storage.createExperimentVariant({
        email_id: emailId,
        variant_letter: variant.variantLetter,
        subject: variant.subject,
        body_html: variant.bodyHtml,
        body_text: variant.bodyText,
        key_angle: variant.keyAngle,
        ai_parameters: variant.aiParameters
      });
      
      savedVariants.push(savedVariant);
    }
    
    res.json(savedVariants);
  } catch (error) {
    await storage.logError(
      'Generate Email Variants',
      error instanceof Error ? error.message : 'Unknown error generating email variants',
      error instanceof Error ? error.stack : undefined,
      { emailId: req.params.id, body: req.body }
    );
    
    res.status(500).json({ error: 'Failed to generate email variants' });
  }
});

// Send an email to contacts with a specific tag
router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const emailId = parseInt(req.params.id);
    const { tag, variantId } = req.body;
    
    if (!tag) {
      return res.status(400).json({ error: 'Tag parameter is required' });
    }
    
    // Get the email
    const email = await storage.getEmail(emailId);
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Get experiment variant if specified
    let variant = null;
    if (variantId) {
      variant = await storage.getExperimentVariant(parseInt(variantId));
      if (!variant || variant.email_id !== emailId) {
        return res.status(404).json({ error: 'Variant not found or does not belong to this email' });
      }
    }
    
    // Get contacts with the specified tag
    const contacts = await storage.getContactsByTag(tag);
    
    if (contacts.length === 0) {
      return res.status(400).json({ 
        error: 'No contacts found with the specified tag',
        tag
      });
    }
    
    // Send emails and track deliveries
    const sendPromises = contacts.map(async (contact) => {
      try {
        // Create delivery record
        const delivery = await storage.createEmailDelivery({
          email_id: emailId,
          variant_id: variant ? variant.id : null,
          contact_id: contact.id,
          status: EmailDeliveryStatus.QUEUED
        });
        
        // Send email via GHL
        const result = await sendEmail(email, contact, variant);
        
        // Update delivery with GHL message ID and status
        await storage.updateEmailDeliveryStatus(delivery.id, EmailDeliveryStatus.SENT);
        await storage.updateEmailDelivery(delivery.id, {
          ghl_message_id: result.messageId,
          sent_at: new Date()
        });
        
        return { contact: contact.email, status: 'sent', messageId: result.messageId };
      } catch (error) {
        // Log error and update delivery status
        await storage.logError(
          'Send Email',
          error instanceof Error ? error.message : 'Unknown error sending email',
          error instanceof Error ? error.stack : undefined,
          { emailId, contactId: contact.id, variantId: variant?.id }
        );
        
        return { contact: contact.email, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
    
    const results = await Promise.all(sendPromises);
    
    // Count successes and failures
    const successful = results.filter(r => r.status === 'sent').length;
    const failed = results.length - successful;
    
    res.json({
      message: `Sent ${successful} emails, ${failed} failed`,
      details: results
    });
  } catch (error) {
    await storage.logError(
      'Send Email Batch',
      error instanceof Error ? error.message : 'Unknown error sending email batch',
      error instanceof Error ? error.stack : undefined,
      { emailId: req.params.id, body: req.body }
    );
    
    res.status(500).json({ error: 'Failed to process email sending request' });
  }
});

export default router;
