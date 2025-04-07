import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { EmailDeliveryStatus, EmailType } from '@shared/schema';

const router = express.Router();

// Get aggregated email stats
router.get('/emails/:id', async (req: Request, res: Response) => {
  try {
    const emailId = parseInt(req.params.id);
    
    // Get the email to check it exists
    const email = await storage.getEmail(emailId);
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Get all deliveries for this email
    const deliveries = await storage.getEmailDeliveriesByEmailId(emailId);
    
    // Count stats
    const total = deliveries.length;
    const delivered = deliveries.filter(d => d.status === EmailDeliveryStatus.DELIVERED || 
                                             d.status === EmailDeliveryStatus.OPENED || 
                                             d.status === EmailDeliveryStatus.CLICKED).length;
    const opened = deliveries.filter(d => d.status === EmailDeliveryStatus.OPENED || 
                                          d.status === EmailDeliveryStatus.CLICKED).length;
    const clicked = deliveries.filter(d => d.status === EmailDeliveryStatus.CLICKED).length;
    const bounced = deliveries.filter(d => d.status === EmailDeliveryStatus.BOUNCED).length;
    const complained = deliveries.filter(d => d.status === EmailDeliveryStatus.COMPLAINED).length;
    
    // Calculate rates
    const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
    const clickThroughRate = delivered > 0 ? (clicked / delivered) * 100 : 0;
    const bounceRate = total > 0 ? (bounced / total) * 100 : 0;
    const complaintRate = delivered > 0 ? (complained / delivered) * 100 : 0;
    
    res.json({
      emailId,
      emailName: email.name,
      emailType: email.type,
      stats: {
        total,
        delivered,
        opened,
        clicked,
        bounced,
        complained,
        deliveryRate: deliveryRate.toFixed(2),
        openRate: openRate.toFixed(2),
        clickRate: clickRate.toFixed(2),
        clickThroughRate: clickThroughRate.toFixed(2),
        bounceRate: bounceRate.toFixed(2),
        complaintRate: complaintRate.toFixed(2)
      }
    });
  } catch (error) {
    await storage.logError(
      'Get Email Analytics',
      error instanceof Error ? error.message : 'Unknown error retrieving email analytics',
      error instanceof Error ? error.stack : undefined,
      { emailId: req.params.id }
    );
    
    res.status(500).json({ error: 'Failed to retrieve email analytics' });
  }
});

// Get experiment comparison results
router.get('/experiments/:id', async (req: Request, res: Response) => {
  try {
    const experimentId = parseInt(req.params.id);
    
    // Get the experiment to check it exists and is the right type
    const experiment = await storage.getEmail(experimentId);
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }
    
    if (experiment.type !== EmailType.EXPERIMENT) {
      return res.status(400).json({ error: 'Email is not an experiment' });
    }
    
    // Get all variants for this experiment
    const variants = await storage.getVariantsByEmailId(experimentId);
    
    if (variants.length === 0) {
      return res.status(404).json({ error: 'No variants found for this experiment' });
    }
    
    // Collect stats for each variant
    const variantStats = await Promise.all(variants.map(async (variant) => {
      // Get all deliveries for this variant
      const deliveries = await storage.getEmailDeliveriesByEmailId(experimentId).then(
        deliveries => deliveries.filter(d => d.variant_id === variant.id)
      );
      
      // Count stats
      const total = deliveries.length;
      const delivered = deliveries.filter(d => d.status === EmailDeliveryStatus.DELIVERED || 
                                               d.status === EmailDeliveryStatus.OPENED || 
                                               d.status === EmailDeliveryStatus.CLICKED).length;
      const opened = deliveries.filter(d => d.status === EmailDeliveryStatus.OPENED || 
                                            d.status === EmailDeliveryStatus.CLICKED).length;
      const clicked = deliveries.filter(d => d.status === EmailDeliveryStatus.CLICKED).length;
      
      // Calculate rates
      const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;
      const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
      const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
      const clickThroughRate = delivered > 0 ? (clicked / delivered) * 100 : 0;
      
      return {
        variantId: variant.id,
        variantLetter: variant.variant_letter,
        subject: variant.subject,
        stats: {
          total,
          delivered,
          opened,
          clicked,
          deliveryRate: deliveryRate.toFixed(2),
          openRate: openRate.toFixed(2),
          clickRate: clickRate.toFixed(2),
          clickThroughRate: clickThroughRate.toFixed(2)
        }
      };
    }));
    
    // Determine winner based on open rate (could be made configurable)
    let winner = null;
    if (variantStats.length > 0) {
      winner = variantStats.reduce((prev, current) => 
        parseFloat(current.stats.openRate) > parseFloat(prev.stats.openRate) ? current : prev
      );
    }
    
    res.json({
      experimentId,
      experimentName: experiment.name,
      variants: variantStats,
      winner: winner ? {
        variantId: winner.variantId,
        variantLetter: winner.variantLetter,
        openRate: winner.stats.openRate,
        improvement: variantStats.length > 1 
          ? `${(parseFloat(winner.stats.openRate) - 
               parseFloat(variantStats.reduce((total, curr) => 
                 curr.variantId !== winner.variantId 
                   ? { stats: { openRate: (parseFloat(total.stats.openRate) + parseFloat(curr.stats.openRate)).toString() }} 
                   : total, 
                 { stats: { openRate: '0' }}
               ).stats.openRate) / (variantStats.length - 1)).toFixed(2)}%`
          : 'N/A'
      } : null
    });
  } catch (error) {
    await storage.logError(
      'Get Experiment Analytics',
      error instanceof Error ? error.message : 'Unknown error retrieving experiment analytics',
      error instanceof Error ? error.stack : undefined,
      { experimentId: req.params.id }
    );
    
    res.status(500).json({ error: 'Failed to retrieve experiment analytics' });
  }
});

