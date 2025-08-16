import Message from '../models/Message.js';
import DailyAggregate from '../models/DailyAggregate.js';
import WeeklySummary from '../models/WeeklySummary.js';
import Channel from '../models/Channel.js';
import { extractThemes, classifySentiment } from './sentimentService.js';

/**
 * Get date string in YYYY-MM-DD format
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * Get the Monday of the week for a given date
 * @param {Date} date - Date object
 * @returns {string} - Monday date in YYYY-MM-DD format
 */
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  return formatDate(d);
};

/**
 * Aggregate daily sentiment for a specific channel and date
 * @param {string} channelId - Channel ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<object>} - Aggregated data
 */
export const aggregateDailySentiment = async (channelId, date) => {
  try {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const messages = await Message.find({
      channel_id: channelId,
      timestamp: {
        $gte: startDate,
        $lt: endDate
      }
    });

    if (messages.length === 0) {
      return null;
    }

    // Get channel info for team_id
    const channel = await Channel.findOne({ channel_id: channelId });
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    // Calculate sentiment statistics
    const sentimentScores = messages.map(msg => msg.sentiment_score);
    const avgSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    sentimentScores.forEach(score => {
      const classification = classifySentiment(score);
      if (classification === 'positive') positiveCount++;
      else if (classification === 'negative') negativeCount++;
      else neutralCount++;
    });

    // Create or update daily aggregate
    const aggregateData = {
      date,
      channel_id: channelId,
      team_id: channel.team_id,
      avg_sentiment: avgSentiment,
      message_count: messages.length,
      positive_count: positiveCount,
      negative_count: negativeCount,
      neutral_count: neutralCount
    };

    const dailyAggregate = await DailyAggregate.findOneAndUpdate(
      { date, channel_id: channelId },
      aggregateData,
      { upsert: true, new: true }
    );

    return dailyAggregate;
  } catch (error) {
    console.error('Error aggregating daily sentiment:', error);
    throw error;
  }
};

/**
 * Aggregate weekly sentiment for a team
 * @param {string} teamId - Team ID
 * @param {string} weekStart - Week start date in YYYY-MM-DD format
 * @returns {Promise<object>} - Weekly summary
 */
export const aggregateWeeklySentiment = async (teamId, weekStart) => {
  try {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = formatDate(weekEnd);

    // Get all daily aggregates for the week
    const dailyAggregates = await DailyAggregate.find({
      team_id: teamId,
      date: {
        $gte: weekStart,
        $lt: weekEndStr
      }
    });

    if (dailyAggregates.length === 0) {
      return null;
    }

    // Calculate weekly average sentiment
    const totalSentiment = dailyAggregates.reduce((sum, agg) => 
      sum + (agg.avg_sentiment * agg.message_count), 0);
    const totalMessages = dailyAggregates.reduce((sum, agg) => sum + agg.message_count, 0);
    const avgSentiment = totalMessages > 0 ? totalSentiment / totalMessages : 0;

    // Calculate trend (compare with previous week or use daily trend if no previous week)
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekStartStr = formatDate(prevWeekStart);
    
    const prevWeekData = await WeeklySummary.findOne({
      team_id: teamId,
      week_start: prevWeekStartStr
    });

    let trend = 'stable';
    if (prevWeekData) {
      // Use week-over-week comparison if available
      const sentimentDiff = avgSentiment - prevWeekData.avg_sentiment;
      if (sentimentDiff > 0.1) trend = 'upward';
      else if (sentimentDiff < -0.1) trend = 'downward';
    } else {
      // Fallback to daily trend analysis within the current week
      trend = await calculateDailyTrend(teamId, weekStart, weekEndStr);
    }

    // Check for burnout risk (sustained negative sentiment)
    const burnoutRisk = await checkBurnoutRisk(teamId, weekStart);

    // Get channel summaries
    const channelSummaries = await getChannelSummaries(teamId, weekStart, weekEndStr);

    // Extract themes from messages
    const weekMessages = await Message.find({
      timestamp: {
        $gte: new Date(weekStart),
        $lt: weekEnd
      }
    }).populate({
      path: 'channel_id',
      match: { team_id: teamId }
    });

    const messageTexts = weekMessages
      .filter(msg => msg.channel_id && msg.text)
      .map(msg => msg.text);
    
    const topThemes = extractThemes(messageTexts);

    // Generate recommendations
    const recommendations = generateRecommendations(avgSentiment, trend, burnoutRisk, topThemes);

    // Create or update weekly summary
    const summaryData = {
      week_start: weekStart,
      team_id: teamId,
      avg_sentiment: avgSentiment,
      trend,
      burnout_risk: burnoutRisk,
      top_themes: topThemes,
      channel_summaries: channelSummaries,
      recommendations
    };

    const weeklySummary = await WeeklySummary.findOneAndUpdate(
      { week_start: weekStart, team_id: teamId },
      summaryData,
      { upsert: true, new: true }
    );

    return weeklySummary;
  } catch (error) {
    console.error('Error aggregating weekly sentiment:', error);
    throw error;
  }
};

