import { Router } from 'express';
import authenticateUser from '../middleware/auth.js';
import slackService from '../services/slackService.js';
import jwt from 'jsonwebtoken';
import Channel from '../models/Channel.js';

const {
  getOAuthUrl,
  handleOAuthCallback,
  getChannels,
  configureChannels,
  getUserChannels,
  removeChannel,
  syncAllChannels
} = slackService;

const router = Router();

// Debug endpoint to test OAuth URL generation
router.get('/debug/oauth-url', authenticateUser, async (req, res) => {
  try {
    console.log('Debug: Generating OAuth URL for user:', req.user._id);
    const url = await getOAuthUrl(req.user._id.toString());
    console.log('Debug: Generated OAuth URL:', url);
    res.json({ 
      url, 
      userId: req.user._id.toString(),
      redirectUri: process.env.SLACK_REDIRECT_URI
    });
  } catch (error) {
    console.error('Debug: Error generating OAuth URL:', error);
    res.status(500).json({ message: 'Failed to generate OAuth URL', error: error.message });
  }
});

// Get Slack OAuth URL
router.get('/oauth/url', authenticateUser, async (req, res) => {
  try {
    const url = await getOAuthUrl(req.user._id.toString());
    res.json({ url });
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    res.status(500).json({ message: 'Failed to generate OAuth URL' });
  }
});

// Handle OAuth callback
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).json({ message: 'Authorization code required' });

    console.log('OAuth callback received:', { code: code.substring(0, 10) + '...', state });

    // Extract userId from state parameter if available
    let userId = null;
    try {
      if (state) {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = stateData.userId;
        console.log('Extracted userId from state:', userId);
      }
    } catch (error) {
      console.error('Error parsing state:', error);
    }
    
    // Fallback: try to get userId from JWT token in cookies
    if (!userId) {
      try {
        const token = req.cookies?.token;
        if (token) {
          const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
          userId = payload?.sub;
          console.log('Extracted userId from JWT:', userId);
        }
      } catch (error) {
        console.error('Error verifying JWT token:', error);
      }
    }
    
    if (!userId) {
      console.error('No userId found in state or JWT token');
      const redirect = (process.env.CLIENT_URL || 'http://localhost:5173') + '/dashboard?slack=error&reason=no_user';
      return res.redirect(302, redirect);
    }

    // Use direct OAuth token exchange instead of InstallProvider
    const result = await handleOAuthCallback(
      { code, redirectUri: process.env.SLACK_REDIRECT_URI },
      userId
    );

    console.log('OAuth callback successful for user:', userId);

    // Redirect back to client settings page with success
    const redirect = (process.env.CLIENT_URL || 'http://localhost:5173') + '/dashboard?slack=connected';
    return res.redirect(302, redirect);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const redirect = (process.env.CLIENT_URL || 'http://localhost:5173') + '/dashboard?slack=error&reason=callback_error';
    return res.redirect(302, redirect);
  }
});

// Get available channels
router.get('/channels', authenticateUser, async (req, res) => {
  try {
    const channels = await getChannels(req.user._id.toString());
    res.json({ channels });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ message: 'Failed to fetch channels' });
  }
});

// Configure channels for monitoring
router.post('/channels/configure', authenticateUser, async (req, res) => {
  try {
    const { channels } = req.body;
    
    if (!Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ message: 'Channels array is required' });
    }

    const configuredChannels = await configureChannels(req.user._id.toString(), channels);
    
    res.json({
      status: 'success',
      configured_channels: configuredChannels.length,
      channels: configuredChannels
    });
  } catch (error) {
    console.error('Error configuring channels:', error);
    res.status(500).json({ message: 'Failed to configure channels' });
  }
});

// Get user's configured channels
router.get('/channels/configured', authenticateUser, async (req, res) => {
  try {
    const channels = await getUserChannels(req.user._id.toString());
    res.json({ channels });
  } catch (error) {
    console.error('Error fetching configured channels:', error);
    res.status(500).json({ message: 'Failed to fetch configured channels' });
  }
});

// Remove channel from monitoring
router.delete('/channels/:channelId', authenticateUser, async (req, res) => {
  try {
    const { channelId } = req.params;
    const success = await removeChannel(req.user._id.toString(), channelId);
    
    if (success) {
      res.json({ message: 'Channel removed from monitoring' });
    } else {
      res.status(404).json({ message: 'Channel not found or not authorized' });
    }
  } catch (error) {
    console.error('Error removing channel:', error);
    res.status(500).json({ message: 'Failed to remove channel' });
  }
});

// Manual sync trigger (for testing/admin)
router.post('/sync', authenticateUser, async (req, res) => {
  try {
    const { fullSync } = req.body;
    const results = await syncAllChannels(fullSync === 'true');
    res.json({
      message: fullSync === 'true' ? 'Full sync completed' : 'Incremental sync completed',
      results
    });
  } catch (error) {
    console.error('Error in manual sync:', error);
    res.status(500).json({ message: 'Sync failed' });
  }
});

// Full sync trigger (fetches all messages from the beginning)
router.post('/sync/full', authenticateUser, async (req, res) => {
  try {
    const results = await syncAllChannels(true);
    res.json({
      message: 'Full sync completed - fetched all messages from the beginning',
      results
    });
  } catch (error) {
    console.error('Error in full sync:', error);
    res.status(500).json({ message: 'Full sync failed' });
  }
});