// Get dashboard summary statistics
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    // Get counts for each email type
    const allEmails = await storage.getAllEmails();
    const templateCount = allEmails.filter(e => e.type === EmailType.TEMPLATE).length;
    const priorityCount = allEmails.filter(e => e.type === EmailType.PRIORITY).length;
    const experimentCount = allEmails.filter(e => e.type === EmailType.EXPERIMENT).length;
    
    // Get counts for different email delivery statuses
    const allDeliveries = []; // This would be replaced with a full query in a real implementation
    for (const email of allEmails) {
      const deliveries = await storage.getEmailDeliveriesByEmailId(email.id);
      allDeliveries.push(...deliveries);
    }
    
    const totalSent = allDeliveries.length;
    const delivered = allDeliveries.filter(d => d.status === EmailDeliveryStatus.DELIVERED || 
                                               d.status === EmailDeliveryStatus.OPENED || 
                                               d.status === EmailDeliveryStatus.CLICKED).length;
    const opened = allDeliveries.filter(d => d.status === EmailDeliveryStatus.OPENED || 
                                            d.status === EmailDeliveryStatus.CLICKED).length;
    const clicked = allDeliveries.filter(d => d.status === EmailDeliveryStatus.CLICKED).length;
    
    // Calculate rates
    const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    const clickRate = opened > 0 ? (clicked / opened) * 100 : 0;
    const clickThroughRate = delivered > 0 ? (clicked / delivered) * 100 : 0;
    
    // Get contact count
    const allContacts = await storage.getAllContacts();
    
    // Recent activity
    const recentActivity = allDeliveries
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(async (delivery) => {
        const email = await storage.getEmail(delivery.email_id);
        const contact = await storage.getContact(delivery.contact_id);
        return {
          type: email?.type || 'unknown',
          name: email?.name || 'Unknown Email',
          contactName: contact?.name || 'Unknown Contact',
          status: delivery.status,
          timestamp: delivery.updated_at
        };
      });
    
    res.json({
      emailCounts: {
        total: allEmails.length,
        template: templateCount,
        priority: priorityCount,
        experiment: experimentCount
      },
      deliveryCounts: {
        totalSent,
        delivered,
        opened,
        clicked
      },
      rates: {
        deliveryRate: deliveryRate.toFixed(2),
        openRate: openRate.toFixed(2),
        clickRate: clickRate.toFixed(2),
        clickThroughRate: clickThroughRate.toFixed(2)
      },
      contacts: {
        total: allContacts.length
      },
      recentActivity: await Promise.all(recentActivity)
    });
  } catch (error) {
    await storage.logError(
      'Get Analytics Summary',
      error instanceof Error ? error.message : 'Unknown error retrieving analytics summary',
      error instanceof Error ? error.stack : undefined
    );
    
    res.status(500).json({ error: 'Failed to retrieve analytics summary' });
  }
});

// Get statistics by email type
router.get('/statistics', async (_req: Request, res: Response) => {
  try {
    const emailTypes = [EmailType.PRIORITY, EmailType.EXPERIMENT, EmailType.TEMPLATE];
    
    const statistics = await Promise.all(emailTypes.map(async (type) => {
      // Get emails of this type
      const emails = await storage.getEmailsByType(type);
      
      // Collect all deliveries for emails of this type
      let deliveries = [];
      for (const email of emails) {
        const emailDeliveries = await storage.getEmailDeliveriesByEmailId(email.id);
        deliveries.push(...emailDeliveries);
      }
      
      // Count stats
      const totalSent = deliveries.length;
      const delivered = deliveries.filter(d => d.status === EmailDeliveryStatus.DELIVERED || 
                                              d.status === EmailDeliveryStatus.OPENED || 
                                              d.status === EmailDeliveryStatus.CLICKED).length;
      const opened = deliveries.filter(d => d.status === EmailDeliveryStatus.OPENED || 
                                            d.status === EmailDeliveryStatus.CLICKED).length;
      const clicked = deliveries.filter(d => d.status === EmailDeliveryStatus.CLICKED).length;
      
      // Calculate rates
      const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
      const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0;
      
      return {
        type,
        emailCount: emails.length,
        stats: {
          sent: totalSent,
          opened,
          clicked,
          openRate: openRate.toFixed(2),
          clickRate: clickRate.toFixed(2)
        }
      };
    }));
    
    res.json(statistics);
  } catch (error) {
    await storage.logError(
      'Get Type Statistics',
      error instanceof Error ? error.message : 'Unknown error retrieving type statistics',
      error instanceof Error ? error.stack : undefined
    );
    
    res.status(500).json({ error: 'Failed to retrieve email type statistics' });
  }
});

export default router;
