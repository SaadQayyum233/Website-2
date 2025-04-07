import {
  users,
  contacts,
  emails,
  experimentVariants,
  emailDeliveries,
  userSettings,
  errorLogs,
  integrationConnections,
  webhooks,
  type User,
  type InsertUser,
  type Contact,
  type InsertContact,
  type Email,
  type InsertEmail,
  type ExperimentVariant,
  type InsertExperimentVariant,
  type EmailDelivery,
  type InsertEmailDelivery,
  type UserSettings,
  type InsertUserSettings,
  type IntegrationConnection,
  type InsertIntegrationConnection,
  type Webhook,
  type InsertWebhook,
  EmailType,
  type EmailTypeValues,
  EmailDeliveryStatus,
  type EmailDeliveryStatusValues,
  WebhookType,
  type WebhookTypeValues
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Contact operations
  getContact(id: number): Promise<Contact | undefined>;
  getContactByEmail(email: string): Promise<Contact | undefined>;
  getContactByGhlId(ghlId: string): Promise<Contact | undefined>;
  getContactsByTag(tag: string): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact | undefined>;
  upsertContactByGhlId(contact: InsertContact): Promise<Contact>;
  deleteContact(id: number): Promise<boolean>;
  getAllContacts(page?: number, limit?: number): Promise<Contact[]>;
  addTagToContact(contactId: number, tag: string): Promise<Contact | undefined>;
  removeTagFromContact(contactId: number, tag: string): Promise<Contact | undefined>;

  // Email operations
  getEmail(id: number): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmail(id: number, email: Partial<InsertEmail>): Promise<Email | undefined>;
  deleteEmail(id: number): Promise<boolean>;
  getActiveEmails(): Promise<Email[]>;
  getEmailsByType(type: string): Promise<Email[]>;
  getAllEmails(page?: number, limit?: number): Promise<Email[]>;

  // Experiment variant operations
  getExperimentVariant(id: number): Promise<ExperimentVariant | undefined>;
  getVariantsByEmailId(emailId: number): Promise<ExperimentVariant[]>;
  createExperimentVariant(variant: InsertExperimentVariant): Promise<ExperimentVariant>;
  updateExperimentVariant(id: number, variant: Partial<InsertExperimentVariant>): Promise<ExperimentVariant | undefined>;
  deleteExperimentVariant(id: number): Promise<boolean>;

  // Email delivery operations
  getEmailDelivery(id: number): Promise<EmailDelivery | undefined>;
  getEmailDeliveriesByContactId(contactId: number): Promise<EmailDelivery[]>;
  getEmailDeliveriesByEmailId(emailId: number): Promise<EmailDelivery[]>;
  createEmailDelivery(delivery: InsertEmailDelivery): Promise<EmailDelivery>;
  updateEmailDeliveryStatus(id: number, status: string, timestamp?: Date): Promise<EmailDelivery | undefined>;
  updateEmailDeliveryByGhlMessageId(ghlMessageId: string, updates: Partial<InsertEmailDelivery>): Promise<EmailDelivery | undefined>;

  // User settings operations
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined>;

  // Integration connection operations
  getIntegrationConnection(userId: number, provider: string): Promise<IntegrationConnection | undefined>;
  createIntegrationConnection(connection: InsertIntegrationConnection): Promise<IntegrationConnection>;
  updateIntegrationConnection(id: number, connection: Partial<InsertIntegrationConnection>): Promise<IntegrationConnection | undefined>;
  deleteIntegrationConnection(id: number): Promise<boolean>;
  
  // Webhook operations
  getWebhook(id: number): Promise<Webhook | undefined>;
  getWebhooksByUserId(userId: number): Promise<Webhook[]>;
  getWebhooksByType(userId: number, type: WebhookTypeValues): Promise<Webhook[]>;
  createWebhook(webhook: InsertWebhook): Promise<Webhook>;
  updateWebhook(id: number, webhook: Partial<InsertWebhook>): Promise<Webhook | undefined>;
  deleteWebhook(id: number): Promise<boolean>;

  // Error logging
  logError(context: string, errorMessage: string, stackTrace?: string, payload?: any): Promise<void>;
}

