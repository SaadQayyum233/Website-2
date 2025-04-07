import { 
  users, type User, type InsertUser,
  contacts, type Contact, type InsertContact,
  emails, type Email, type InsertEmail,
  experimentVariants, type ExperimentVariant, type InsertExperimentVariant,
  emailDeliveries, type EmailDelivery, type InsertEmailDelivery,
  userSettings, type UserSettings, type InsertUserSettings,
  integrationConnections, type IntegrationConnection, type InsertIntegrationConnection,
  webhooks, type Webhook, type InsertWebhook, type WebhookTypeValues,
  errorLogs
} from "@shared/schema";
import { db } from "./db/db";
import { eq, and, desc, like, sql, inArray } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Contact operations
  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async getContactByEmail(email: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.email, email));
    return contact;
  }

  async getContactByGhlId(ghlId: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.ghl_id, ghlId));
    return contact;
  }

  async getContactsByTag(tag: string): Promise<Contact[]> {
    // We need to query for contacts where the tag is in the tags array
    // This is a simplification and may need to be adjusted based on how tags are stored
    const result = await db.execute(sql`SELECT * FROM ${contacts} WHERE ${tag} = ANY(tags)`);
    return result.rows as Contact[];
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact | undefined> {
    const [updatedContact] = await db
      .update(contacts)
      .set({ ...contact, updated_at: new Date() })
      .where(eq(contacts.id, id))
      .returning();
    return updatedContact;
  }

  async upsertContactByGhlId(contact: InsertContact): Promise<Contact> {
    if (!contact.ghl_id) {
      // If no GHL ID, just create a new contact
      return this.createContact(contact);
    }

    const existingContact = await this.getContactByGhlId(contact.ghl_id);
    
    if (existingContact) {
      // Update existing contact
      const [updatedContact] = await db
        .update(contacts)
        .set({ ...contact, updated_at: new Date() })
        .where(eq(contacts.ghl_id, contact.ghl_id))
        .returning();
      return updatedContact;
    } else {
      // Create new contact
      return this.createContact(contact);
    }
  }

  async deleteContact(id: number): Promise<boolean> {
    const result = await db.delete(contacts).where(eq(contacts.id, id));
    return result.rowCount > 0;
  }

  async getAllContacts(page = 1, limit = 50): Promise<Contact[]> {
    const offset = (page - 1) * limit;
    const result = await db
      .select()
      .from(contacts)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(contacts.created_at));
    return result;
  }

  async addTagToContact(contactId: number, tag: string): Promise<Contact | undefined> {
    const existingContact = await this.getContact(contactId);
    if (!existingContact) return undefined;

    // Get current tags and add the new one if it doesn't exist
    const currentTags = existingContact.tags || [];
    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag];
      
      const [updatedContact] = await db
        .update(contacts)
        .set({ 
          tags: newTags, 
          updated_at: new Date() 
        })
        .where(eq(contacts.id, contactId))
        .returning();
      
      return updatedContact;
    }
    
    return existingContact;
  }

  async removeTagFromContact(contactId: number, tag: string): Promise<Contact | undefined> {
    const existingContact = await this.getContact(contactId);
    if (!existingContact) return undefined;

    // Get current tags and remove the specified one
    const currentTags = existingContact.tags || [];
    const newTags = currentTags.filter(t => t !== tag);
    
    const [updatedContact] = await db
      .update(contacts)
      .set({ 
        tags: newTags, 
        updated_at: new Date() 
      })
      .where(eq(contacts.id, contactId))
      .returning();
    
    return updatedContact;
  }

  // Email operations
  async getEmail(id: number): Promise<Email | undefined> {
    const [email] = await db.select().from(emails).where(eq(emails.id, id));
    return email;
  }

  async createEmail(email: InsertEmail): Promise<Email> {
    const [newEmail] = await db.insert(emails).values(email).returning();
    return newEmail;
  }

  async updateEmail(id: number, email: Partial<InsertEmail>): Promise<Email | undefined> {
    const [updatedEmail] = await db
      .update(emails)
      .set({ ...email, updated_at: new Date() })
      .where(eq(emails.id, id))
      .returning();
    return updatedEmail;
  }

  async deleteEmail(id: number): Promise<boolean> {
    const result = await db.delete(emails).where(eq(emails.id, id));
    return result.rowCount > 0;
  }

  async getActiveEmails(): Promise<Email[]> {
    const result = await db
      .select()
      .from(emails)
      .where(eq(emails.is_active, true))
      .orderBy(desc(emails.created_at));
    return result;
  }

  async getEmailsByType(type: string): Promise<Email[]> {
    const result = await db
      .select()
      .from(emails)
      .where(eq(emails.type, type))
      .orderBy(desc(emails.created_at));
    return result;
  }

  async getAllEmails(page = 1, limit = 50): Promise<Email[]> {
    const offset = (page - 1) * limit;
    const result = await db
      .select()
      .from(emails)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(emails.created_at));
    return result;
  }

  // Experiment variant operations
  async getExperimentVariant(id: number): Promise<ExperimentVariant | undefined> {
    const [variant] = await db.select().from(experimentVariants).where(eq(experimentVariants.id, id));
    return variant;
  }

  async getVariantsByEmailId(emailId: number): Promise<ExperimentVariant[]> {
    const result = await db
      .select()
      .from(experimentVariants)
      .where(eq(experimentVariants.email_id, emailId));
    return result;
  }

  async createExperimentVariant(variant: InsertExperimentVariant): Promise<ExperimentVariant> {
    const [newVariant] = await db.insert(experimentVariants).values(variant).returning();
    return newVariant;
  }

  async updateExperimentVariant(id: number, variant: Partial<InsertExperimentVariant>): Promise<ExperimentVariant | undefined> {
    const [updatedVariant] = await db
      .update(experimentVariants)
      .set(variant)
      .where(eq(experimentVariants.id, id))
      .returning();
    return updatedVariant;
  }

  async deleteExperimentVariant(id: number): Promise<boolean> {
    const result = await db.delete(experimentVariants).where(eq(experimentVariants.id, id));
    return result.rowCount > 0;
  }

  // Email delivery operations
  async getEmailDelivery(id: number): Promise<EmailDelivery | undefined> {
    const [delivery] = await db.select().from(emailDeliveries).where(eq(emailDeliveries.id, id));
    return delivery;
  }

  async getEmailDeliveriesByContactId(contactId: number): Promise<EmailDelivery[]> {
    const result = await db
      .select()
      .from(emailDeliveries)
      .where(eq(emailDeliveries.contact_id, contactId))
      .orderBy(desc(emailDeliveries.created_at));
    return result;
  }

  async getEmailDeliveriesByEmailId(emailId: number): Promise<EmailDelivery[]> {
    const result = await db
      .select()
      .from(emailDeliveries)
      .where(eq(emailDeliveries.email_id, emailId))
      .orderBy(desc(emailDeliveries.created_at));
    return result;
  }

  async createEmailDelivery(delivery: InsertEmailDelivery): Promise<EmailDelivery> {
    const [newDelivery] = await db.insert(emailDeliveries).values(delivery).returning();
    return newDelivery;
  }

  async updateEmailDeliveryStatus(id: number, status: string, timestamp: Date = new Date()): Promise<EmailDelivery | undefined> {
    // Build dynamic update object
    const updateData: any = {
      status,
      updated_at: new Date()
    };
    
    // Set the appropriate timestamp field based on status
    if (status === "sent") {
      updateData.sent_at = timestamp;
    } else if (status === "delivered") {
      updateData.delivered_at = timestamp;
    } else if (status === "opened") {
      updateData.opened_at = timestamp;
    } else if (status === "clicked") {
      updateData.clicked_at = timestamp;
    } else if (status === "bounced") {
      updateData.bounced_at = timestamp;
    } else if (status === "failed") {
      updateData.failed_at = timestamp;
    }
    
    const [updatedDelivery] = await db
      .update(emailDeliveries)
      .set(updateData)
      .where(eq(emailDeliveries.id, id))
      .returning();
    
    return updatedDelivery;
  }

  async updateEmailDeliveryByGhlMessageId(ghlMessageId: string, updates: Partial<InsertEmailDelivery>): Promise<EmailDelivery | undefined> {
    const [updatedDelivery] = await db
      .update(emailDeliveries)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(emailDeliveries.ghl_message_id, ghlMessageId))
      .returning();
    
    return updatedDelivery;
  }

  // User settings operations
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.user_id, userId));
    return settings;
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const [newSettings] = await db.insert(userSettings).values(settings).returning();
    return newSettings;
  }

  async updateUserSettings(userId: number, settings: Partial<InsertUserSettings>): Promise<UserSettings | undefined> {
    // Check if settings exist for this user
    const existingSettings = await this.getUserSettings(userId);
    
    if (existingSettings) {
      // Update existing settings
      const [updatedSettings] = await db
        .update(userSettings)
        .set({ ...settings, updated_at: new Date() })
        .where(eq(userSettings.user_id, userId))
        .returning();
      
      return updatedSettings;
    } else {
      // Create new settings if they don't exist
      return this.createUserSettings({ ...settings, user_id: userId });
    }
  }

  // Integration connection operations
  async getIntegrationConnection(userId: number, provider: string): Promise<IntegrationConnection | undefined> {
    const [connection] = await db
      .select()
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.user_id, userId),
          eq(integrationConnections.provider, provider)
        )
      );
    
    return connection;
  }

  async createIntegrationConnection(connection: InsertIntegrationConnection): Promise<IntegrationConnection> {
    // Check if connection already exists
    const existingConnection = await this.getIntegrationConnection(
      connection.user_id,
      connection.provider
    );
    
    if (existingConnection) {
      // Update existing connection
      const [updatedConnection] = await db
        .update(integrationConnections)
        .set({ ...connection, updated_at: new Date() })
        .where(
          and(
            eq(integrationConnections.user_id, connection.user_id),
            eq(integrationConnections.provider, connection.provider)
          )
        )
        .returning();
      
      return updatedConnection;
    } else {
      // Create new connection
      const [newConnection] = await db
        .insert(integrationConnections)
        .values(connection)
        .returning();
      
      return newConnection;
    }
  }

  async updateIntegrationConnection(id: number, connection: Partial<InsertIntegrationConnection>): Promise<IntegrationConnection | undefined> {
    const [updatedConnection] = await db
      .update(integrationConnections)
      .set({ ...connection, updated_at: new Date() })
      .where(eq(integrationConnections.id, id))
      .returning();
    
    return updatedConnection;
  }

  async deleteIntegrationConnection(id: number): Promise<boolean> {
    const result = await db
      .delete(integrationConnections)
      .where(eq(integrationConnections.id, id));
    
    return result.rowCount > 0;
  }

  // Webhook operations
  async getWebhook(id: number): Promise<Webhook | undefined> {
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id));
    return webhook;
  }

  async getWebhooksByUserId(userId: number): Promise<Webhook[]> {
    const result = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.user_id, userId))
      .orderBy(desc(webhooks.created_at));
    return result;
  }

  async getWebhooksByType(userId: number, type: WebhookTypeValues): Promise<Webhook[]> {
    const result = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.user_id, userId),
          eq(webhooks.type, type)
        )
      )
      .orderBy(desc(webhooks.created_at));
    return result;
  }

  async createWebhook(webhook: InsertWebhook): Promise<Webhook> {
    // Cast type for type safety
    let insertData: any = { ...webhook };
    if (webhook.type && typeof webhook.type === 'string') {
      insertData.type = webhook.type as WebhookTypeValues;
    }
    
    console.log('createWebhook - Insert data prepared:', insertData);
    
    try {
      const [newWebhook] = await db.insert(webhooks).values(insertData).returning();
      console.log('createWebhook - Successfully created webhook:', newWebhook);
      return newWebhook;
    } catch (error) {
      console.error('createWebhook - Error inserting webhook:', error);
      throw error;
    }
  }

  async updateWebhook(id: number, webhook: Partial<InsertWebhook>): Promise<Webhook | undefined> {
    // Cast type for type safety
    let updateData: any = { ...webhook, updated_at: new Date() };
    if (webhook.type && typeof webhook.type === 'string') {
      updateData.type = webhook.type as WebhookTypeValues;
    }
    
    const [updatedWebhook] = await db
      .update(webhooks)
      .set(updateData)
      .where(eq(webhooks.id, id))
      .returning();
    return updatedWebhook;
  }

  async deleteWebhook(id: number): Promise<boolean> {
    const result = await db.delete(webhooks).where(eq(webhooks.id, id));
    return result.rowCount > 0;
  }

  // Error logging
  async logError(context: string, errorMessage: string, stackTrace: string = "", payload: any = {}): Promise<void> {
    await db.insert(errorLogs).values({
      context,
      error_message: errorMessage,
      stack_trace: stackTrace,
      payload,
      timestamp: new Date()
    });
  }
}

export const storage = new DatabaseStorage();