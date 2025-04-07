import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import cron from "node-cron";
import { z } from "zod";

// API Routes
import ghlRoutes from "./api/ghlRoutes";
import emailRoutes from "./api/emailRoutes";
import contactRoutes from "./api/contactRoutes";
import settingRoutes from "./api/settingRoutes";
import webhookRoutes from "./api/webhookRoutes";
import analyticsRoutes from "./api/analyticsRoutes";
import integrationRoutes from "./api/integrationRoutes";

// Background Jobs
import { syncContacts } from "./jobs/contactSync";
import { processPriorityEmails } from "./jobs/prioritySender";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register routes
  app.use("/api", ghlRoutes); // GHL routes already include /auth/ghl path
  app.use("/api/emails", emailRoutes);
  app.use("/api/contacts", contactRoutes);
  app.use("/api/settings", settingRoutes);
  app.use("/api/webhooks", webhookRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/integrations", integrationRoutes);

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", time: new Date().toISOString() });
  });

  // Manual sync trigger
  app.post("/api/ghl/sync-contacts", async (_req: Request, res: Response) => {
    try {
      await syncContacts();
      res.status(200).json({ success: true, message: "Contact sync initiated" });
    } catch (error) {
      await storage.logError(
        "Manual Contact Sync",
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined
      );
      res.status(500).json({ success: false, message: "Failed to sync contacts" });
    }
  });

  // Error handling middleware
  app.use((err: Error, _req: Request, res: Response, next: any) => {
    console.error("Error:", err);
    
    // Log the error
    storage.logError(
      "API Error",
      err.message,
      err.stack,
      { path: _req.path, method: _req.method }
    ).catch(console.error);
    
    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal Server Error",
        message: err.message
      });
    }
    
    next(err);
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Schedule recurring jobs
  // Run contact sync every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    try {
      console.log("Running scheduled contact sync job");
      await syncContacts();
    } catch (error) {
      await storage.logError(
        "Scheduled Contact Sync",
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined
      );
      console.error("Error in contact sync job:", error);
    }
  });

  // Run priority email sending every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      console.log("Running scheduled priority email sending job");
      await processPriorityEmails();
    } catch (error) {
      await storage.logError(
        "Priority Email Sender",
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined
      );
      console.error("Error in priority email sender job:", error);
    }
  });

  return httpServer;
}
