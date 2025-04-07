import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base user table from template
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Contacts table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  ghl_id: text("ghl_id").unique(),
  email: text("email").notNull(),
  name: text("name"),
  tags: json("tags").$type<string[]>().default([]),
  custom_fields: json("custom_fields").$type<Record<string, any>>().default({}),
  last_email_sequence: integer("last_email_sequence").default(0),
  joined_date: timestamp("joined_date"),
  contact_source: text("contact_source"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Email types enum
export const EmailType = {
  TEMPLATE: 'template',
  PRIORITY: 'priority',
  EXPERIMENT: 'experiment'
} as const;

export type EmailTypeValues = typeof EmailType[keyof typeof EmailType];

// Emails table
export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id"),
  type: text("type").$type<EmailTypeValues>().notNull(),
  name: text("name"),
  subject: text("subject"),
  body_html: text("body_html"),
  body_text: text("body_text"),
  key_angle: text("key_angle"),
  version: integer("version").default(1),
  base_email_id: integer("base_email_id"),
  start_date: timestamp("start_date"),
  end_date: timestamp("end_date"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Experiment variants table
export const experimentVariants = pgTable("experiment_variants", {
  id: serial("id").primaryKey(),
  email_id: integer("email_id").notNull(),
  variant_letter: text("variant_letter"),
  subject: text("subject"),
  body_html: text("body_html"),
  body_text: text("body_text"),
  key_angle: text("key_angle"),
  ai_parameters: json("ai_parameters").$type<Record<string, any>>().default({}),
  created_at: timestamp("created_at").defaultNow(),
});

// Email delivery status enum
export const EmailDeliveryStatus = {
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  OPENED: 'opened',
  CLICKED: 'clicked',
  BOUNCED: 'bounced',
  COMPLAINED: 'complained',
  UNSUBSCRIBED: 'unsubscribed',
  FAILED: 'failed'
} as const;

export type EmailDeliveryStatusValues = typeof EmailDeliveryStatus[keyof typeof EmailDeliveryStatus];

// Email deliveries table
export const emailDeliveries = pgTable("email_deliveries", {
  id: serial("id").primaryKey(),
  email_id: integer("email_id").notNull(),
  variant_id: integer("variant_id"),
  contact_id: integer("contact_id").notNull(),
  ghl_message_id: text("ghl_message_id"),
  status: text("status").$type<EmailDeliveryStatusValues>().default('queued'),
  sent_at: timestamp("sent_at"),
  delivered_at: timestamp("delivered_at"),
  opened_at: timestamp("opened_at"),
  clicked_at: timestamp("clicked_at"),
  bounced_at: timestamp("bounced_at"),
  complained_at: timestamp("complained_at"),
  unsubscribed_at: timestamp("unsubscribed_at"),
  error_message: text("error_message"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// User settings table
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").unique(),
  avatar_name: text("avatar_name"),
  avatar_bio: text("avatar_bio"),
  avatar_company_name: text("avatar_company_name"),
  avatar_inspiration_name: text("avatar_inspiration_name"),
  avatar_role: text("avatar_role"),
  avatar_website: text("avatar_website"),
  email_signature_html: text("email_signature_html"),
  icp_fears: text("icp_fears"),
  icp_pain_points: text("icp_pain_points"),
  icp_insecurities: text("icp_insecurities"),
  icp_transformations: text("icp_transformations"),
  icp_description: text("icp_description"),
  icp_key_objectives: text("icp_key_objectives"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Error logs table
export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow(),
  context: text("context"),
  error_message: text("error_message"),
  stack_trace: text("stack_trace"),
  payload: json("payload"),
});

// Integration connections table for storing OAuth tokens, API keys, etc.
export const integrationConnections = pgTable("integration_connections", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  provider: text("provider").notNull(), // 'ghl', 'openai', etc.
  name: text("name"), // Display name for the connection
  iconUrl: text("icon_url"), // Icon URL for the connection
  backgroundColor: text("background_color"), // Background color for the icon
  access_token: text("access_token"),
  refresh_token: text("refresh_token"),
  token_expires_at: timestamp("token_expires_at"),
  is_active: boolean("is_active").default(true),
  config: json("config").$type<Record<string, any>>().default({}),
  lastTested: timestamp("last_tested"), // When the connection was last tested
  lastTestSuccess: boolean("last_test_success"), // Whether the last test was successful
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Webhook type enum
export const WebhookType = {
  INCOMING: 'incoming',
  OUTGOING: 'outgoing'
} as const;

export type WebhookTypeValues = typeof WebhookType[keyof typeof WebhookType];

// Webhooks table
export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  type: text("type").$type<WebhookTypeValues>().notNull(), // 'incoming' or 'outgoing'
  name: text("name").notNull(),
  description: text("description"),
  provider: text("provider").notNull(), // 'custom', 'ghl', etc.
  
  // Fields for incoming webhooks
  endpoint_token: text("endpoint_token"), // Token part of the URL
  secret_key: text("secret_key"), // For signing/verifying
  event_handling: json("event_handling").$type<string[]>().default([]),
  notification_email: text("notification_email"),
  
  // Fields for outgoing webhooks
  trigger_event: text("trigger_event"),
  target_url: text("target_url"),
  http_method: text("http_method"), // GET, POST, PUT, DELETE, PATCH
  headers: json("headers").$type<Record<string, string>>().default({}),
  selected_fields: json("selected_fields").$type<string[]>().default([]),
  payload_template: text("payload_template"),
  
  is_active: boolean("is_active").default(true),
  last_triggered: timestamp("last_triggered"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertEmailSchema = createInsertSchema(emails).omit({
  id: true,
  created_at: true,
  updated_at: true,
  version: true,
});

export const insertExperimentVariantSchema = createInsertSchema(experimentVariants).omit({
  id: true,
  created_at: true,
});

export const insertEmailDeliverySchema = createInsertSchema(emailDeliveries).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertIntegrationConnectionSchema = createInsertSchema(integrationConnections).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  created_at: true,
  updated_at: true,
  last_triggered: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emails.$inferSelect;

export type InsertExperimentVariant = z.infer<typeof insertExperimentVariantSchema>;
export type ExperimentVariant = typeof experimentVariants.$inferSelect;

export type InsertEmailDelivery = z.infer<typeof insertEmailDeliverySchema>;
export type EmailDelivery = typeof emailDeliveries.$inferSelect;

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

export type InsertIntegrationConnection = z.infer<typeof insertIntegrationConnectionSchema>;
export type IntegrationConnection = typeof integrationConnections.$inferSelect;

export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;