// Memory storage implementation (for development)
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contacts: Map<number, Contact>;
  private emails: Map<number, Email>;
  private experimentVariants: Map<number, ExperimentVariant>;
  private emailDeliveries: Map<number, EmailDelivery>;
  private userSettingsMap: Map<number, UserSettings>;
  private integrationConnections: Map<number, IntegrationConnection>;
  private webhooks: Map<number, Webhook>;
  private errorLogs: any[];
  
  currentUserId: number;
  currentContactId: number;
  currentEmailId: number;
  currentVariantId: number;
  currentDeliveryId: number;
  currentSettingsId: number;
  currentIntegrationId: number;
  currentWebhookId: number;
  currentErrorLogId: number;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.emails = new Map();
    this.experimentVariants = new Map();
    this.emailDeliveries = new Map();
    this.userSettingsMap = new Map();
    this.integrationConnections = new Map();
    this.webhooks = new Map();
    this.errorLogs = [];
    
    this.currentUserId = 1;
    this.currentContactId = 1;
    this.currentEmailId = 1;
    this.currentVariantId = 1;
    this.currentDeliveryId = 1;
    this.currentSettingsId = 1;
    this.currentIntegrationId = 1;
    this.currentWebhookId = 1;
    this.currentErrorLogId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Contact methods
  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async getContactByEmail(email: string): Promise<Contact | undefined> {
    return Array.from(this.contacts.values()).find(
      (contact) => contact.email === email,
    );
  }

  async getContactByGhlId(ghlId: string): Promise<Contact | undefined> {
    return Array.from(this.contacts.values()).find(
      (contact) => contact.ghl_id === ghlId,
    );
  }

  async getContactsByTag(tag: string): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(
      (contact) => contact.tags && (contact.tags as string[]).includes(tag),
    );
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const id = this.currentContactId++;
    const now = new Date();
    const newContact: Contact = { 
      ...contact, 
      id, 
      created_at: now, 
      updated_at: now 
    };
    this.contacts.set(id, newContact);
    return newContact;
  }

  async updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact | undefined> {
    const existingContact = this.contacts.get(id);
    if (!existingContact) return undefined;
    
    const updatedContact: Contact = { 
      ...existingContact, 
      ...contact, 
      updated_at: new Date() 
    };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  async upsertContactByGhlId(contact: InsertContact): Promise<Contact> {
    if (!contact.ghl_id) {
      return this.createContact(contact);
    }
    
    const existingContact = await this.getContactByGhlId(contact.ghl_id);
    if (existingContact) {
      const updated = await this.updateContact(existingContact.id, contact);
      return updated!;
    }
    
    return this.createContact(contact);
  }

  async deleteContact(id: number): Promise<boolean> {
    return this.contacts.delete(id);
  }

  async getAllContacts(page = 1, limit = 50): Promise<Contact[]> {
    const start = (page - 1) * limit;
    const end = start + limit;
    return Array.from(this.contacts.values()).slice(start, end);
  }

  async addTagToContact(contactId: number, tag: string): Promise<Contact | undefined> {
    const contact = this.contacts.get(contactId);
    if (!contact) return undefined;
    
    const tags = (contact.tags || []) as string[];
    if (!tags.includes(tag)) {
      const updatedTags = [...tags, tag];
      return this.updateContact(contactId, { tags: updatedTags });
    }
    
    return contact;
  }

  async removeTagFromContact(contactId: number, tag: string): Promise<Contact | undefined> {
    const contact = this.contacts.get(contactId);
    if (!contact) return undefined;
    
    const tags = (contact.tags || []) as string[];
    const updatedTags = tags.filter(t => t !== tag);
    return this.updateContact(contactId, { tags: updatedTags });
  }

  // Email methods
  async getEmail(id: number): Promise<Email | undefined> {
    return this.emails.get(id);
  }

  async createEmail(email: InsertEmail): Promise<Email> {
    const id = this.currentEmailId++;
    const now = new Date();
    
    // Handle versioning if it's a priority email
    let version = 1;
    if (email.type === EmailType.PRIORITY) {
      const existingEmails = Array.from(this.emails.values()).filter(
        e => e.name === email.name && e.type === EmailType.PRIORITY
      );
      if (existingEmails.length > 0) {
        version = Math.max(...existingEmails.map(e => e.version || 1)) + 1;
      }
    }
    
    const newEmail: Email = { 
      ...email, 
      id, 
      version,
      created_at: now, 
      updated_at: now 
    };
    this.emails.set(id, newEmail);
    return newEmail;
  }

  async updateEmail(id: number, email: Partial<InsertEmail>): Promise<Email | undefined> {
    const existingEmail = this.emails.get(id);
    if (!existingEmail) return undefined;
    
    const updatedEmail: Email = { 
      ...existingEmail, 
      ...email, 
      updated_at: new Date() 
    };
    this.emails.set(id, updatedEmail);
    return updatedEmail;
  }

  async deleteEmail(id: number): Promise<boolean> {
    return this.emails.delete(id);
  }

  async getActiveEmails(): Promise<Email[]> {
    const now = new Date();
    return Array.from(this.emails.values()).filter(email => {
      if (!email.is_active) return false;
      
      // Check date range if it's a priority email
      if (email.type === EmailType.PRIORITY) {
        if (email.start_date && new Date(email.start_date) > now) return false;
        if (email.end_date && new Date(email.end_date) < now) return false;
      }
      
      return true;
    });
  }

  async getEmailsByType(type: string): Promise<Email[]> {
    return Array.from(this.emails.values()).filter(
      (email) => email.type === type,
    );
  }

  async getAllEmails(page = 1, limit = 50): Promise<Email[]> {
    const start = (page - 1) * limit;
    const end = start + limit;
    return Array.from(this.emails.values()).slice(start, end);
  }

  // Experiment variant methods
  async getExperimentVariant(id: number): Promise<ExperimentVariant | undefined> {
    return this.experimentVariants.get(id);
  }

  async getVariantsByEmailId(emailId: number): Promise<ExperimentVariant[]> {
    return Array.from(this.experimentVariants.values()).filter(
      (variant) => variant.email_id === emailId,
    );
  }

  async createExperimentVariant(variant: InsertExperimentVariant): Promise<ExperimentVariant> {
    const id = this.currentVariantId++;
    const newVariant: ExperimentVariant = { 
      ...variant, 
      id, 
      created_at: new Date() 
    };
    this.experimentVariants.set(id, newVariant);
    return newVariant;
  }

  async updateExperimentVariant(id: number, variant: Partial<InsertExperimentVariant>): Promise<ExperimentVariant | undefined> {
    const existingVariant = this.experimentVariants.get(id);
    if (!existingVariant) return undefined;
    
    const updatedVariant: ExperimentVariant = { 
      ...existingVariant, 
      ...variant 
    };
    this.experimentVariants.set(id, updatedVariant);
    return updatedVariant;
  }

  async deleteExperimentVariant(id: number): Promise<boolean> {
    return this.experimentVariants.delete(id);
  }

  // Email delivery methods
  async getEmailDelivery(id: number): Promise<EmailDelivery | undefined> {
    return this.emailDeliveries.get(id);
  }

  async getEmailDeliveriesByContactId(contactId: number): Promise<EmailDelivery[]> {
    return Array.from(this.emailDeliveries.values()).filter(
      (delivery) => delivery.contact_id === contactId,
    );
  }

  async getEmailDeliveriesByEmailId(emailId: number): Promise<EmailDelivery[]> {
    return Array.from(this.emailDeliveries.values()).filter(
      (delivery) => delivery.email_id === emailId,
    );
  }

  async createEmailDelivery(delivery: InsertEmailDelivery): Promise<EmailDelivery> {
    const id = this.currentDeliveryId++;
    const now = new Date();
    const newDelivery: EmailDelivery = { 
      ...delivery, 
      id, 
      created_at: now, 
      updated_at: now 
    };
    this.emailDeliveries.set(id, newDelivery);
    return newDelivery;
  }

  async updateEmailDeliveryStatus(id: number, status: string, timestamp: Date = new Date()): Promise<EmailDelivery | undefined> {
    const delivery = this.emailDeliveries.get(id);
    if (!delivery) return undefined;
    
    const updates: Partial<EmailDelivery> = { 
      status: status as EmailDeliveryStatusValues,
      updated_at: new Date()
    };
    
    // Set the appropriate timestamp based on status
    switch (status) {
      case EmailDeliveryStatus.SENT:
        updates.sent_at = timestamp;
        break;
      case EmailDeliveryStatus.DELIVERED:
        updates.delivered_at = timestamp;
        break;
      case EmailDeliveryStatus.OPENED:
        updates.opened_at = timestamp;
        break;
      case EmailDeliveryStatus.CLICKED:
        updates.clicked_at = timestamp;
        break;
      case EmailDeliveryStatus.BOUNCED:
        updates.bounced_at = timestamp;
        break;
      case EmailDeliveryStatus.COMPLAINED:
        updates.complained_at = timestamp;
        break;
      case EmailDeliveryStatus.UNSUBSCRIBED:
        updates.unsubscribed_at = timestamp;
        break;
    }
    
    const updatedDelivery: EmailDelivery = { 
      ...delivery, 
      ...updates 
    };
    this.emailDeliveries.set(id, updatedDelivery);
    return updatedDelivery;
  }

  async updateEmailDeliveryByGhlMessageId(ghlMessageId: string, updates: Partial<InsertEmailDelivery>): Promise<EmailDelivery | undefined> {
    const delivery = Array.from(this.emailDeliveries.values()).find(
      d => d.ghl_message_id === ghlMessageId
    );
    
    if (!delivery) return undefined;
    
    const updatedDelivery: EmailDelivery = { 
      ...delivery, 
      ...updates,
      updated_at: new Date() 
    };
    this.emailDeliveries.set(delivery.id, updatedDelivery);
    return updatedDelivery;
  }

  // User settings methods
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    return Array.from(this.userSettingsMap.values()).find(
      (settings) => settings.user_id === userId,
    );
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const id = this.currentSettingsId++;
    const now = new Date();
    const newSettings: UserSettings = { 
      ...settings, 
      id, 
      created_at: now, 
      updated_at: now 
    };
    this.userSettingsMap.set(id, newSettings);
    return newSettings;
  }

  async updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined> {
    const existingSettings = await this.getUserSettings(userId);
    if (!existingSettings) return undefined;
    
    const updatedSettings: UserSettings = { 
      ...existingSettings, 
      ...settings, 
      updated_at: new Date() 
    };
    this.userSettingsMap.set(existingSettings.id, updatedSettings);
    return updatedSettings;
  }

  // Integration connection methods
  async getIntegrationConnection(userId: number, provider: string): Promise<IntegrationConnection | undefined> {
    return Array.from(this.integrationConnections.values()).find(
      (conn) => conn.user_id === userId && conn.provider === provider,
    );
  }

  async createIntegrationConnection(connection: InsertIntegrationConnection): Promise<IntegrationConnection> {
    const id = this.currentIntegrationId++;
    const now = new Date();
    const newConnection: IntegrationConnection = { 
      ...connection, 
      id, 
      created_at: now, 
      updated_at: now 
    };
    this.integrationConnections.set(id, newConnection);
    return newConnection;
  }

  async updateIntegrationConnection(id: number, connection: Partial<InsertIntegrationConnection>): Promise<IntegrationConnection | undefined> {
    const existingConnection = this.integrationConnections.get(id);
    if (!existingConnection) return undefined;
    
    const updatedConnection: IntegrationConnection = { 
      ...existingConnection, 
      ...connection, 
      updated_at: new Date() 
    };
    this.integrationConnections.set(id, updatedConnection);
    return updatedConnection;
  }

  async deleteIntegrationConnection(id: number): Promise<boolean> {
    return this.integrationConnections.delete(id);
  }

  // Webhook methods
  async getWebhook(id: number): Promise<Webhook | undefined> {
    return this.webhooks.get(id);
  }

  async getWebhooksByUserId(userId: number): Promise<Webhook[]> {
    return Array.from(this.webhooks.values()).filter(
      (webhook) => webhook.user_id === userId
    );
  }

  async getWebhooksByType(userId: number, type: WebhookTypeValues): Promise<Webhook[]> {
    return Array.from(this.webhooks.values()).filter(
      (webhook) => webhook.user_id === userId && webhook.type === type
    );
  }

  async createWebhook(webhook: InsertWebhook): Promise<Webhook> {
    const id = this.currentWebhookId++;
    const now = new Date();
    const newWebhook: Webhook = { 
      ...webhook, 
      id, 
      created_at: now, 
      updated_at: now 
    };
    this.webhooks.set(id, newWebhook);
    return newWebhook;
  }

  async updateWebhook(id: number, webhook: Partial<InsertWebhook>): Promise<Webhook | undefined> {
    const existingWebhook = this.webhooks.get(id);
    if (!existingWebhook) return undefined;
    
    const updatedWebhook: Webhook = { 
      ...existingWebhook, 
      ...webhook, 
      updated_at: new Date() 
    };
    this.webhooks.set(id, updatedWebhook);
    return updatedWebhook;
  }

  async deleteWebhook(id: number): Promise<boolean> {
    return this.webhooks.delete(id);
  }

  // Error logging
  async logError(context: string, errorMessage: string, stackTrace: string = "", payload: any = {}): Promise<void> {
    const id = this.currentErrorLogId++;
    this.errorLogs.push({
      id,
      timestamp: new Date(),
      context,
      error_message: errorMessage,
      stack_trace: stackTrace,
      payload
    });
  }
}

// Export the storage instance
// Import DatabaseStorage from the new file
import { DatabaseStorage } from './storage.database';

// Create a database storage instance and export it
export const storage = new DatabaseStorage();
