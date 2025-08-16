import { WebClient } from '@slack/web-api';
import { InstallProvider } from '@slack/oauth';
import Message from '../models/Message.js';
import Channel from '../models/Channel.js';
import SlackToken from '../models/SlackToken.js';
import { getMessageSentiment } from './sentimentService.js';
import jwt from 'jsonwebtoken';

// Lazily initialize Slack OAuth installer at runtime to avoid import-time env issues
let installer = null;
const ensureInstaller = () => {
  if (installer) return installer;
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const stateSecret = process.env.SLACK_STATE_SECRET || 'my-state-secret';
  if (!clientId || !clientSecret) {
    throw new Error('Slack OAuth not configured. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET.');
  }
  installer = new InstallProvider({ clientId, clientSecret, stateSecret });
  return installer;
};

// Direct code exchange (avoids state/cookie coupling issues)
const exchangeCodeForTokens = async (code, redirectUri) => {
  const client_id = process.env.SLACK_CLIENT_ID;
  const client_secret = process.env.SLACK_CLIENT_SECRET;
  const body = new URLSearchParams({ code, client_id, client_secret, redirect_uri: redirectUri });
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const json = await response.json();
  if (!json.ok) {
    throw new Error(`Slack oauth.v2.access failed: ${json.error || 'unknown_error'}`);
  }
  return json;
};

/**
 * Get Slack OAuth installation URL
 * @param {string} userId - User ID for state tracking
 * @returns {string} - OAuth URL
 */
export const getOAuthUrl = async (userId) => {
  const oauth = ensureInstaller();
  
  // Create state parameter with userId for OAuth callback
  const stateData = { userId };
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
  
  const url = await oauth.generateInstallUrl({
    // Bot Token Scopes only; remove invalid scopes like 'chat:read'
    scopes: [
      'channels:read',
      'channels:history',
      'groups:read',
      'groups:history',
      'reactions:read',
      'users:read'
    ],
    // Pass userId in state parameter for OAuth callback
    state: state,
    redirectUri: process.env.SLACK_REDIRECT_URI
  });
  return url;
};

/**
 * Handle OAuth callback and store tokens
 * @param {object} installOptions - OAuth callback data
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Installation result
 */
// Use OAuth V2 token exchange explicitly and persist
export const handleOAuthCallback = async (installOptions, userId) => {
  try {
    const { code, redirectUri } = installOptions;
    if (!code) throw new Error('Missing code');
    const tokenResp = await exchangeCodeForTokens(code, redirectUri);
    // tokenResp contains access_token (user token), team, authed_user, and bot (deprecated) or enterprise
    const tokenData = {
      user_id: userId,
      team_id: tokenResp.team?.id || tokenResp.team_id || '',
      access_token: tokenResp.access_token || tokenResp.authed_user?.access_token || '',
      bot_token: tokenResp.bot_token || tokenResp.access_token || '',
      team_name: tokenResp.team?.name || '',
      is_active: true,
    };
    await SlackToken.findOneAndUpdate(
      { user_id: userId },
      tokenData,
      { upsert: true, new: true }
    );
    return { success: true };
  } catch (error) {
    console.error('OAuth callback error:', error);
    throw error;
  }
};

/**
 * Get Slack client for a user
 * @param {string} userId - User ID
 * @returns {Promise<WebClient>} - Slack WebClient instance
 */
export const getSlackClient = async (userId) => {
  const tokenData = await SlackToken.findOne({ user_id: userId, is_active: true });
  if (!tokenData) {
    throw new Error('No active Slack integration found for user');
  }

  return new WebClient(tokenData.bot_token);
};

/**
 * Get list of channels for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of channel objects
 */
export const getChannels = async (userId) => {
  try {
    const slack = await getSlackClient(userId);
    const result = await slack.conversations.list({
      types: 'public_channel,private_channel',
      exclude_archived: true
    });

    return result.channels.map(channel => ({
      id: channel.id,
      name: channel.name,
      is_private: channel.is_private,
      num_members: channel.num_members
    }));
  } catch (error) {
    console.error('Error fetching channels:', error);
    throw error;
  }
};

/**
 * Configure channels for monitoring
 * @param {string} userId - User ID
 * @param {Array} channelIds - Array of channel IDs to monitor
 * @returns {Promise<Array>} - Array of configured channels
 */
export const configureChannels = async (userId, channelIds) => {
  try {
    const slack = await getSlackClient(userId);
    const tokenData = await SlackToken.findOne({ user_id: userId });
    
    const configuredChannels = [];
    
    for (const channelId of channelIds) {
      try {
        // Get channel info
        const channelInfo = await slack.conversations.info({ channel: channelId });
        
        // Create or update channel configuration
        const channelData = {
          channel_id: channelId,
          channel_name: channelInfo.channel.name,
          team_id: tokenData.team_id,
          configured_by: userId,
          is_active: true
        };

        const channel = await Channel.findOneAndUpdate(
          { channel_id: channelId },
          channelData,
          { upsert: true, new: true }
        );

        configuredChannels.push(channel);
      } catch (error) {
        console.error(`Error configuring channel ${channelId}:`, error);
      }
    }

    return configuredChannels;
  } catch (error) {
    console.error('Error configuring channels:', error);
    throw error;
  }
};

/**
 * Fetch messages from a Slack channel
 * @param {string} userId - User ID
 * @param {string} channelId - Channel ID
 * @param {Date} since - Fetch messages since this date
 * @returns {Promise<Array>} - Array of messages
 */