// Manual aggregation triggers (for development)
router.post('/aggregate/daily', authenticateUser, async (req, res) => {
  try {
    const { processDailyAggregations } = await import('../services/aggregationService.js');
    await processDailyAggregations();
    res.json({ message: 'Daily aggregations completed' });
  } catch (error) {
    console.error('Error in daily aggregations:', error);
    res.status(500).json({ message: 'Daily aggregations failed' });
  }
});

router.post('/aggregate/weekly', authenticateUser, async (req, res) => {
  try {
    const { processWeeklyAggregations } = await import('../services/aggregationService.js');
    await processWeeklyAggregations();
    res.json({ message: 'Weekly aggregations completed' });
  } catch (error) {
    console.error('Error in weekly aggregations:', error);
    res.status(500).json({ message: 'Weekly aggregations failed' });
  }
});

// Aggregate today's data for all active channels (development helper)
router.post('/aggregate/daily/today', authenticateUser, async (req, res) => {
  try {
    const { aggregateDailySentiment } = await import('../services/aggregationService.js');

    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const channels = await Channel.find({ is_active: true });
    let processedCount = 0;
    for (const channel of channels) {
      const result = await aggregateDailySentiment(channel.channel_id, dateStr);
      if (result) processedCount++;
    }

    res.json({ message: 'Today\'s daily aggregations completed', processed: processedCount, date: dateStr });
  } catch (error) {
    console.error('Error aggregating today\'s daily sentiment:', error);
    res.status(500).json({ message: 'Today aggregation failed' });
  }
});

// Aggregate ALL messages from today (including unconfigured channels)
router.post('/aggregate/daily/all-messages', authenticateUser, async (req, res) => {
  try {
    const { processDailyAggregationsForAllMessages } = await import('../services/aggregationService.js');
    
    const result = await processDailyAggregationsForAllMessages();
    
    res.json({ 
      message: 'All messages aggregated successfully', 
      processed: result.processed, 
      failed: result.failed 
    });
  } catch (error) {
    console.error('Error aggregating all messages:', error);
    res.status(500).json({ message: 'All messages aggregation failed' });
  }
});

// Force process ALL messages by creating missing channel records
router.post('/aggregate/force-all', authenticateUser, async (req, res) => {
  try {
    const Message = (await import('../models/Message.js')).default;
    const Channel = (await import('../models/Channel.js')).default;
    const DailyAggregate = (await import('../models/DailyAggregate.js')).default;
    
    // Get all messages
    const messages = await Message.find({});
    console.log(`Found ${messages.length} total messages`);
    
    // Group by channel and date
    const channelDateGroups = {};
    messages.forEach(msg => {
      const channelId = msg.channel_id;
      const dateStr = msg.timestamp.toISOString().split('T')[0];
      const key = `${channelId}-${dateStr}`;
      
      if (!channelDateGroups[key]) {
        channelDateGroups[key] = {
          channelId,
          dateStr,
          messages: [],
          totalSentiment: 0
        };
      }
      channelDateGroups[key].messages.push(msg);
      channelDateGroups[key].totalSentiment += msg.sentiment_score || 0;
    });
    
    console.log(`Grouped into ${Object.keys(channelDateGroups).length} channel-date combinations`);
    
    let processedCount = 0;
    
    // Process each group
    for (const [key, group] of Object.entries(channelDateGroups)) {
      try {
        // Ensure channel exists
        let channel = await Channel.findOne({ channel_id: group.channelId });
        if (!channel) {
          channel = new Channel({
            channel_id: group.channelId,
            channel_name: `channel-${group.channelId.substring(0, 8)}`,
            team_id: 'default-team',
            configured_by: null,
            is_active: true
          });
          await channel.save();
          console.log(`Created channel record for ${group.channelId}`);
        }
        
        // Calculate sentiment stats
        const avgSentiment = group.totalSentiment / group.messages.length;
        let positiveCount = 0, negativeCount = 0, neutralCount = 0;
        
        group.messages.forEach(msg => {
          const score = msg.sentiment_score || 0;
          if (score > 0.1) positiveCount++;
          else if (score < -0.1) negativeCount++;
          else neutralCount++;
        });
        
        // Create daily aggregate
        const aggregateData = {
          date: group.dateStr,
          channel_id: group.channelId,
          team_id: channel.team_id,
          avg_sentiment: avgSentiment,
          message_count: group.messages.length,
          positive_count: positiveCount,
          negative_count: negativeCount,
          neutral_count: neutralCount
        };
        
        await DailyAggregate.findOneAndUpdate(
          { date: group.dateStr, channel_id: group.channelId },
          aggregateData,
          { upsert: true, new: true }
        );
        
        processedCount++;
        console.log(`Processed ${group.channelId} on ${group.dateStr}: ${group.messages.length} messages`);
        
      } catch (error) {
        console.error(`Error processing ${key}:`, error);
      }
    }
    
    res.json({ 
      message: `Force aggregation completed: ${processedCount} channel-date combinations processed`,
      totalMessages: messages.length,
      processed: processedCount
    });
    
  } catch (error) {
    console.error('Error in force aggregation:', error);
    res.status(500).json({ message: 'Force aggregation failed' });
  }
});

// Process current week aggregations
router.post('/aggregate/weekly/current', authenticateUser, async (req, res) => {
  try {
    const { processCurrentWeekAggregations } = await import('../services/aggregationService.js');
    
    await processCurrentWeekAggregations();
    
    res.json({ 
      message: 'Current week aggregations completed successfully'
    });
    
  } catch (error) {
    console.error('Error in current week aggregations:', error);
    res.status(500).json({ message: 'Current week aggregations failed' });
  }
});

export default router;
