import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertContactSchema } from '@shared/schema';

const router = express.Router();

// Get all contacts with optional pagination and filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', tag, email } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    
    let contacts;
    
    // Filter by tag if provided
    if (tag) {
      contacts = await storage.getContactsByTag(tag as string);
    } 
    // Filter by email if provided
    else if (email) {
      const contact = await storage.getContactByEmail(email as string);
      contacts = contact ? [contact] : [];
    } 
    // Otherwise get all contacts with pagination
    else {
      contacts = await storage.getAllContacts(pageNum, limitNum);
    }
    
    res.json(contacts);
  } catch (error) {
    await storage.logError(
      'Get Contacts',
      error instanceof Error ? error.message : 'Unknown error retrieving contacts',
      error instanceof Error ? error.stack : undefined,
      { query: req.query }
    );
    
    res.status(500).json({ error: 'Failed to retrieve contacts' });
  }
});

// Get a specific contact
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const contact = await storage.getContact(id);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(contact);
  } catch (error) {
    await storage.logError(
      'Get Contact by ID',
      error instanceof Error ? error.message : 'Unknown error retrieving contact',
      error instanceof Error ? error.stack : undefined,
      { contactId: req.params.id }
    );
    
    res.status(500).json({ error: 'Failed to retrieve contact' });
  }
});

// Create a new contact
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = insertContactSchema.parse(req.body);
    
    // Create contact in database
    const contact = await storage.createContact(validatedData);
    
    res.status(201).json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    
    await storage.logError(
      'Create Contact',
      error instanceof Error ? error.message : 'Unknown error creating contact',
      error instanceof Error ? error.stack : undefined,
      { body: req.body }
    );
    
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Update a contact
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Validate request body
    const validatedData = insertContactSchema.partial().parse(req.body);
    
    // Update contact in database
    const updatedContact = await storage.updateContact(id, validatedData);
    
    if (!updatedContact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(updatedContact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    
    await storage.logError(
      'Update Contact',
      error instanceof Error ? error.message : 'Unknown error updating contact',
      error instanceof Error ? error.stack : undefined,
      { contactId: req.params.id, body: req.body }
    );
    
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete a contact
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.deleteContact(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    await storage.logError(
      'Delete Contact',
      error instanceof Error ? error.message : 'Unknown error deleting contact',
      error instanceof Error ? error.stack : undefined,
      { contactId: req.params.id }
    );
    
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Manage tags for a contact
router.put('/:id/tags', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { action, tag } = req.body;
    
    if (!action || !tag) {
      return res.status(400).json({ 
        error: 'Both action (add or remove) and tag are required' 
      });
    }
    
    let updatedContact;
    
    if (action === 'add') {
      updatedContact = await storage.addTagToContact(id, tag);
    } else if (action === 'remove') {
      updatedContact = await storage.removeTagFromContact(id, tag);
    } else {
      return res.status(400).json({ 
        error: 'Invalid action. Use "add" or "remove".' 
      });
    }
    
    if (!updatedContact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(updatedContact);
  } catch (error) {
    await storage.logError(
      'Manage Contact Tags',
      error instanceof Error ? error.message : 'Unknown error managing contact tags',
      error instanceof Error ? error.stack : undefined,
      { contactId: req.params.id, body: req.body }
    );
    
    res.status(500).json({ error: 'Failed to update contact tags' });
  }
});

// Get email delivery history for a contact
router.get('/:id/deliveries', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if contact exists
    const contact = await storage.getContact(id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Get all email deliveries for this contact
    const deliveries = await storage.getEmailDeliveriesByContactId(id);
    
    res.json(deliveries);
  } catch (error) {
    await storage.logError(
      'Get Contact Email History',
      error instanceof Error ? error.message : 'Unknown error retrieving contact email history',
      error instanceof Error ? error.stack : undefined,
      { contactId: req.params.id }
    );
    
    res.status(500).json({ error: 'Failed to retrieve contact email history' });
  }
});

export default router;
