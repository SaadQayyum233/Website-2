/**
 * Authentication middleware for protected routes
 * This is a simplified version for the initial implementation
 * In a multi-user setup, this would validate user sessions and permissions
 */

import { storage } from '../storage';

// Middleware to ensure user is authenticated
export const requireAuth = async (req, res, next) => {
  try {
    // For initial implementation, assume a single user (ID: 1)
    // In a multi-user implementation, this would validate the session token
    // and retrieve the appropriate user
    const userId = 1;
    
    // Attach user ID to request object for use in route handlers
    req.userId = userId;
    
    next();
  } catch (error) {
    res.status(401).json({ 
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
  }
};

// Middleware to check if GHL is connected
export const requireGHLConnection = async (req, res, next) => {
  try {
    const userId = req.userId || 1;
    
    // Check if user has an active GHL connection
    const connection = await storage.getIntegrationConnection(userId, 'ghl');
    
    if (!connection || !connection.is_active) {
      return res.status(400).json({
        error: 'GHL connection required',
        message: 'This action requires a connection to GoHighLevel'
      });
    }
    
    // Check if token is expired
    if (connection.token_expires_at) {
      const now = new Date();
      const tokenExpiry = new Date(connection.token_expires_at);
      
      if (tokenExpiry < now) {
        return res.status(400).json({
          error: 'GHL token expired',
          message: 'Your GoHighLevel connection has expired. Please reconnect.'
        });
      }
    }
    
    next();
  } catch (error) {
    await storage.logError(
      'GHL Connection Check',
      error instanceof Error ? error.message : 'Unknown error checking GHL connection',
      error instanceof Error ? error.stack : undefined
    );
    
    res.status(500).json({ 
      error: 'Failed to verify GHL connection',
      message: 'An error occurred while checking your GHL connection'
    });
  }
};

// Middleware to check if OpenAI is connected
export const requireOpenAIConnection = async (req, res, next) => {
  try {
    const userId = req.userId || 1;
    
    // Check if user has an active OpenAI connection
    const connection = await storage.getIntegrationConnection(userId, 'openai');
    
    if (!connection || !connection.is_active || !connection.access_token) {
      return res.status(400).json({
        error: 'OpenAI connection required',
        message: 'This action requires a valid OpenAI API key'
      });
    }
    
    next();
  } catch (error) {
    await storage.logError(
      'OpenAI Connection Check',
      error instanceof Error ? error.message : 'Unknown error checking OpenAI connection',
      error instanceof Error ? error.stack : undefined
    );
    
    res.status(500).json({ 
      error: 'Failed to verify OpenAI connection',
      message: 'An error occurred while checking your OpenAI connection'
    });
  }
};