/**
 * Check for burnout risk (sustained negative sentiment)
 * @param {string} teamId - Team ID
 * @param {string} weekStart - Week start date
 * @returns {Promise<boolean>} - Whether there's burnout risk
 */
const checkBurnoutRisk = async (teamId, weekStart) => {
  try {
    // Check last 5 days for sustained negative sentiment
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 7);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 5);

    const recentAggregates = await DailyAggregate.find({
      team_id: teamId,
      date: {
        $gte: formatDate(startDate),
        $lt: formatDate(endDate)
      }
    }).sort({ date: -1 });

    if (recentAggregates.length < 3) return false;

    // Check if majority of recent days have negative sentiment
    const negativeDays = recentAggregates.filter(agg => agg.avg_sentiment < -0.1).length;
    return negativeDays >= Math.ceil(recentAggregates.length * 0.6); // 60% of days
  } catch (error) {
    console.error('Error checking burnout risk:', error);
    return false;
  }
};

/**
 * Get channel summaries for the week
 * @param {string} teamId - Team ID
 * @param {string} weekStart - Week start date
 * @param {string} weekEnd - Week end date
 * @returns {Promise<Array>} - Channel summaries
 */
const getChannelSummaries = async (teamId, weekStart, weekEnd) => {
  try {
    const aggregates = await DailyAggregate.aggregate([
      {
        $match: {
          team_id: teamId,
          date: { $gte: weekStart, $lt: weekEnd }
        }
      },
      {
        $group: {
          _id: '$channel_id',
          avg_sentiment: { $avg: '$avg_sentiment' },
          total_messages: { $sum: '$message_count' }
        }
      }
    ]);

    const channelSummaries = [];
    for (const agg of aggregates) {
      const channel = await Channel.findOne({ channel_id: agg._id });
      if (channel) {
        channelSummaries.push({
          channel_id: agg._id,
          channel_name: channel.channel_name,
          avg_sentiment: agg.avg_sentiment,
          message_count: agg.total_messages
        });
      }
    }

    return channelSummaries.sort((a, b) => b.message_count - a.message_count);
  } catch (error) {
    console.error('Error getting channel summaries:', error);
    return [];
  }
};

/**
 * Calculate trend based on daily data within a time period
 * @param {string} teamId - Team ID
 * @param {Date} weekStart - Start of the week
 * @param {string} weekEndStr - End of the week (formatted string)
 * @returns {string} - 'upward', 'downward', or 'stable'
 */
