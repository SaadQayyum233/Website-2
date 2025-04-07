import { fetchGHLContacts, mapGHLContact } from '../core/ghlService';
import { storage } from '../storage';

/**
 * Synchronize contacts from GHL to our database
 */
export async function syncContacts() {
  console.log('Starting GHL contact synchronization...');
  
  try {
    // Track metrics
    let totalContacts = 0;
    let newContacts = 0;
    let updatedContacts = 0;
    let currentPage = 1;
    let hasMore = true;
    
    // Loop through paginated results
    while (hasMore) {
      // Fetch a page of contacts from GHL
      const { contacts, hasMore: morePages } = await fetchGHLContacts(currentPage, 100);
      
      if (!contacts || contacts.length === 0) {
        break;
      }
      
      console.log(`Processing ${contacts.length} contacts from page ${currentPage}`);
      totalContacts += contacts.length;
      
      // Process each contact
      for (const ghlContact of contacts) {
        // Skip contacts without ID
        if (!ghlContact.id) {
          continue;
        }
        
        // Map GHL contact to our format
        const contactData = mapGHLContact(ghlContact);
        
        // Check if contact already exists in our database
        const existingContact = await storage.getContactByGhlId(ghlContact.id);
        
        if (existingContact) {
          // Update existing contact
          await storage.updateContact(existingContact.id, contactData);
          updatedContacts++;
        } else {
          // Create new contact
          await storage.createContact(contactData);
          newContacts++;
        }
      }
      
      // Update loop variables
      hasMore = morePages;
      currentPage++;
      
      // Add a small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`Contact sync completed. Processed ${totalContacts} contacts: ${newContacts} new, ${updatedContacts} updated.`);
    
    return {
      success: true,
      totalProcessed: totalContacts,
      newContacts,
      updatedContacts
    };
  } catch (error) {
    // Log the error
    await storage.logError(
      'Contact Sync Job',
      error instanceof Error ? error.message : 'Unknown error during contact sync',
      error instanceof Error ? error.stack : undefined
    );
    
    console.error('Error during contact synchronization:', error);
    
    throw error;
  }
}
