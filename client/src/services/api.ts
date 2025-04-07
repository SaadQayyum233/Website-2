import { apiRequest } from "@/lib/queryClient";

/**
 * Service layer for making API calls to the backend
 */

// Contacts API
export const contactsApi = {
  // Get all contacts
  getContacts: async (params?: { tag?: string, page?: number, limit?: number }) => {
    let url = '/api/contacts';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.tag) queryParams.append('tag', params.tag);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }
    
    const response = await fetch(url, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch contacts: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  // Get a specific contact
  getContact: async (id: number) => {
    const response = await fetch(`/api/contacts/${id}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch contact: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  // Create a new contact
  createContact: async (data: any) => {
    return apiRequest('POST', '/api/contacts', data);
  },
  
  // Update a contact
  updateContact: async (id: number, data: any) => {
    return apiRequest('PUT', `/api/contacts/${id}`, data);
  },
  
  // Delete a contact
  deleteContact: async (id: number) => {
    return apiRequest('DELETE', `/api/contacts/${id}`);
  },
  
  // Manage contact tags
  manageTags: async (id: number, action: 'add' | 'remove', tag: string) => {
    return apiRequest('PUT', `/api/contacts/${id}/tags`, { action, tag });
  }
};

// Emails API
export const emailsApi = {
  // Get all emails
  getEmails: async (params?: { type?: string, isActive?: boolean }) => {
    let url = '/api/emails';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.type) queryParams.append('type', params.type);
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }
    
    const response = await fetch(url, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch emails: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  // Get a specific email
  getEmail: async (id: number) => {
    const response = await fetch(`/api/emails/${id}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch email: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  // Create a new email
  createEmail: async (data: any) => {
    return apiRequest('POST', '/api/emails', data);
  },
  
  // Update an email
  updateEmail: async (id: number, data: any) => {
    return apiRequest('PUT', `/api/emails/${id}`, data);
  },
  
  // Delete an email
  deleteEmail: async (id: number) => {
    return apiRequest('DELETE', `/api/emails/${id}`);
  },
  
  // Send an email
  sendEmail: async (id: number, tag: string, variantId?: number) => {
    return apiRequest('POST', `/api/emails/${id}/send`, { tag, variantId });
  },
  
  // Generate variants for an experiment
  generateVariants: async (id: number, count: number = 3) => {
    return apiRequest('POST', `/api/emails/${id}/generate-variants`, { count });
  }
};

// Analytics API
export const analyticsApi = {
  // Get email analytics
  getEmailAnalytics: async (id: number) => {
    const response = await fetch(`/api/analytics/emails/${id}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch email analytics: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  // Get experiment results
  getExperimentResults: async (id: number) => {
    const response = await fetch(`/api/analytics/experiments/${id}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch experiment results: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  // Get dashboard summary
  getSummary: async () => {
    const response = await fetch('/api/analytics/summary', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch summary: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  // Get email type statistics
  getStatistics: async () => {
    const response = await fetch('/api/analytics/statistics', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch statistics: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
};

// Settings API
export const settingsApi = {
  // Get user settings
  getUserSettings: async () => {
    const response = await fetch('/api/settings', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user settings: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  // Update user settings
  updateUserSettings: async (data: any) => {
    return apiRequest('PUT', '/api/settings', data);
  },
  
  // Get available integrations
  getAvailableIntegrations: async () => {
    const response = await fetch('/api/settings/integrations/available-apps', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch available integrations: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  // Get connected integrations
  getConnectedIntegrations: async () => {
    const response = await fetch('/api/settings/integrations/connections', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch connected integrations: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
  
  // Create/update integration connection
  saveIntegrationConnection: async (provider: string, config: any) => {
    return apiRequest('POST', '/api/settings/integrations/connections', {
      provider,
      ...config
    });
  },
  
  // Delete integration connection
  deleteIntegrationConnection: async (provider: string) => {
    const response = await fetch(`/api/settings/integrations/connections/${provider}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete integration: ${response.status} ${response.statusText}`);
    }
    
    return true;
  }
};

// GHL API
export const ghlApi = {
  // Sync contacts
  syncContacts: async () => {
    return apiRequest('POST', '/api/ghl/sync-contacts');
  },
  
  // Get connection status
  getConnectionStatus: async () => {
    const response = await fetch('/api/ghl/connection-status', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get GHL connection status: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
};