const calculateDailyTrend = async (teamId, weekStart, weekEndStr) => {
  try {
    // First try to get daily aggregates for the current week
    const weekStartStr = weekStart instanceof Date ? formatDate(weekStart) : weekStart;
    let dailyAggregates = await DailyAggregate.find({
      team_id: teamId,
      date: {
        $gte: weekStartStr,
        $lt: weekEndStr
      }
    }).sort({ date: 1 });

    // If not enough data in current week, expand the search to last 14 days
    if (dailyAggregates.length < 3) {
      const extendedStart = new Date(weekStartStr);
      extendedStart.setDate(extendedStart.getDate() - 14);
      
      dailyAggregates = await DailyAggregate.find({
        team_id: teamId,
        date: {
          $gte: formatDate(extendedStart),
          $lt: weekEndStr
        }
      }).sort({ date: 1 });
    }

    if (dailyAggregates.length < 2) {
      return 'stable'; // Need at least 2 days to determine trend
    }

    // Calculate daily sentiment averages across all channels
    const dailySentiments = {};
    dailyAggregates.forEach(agg => {
      if (!dailySentiments[agg.date]) {
        dailySentiments[agg.date] = { totalSentiment: 0, totalMessages: 0 };
      }
      dailySentiments[agg.date].totalSentiment += agg.avg_sentiment * agg.message_count;
      dailySentiments[agg.date].totalMessages += agg.message_count;
    });

    // Convert to array of daily averages
    const sentimentTrend = Object.entries(dailySentiments)
      .map(([date, data]) => ({
        date,
        sentiment: data.totalMessages > 0 ? data.totalSentiment / data.totalMessages : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sentimentTrend.length < 2) {
      // Fallback: compare current week's sentiment with zero baseline
      const currentSentiment = sentimentTrend[0]?.sentiment || 0;
      if (currentSentiment > 0.1) return 'upward';
      if (currentSentiment < -0.1) return 'downward';
      return 'stable';
    }

    // For only 2 data points, use simple comparison
    if (sentimentTrend.length === 2) {
      const diff = sentimentTrend[1].sentiment - sentimentTrend[0].sentiment;
      if (diff > 0.05) return 'upward';
      if (diff < -0.05) return 'downward';
      return 'stable';
    }

    // Calculate linear trend using simple slope for 3+ data points
    const n = sentimentTrend.length;
    const xSum = sentimentTrend.reduce((sum, _, i) => sum + i, 0);
    const ySum = sentimentTrend.reduce((sum, point) => sum + point.sentiment, 0);
    const xySum = sentimentTrend.reduce((sum, point, i) => sum + i * point.sentiment, 0);
    const x2Sum = sentimentTrend.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    
    // Determine trend based on slope
    if (slope > 0.02) return 'upward';
    if (slope < -0.02) return 'downward';
    return 'stable';
    
  } catch (error) {
    console.error('Error calculating daily trend:', error);
    return 'stable';
  }
};

/**
 * Generate recommendations based on sentiment data
 * @param {number} avgSentiment - Average sentiment score
 * @param {string} trend - Sentiment trend
 * @param {boolean} burnoutRisk - Whether there's burnout risk
 * @param {Array} themes - Top themes
 * @returns {Array} - Array of recommendations
 */
const generateRecommendations = (avgSentiment, trend, burnoutRisk, themes) => {
  const recommendations = [];

  if (burnoutRisk) {
    recommendations.push('High burnout risk detected. Consider scheduling individual check-ins with team members.');
    recommendations.push('Review current workload distribution and deadlines.');
  }

  if (trend === 'downward') {
    recommendations.push('Team sentiment is declining. Consider holding a team retrospective.');
    recommendations.push('Schedule informal team bonding activities.');
  }

  if (avgSentiment < -0.2) {
    recommendations.push('Low team morale detected. Consider addressing underlying issues.');
  }

  if (themes.includes('workload')) {
    recommendations.push('Workload concerns identified. Review task distribution and priorities.');
  }

  if (themes.includes('deadlines')) {
    recommendations.push('Deadline pressure detected. Consider timeline adjustments or additional resources.');
  }

  if (themes.includes('communication')) {
    recommendations.push('Communication issues identified. Consider improving team communication processes.');
  }

  if (avgSentiment > 0.2 && trend === 'upward') {
    recommendations.push('Great team sentiment! Consider what\'s working well and replicate it.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Team sentiment appears stable. Continue monitoring trends.');
  }

  return recommendations;
};

/**
 * Process all pending daily aggregations
 * @returns {Promise<void>}
 */
export const processDailyAggregations = async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = formatDate(yesterday);

    // Get all active channels
    const channels = await Channel.find({ is_active: true });

    for (const channel of channels) {
      try {
        await aggregateDailySentiment(channel.channel_id, dateStr);
        console.log(`Processed daily aggregation for channel ${channel.channel_name} (${dateStr})`);
      } catch (error) {
        console.error(`Error processing daily aggregation for channel ${channel.channel_id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in processDailyAggregations:', error);
  }
};

/**
 * Process all pending weekly aggregations
 * @returns {Promise<void>}
 */
export const processWeeklyAggregations = async () => {
  try {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const weekStart = getWeekStart(lastWeek);

    // Get all unique team IDs
    const teams = await Channel.distinct('team_id', { is_active: true });

    for (const teamId of teams) {
      try {
        await aggregateWeeklySentiment(teamId, weekStart);
        console.log(`Processed weekly aggregation for team ${teamId} (${weekStart})`);
      } catch (error) {
        console.error(`Error processing weekly aggregation for team ${teamId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in processWeeklyAggregations:', error);
  }
};

/**
 * Process weekly aggregations for the current week
 * @returns {Promise<void>}
 */
export const processCurrentWeekAggregations = async () => {
  try {
    const currentWeek = new Date();
    const weekStart = getWeekStart(currentWeek);

    // Get all unique team IDs
    const teams = await Channel.distinct('team_id', { is_active: true });

    for (const teamId of teams) {
      try {
        await aggregateWeeklySentiment(teamId, weekStart);
        console.log(`Processed current week aggregation for team ${teamId} (${weekStart})`);
      } catch (error) {
        console.error(`Error processing current week aggregation for team ${teamId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in processCurrentWeekAggregations:', error);
  }
};

/**
 * Process daily aggregations for ALL messages (including unconfigured channels)
 * @returns {Promise<object>} - Processing results
 */
export const processDailyAggregationsForAllMessages = async () => {
  try {
    console.log('Starting daily aggregations for ALL messages...');
    
    // Get ALL messages regardless of date
    const messages = await Message.find({});
    
    console.log(`Found ${messages.length} total messages in database`);
    
    // Group messages by channel_id
    const channelGroups = {};
    messages.forEach(msg => {
      if (!channelGroups[msg.channel_id]) {
        channelGroups[msg.channel_id] = [];
      }
      channelGroups[msg.channel_id].push(msg);
    });
    
    console.log(`Messages grouped into ${Object.keys(channelGroups).length} channels`);
    
    let processedCount = 0;
    let failedCount = 0;
    
    // Process each channel group
    for (const [channelId, channelMessages] of Object.entries(channelGroups)) {
      try {
        // Check if channel exists in Channel collection
        let channel = await Channel.findOne({ channel_id: channelId });
        
        // If channel doesn't exist, create a basic record for aggregation
        if (!channel) {
          console.log(`Creating basic channel record for ${channelId}`);
          channel = new Channel({
            channel_id: channelId,
            channel_name: `channel-${channelId.substring(0, 8)}`,
            team_id: 'default-team', // We'll use a default team ID
            configured_by: null,
            is_active: true
          });
          await channel.save();
        }
        
        // Process each unique date for this channel
        const uniqueDates = [...new Set(channelMessages.map(msg => formatDate(msg.timestamp)))];
        console.log(`Processing ${uniqueDates.length} unique dates for channel ${channelId}`);
        
        for (const dateStr of uniqueDates) {
          const result = await aggregateDailySentiment(channelId, dateStr);
          if (result) {
            processedCount++;
            console.log(`Processed daily aggregate for channel: ${channel.channel_name} on ${dateStr} (${channelMessages.filter(msg => formatDate(msg.timestamp) === dateStr).length} messages)`);
          }
        }
      } catch (error) {
        console.error(`Failed to process daily aggregate for channel ${channelId}:`, error);
        failedCount++;
      }
    }
    
    console.log(`Daily aggregations for all messages completed: ${processedCount} processed, ${failedCount} failed`);
    return { processed: processedCount, failed: failedCount };
  } catch (error) {
    console.error('Error in processDailyAggregationsForAllMessages:', error);
    throw error;
  }
};

export default {
  aggregateDailySentiment,
  aggregateWeeklySentiment,
  processDailyAggregations,
  processDailyAggregationsForAllMessages,
  processWeeklyAggregations,
  processCurrentWeekAggregations,
  formatDate,
  getWeekStart
};