export const fetchChannelMessages = async (userId, channelId, since = null) => {
  try {
    const slack = await getSlackClient(userId);
    
    // Calculate oldest timestamp (24 hours ago if no since date provided)
    // Subtract 1 second to include messages at the since timestamp
    const oldest = since ? (since.getTime() / 1000) - 1 : (Date.now() - 24 * 60 * 60 * 1000) / 1000;
    
    console.log(`Fetching messages for channel ${channelId} since ${new Date(oldest * 1000).toISOString()} (oldest: ${oldest})`);
    
    const result = await slack.conversations.history({
      channel: channelId,
      oldest: oldest.toString(),
      limit: 1000
    });

    const messages = [];
    
    for (const message of result.messages) {
      if (message.type !== 'message' || message.subtype) continue;
      
      // Get reactions if any
      const reactions = message.reactions ? message.reactions.map(reaction => ({
        emoji: reaction.name,
        count: reaction.count
      })) : [];

      // Analyze sentiment
      const sentimentAnalysis = getMessageSentiment(message.text || '', reactions);

      const messageData = {
        message_id: message.ts,
        channel_id: channelId,
        author_id: message.user,
        timestamp: new Date(parseFloat(message.ts) * 1000),
        text: message.text || '',
        reactions: reactions,
        sentiment_score: sentimentAnalysis.combinedScore,
        processed: true
      };

      messages.push(messageData);
    }

    return messages;
  } catch (error) {
    console.error(`Error fetching messages from channel ${channelId}:`, error);
    throw error;
  }
};

/**
 * Store messages in database
 * @param {Array} messages - Array of message objects
 * @returns {Promise<number>} - Number of messages stored
 */
export const storeMessages = async (messages) => {
  try {
    let storedCount = 0;
    let updatedCount = 0;
    
    console.log(`Attempting to store ${messages.length} messages`);
    
    for (const messageData of messages) {
      try {
        const result = await Message.findOneAndUpdate(
          { message_id: messageData.message_id },
          messageData,
          { upsert: true, new: true }
        );
        
        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          storedCount++; // New message
          console.log(`Stored new message: ${messageData.message_id} at ${messageData.timestamp}`);
        } else {
          updatedCount++; // Updated existing message
          console.log(`Updated existing message: ${messageData.message_id}`);
        }
      } catch (error) {
        console.error(`Error storing message ${messageData.message_id}:`, error);
      }
    }

    console.log(`Store result: ${storedCount} new, ${updatedCount} updated`);
    return storedCount + updatedCount;
  } catch (error) {
    console.error('Error storing messages:', error);
    throw error;
  }
};

/**
 * Sync messages for all configured channels
 * @returns {Promise<object>} - Sync results
 */
export const syncAllChannels = async (fullSync = false) => {
  try {
    const channels = await Channel.find({ is_active: true }).populate('configured_by');
    const results = { success: 0, failed: 0, totalMessages: 0 };

    for (const channel of channels) {
      try {
        console.log(`Syncing channel: ${channel.channel_name} (${fullSync ? 'FULL SYNC' : 'INCREMENTAL'})`);
        
        // For full sync, start from the beginning (no since date)
        // For incremental sync, get last sync time or default to 24 hours ago
        const since = fullSync ? null : (channel.last_message_timestamp || new Date(Date.now() - 24 * 60 * 60 * 1000));
        console.log(`Channel ${channel.channel_name} sync since: ${since ? since.toISOString() : 'BEGINNING OF TIME'}`);
        
        const messages = await fetchChannelMessages(
          channel.configured_by._id,
          channel.channel_id,
          since
        );

        const storedCount = await storeMessages(messages);
        results.totalMessages += storedCount;

        // Update last sync timestamp
        if (messages.length > 0) {
          const latestTimestamp = Math.max(...messages.map(msg => msg.timestamp.getTime()));
          const newLastSync = new Date(latestTimestamp);
          console.log(`Updating last sync timestamp from ${since ? since.toISOString() : 'NONE'} to ${newLastSync.toISOString()}`);
          await Channel.findByIdAndUpdate(channel._id, {
            last_message_timestamp: newLastSync
          });
        }

        results.success++;
        console.log(`Synced ${storedCount} messages from ${channel.channel_name}`);
      } catch (error) {
        console.error(`Failed to sync channel ${channel.channel_name}:`, error);
        results.failed++;
      }
    }

    return results;
  } catch (error) {
    console.error('Error in syncAllChannels:', error);
    throw error;
  }
};

/**
 * Get user's configured channels
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of configured channels
 */
export const getUserChannels = async (userId) => {
  try {
    const channels = await Channel.find({ configured_by: userId, is_active: true });
    return channels;
  } catch (error) {
    console.error('Error getting user channels:', error);
    throw error;
  }
};

/**
 * Remove channel from monitoring
 * @param {string} userId - User ID
 * @param {string} channelId - Channel ID
 * @returns {Promise<boolean>} - Success status
 */
export const removeChannel = async (userId, channelId) => {
  try {
    const result = await Channel.findOneAndUpdate(
      { channel_id: channelId, configured_by: userId },
      { is_active: false },
      { new: true }
    );

    return !!result;
  } catch (error) {
    console.error('Error removing channel:', error);
    throw error;
  }
};

export default {
  getOAuthUrl,
  handleOAuthCallback,
  getSlackClient,
  getChannels,
  configureChannels,
  fetchChannelMessages,
  storeMessages,
  syncAllChannels,
  getUserChannels,
  removeChannel
};
