import { Router } from 'express';
import authenticateUser from '../middleware/auth.js';
import WeeklySummary from '../models/WeeklySummary.js';
import DailyAggregate from '../models/DailyAggregate.js';
import Channel from '../models/Channel.js';
import SlackToken from '../models/SlackToken.js';
import aggregationService from '../services/aggregationService.js';
const { aggregateWeeklySentiment, getWeekStart, formatDate } = aggregationService;

const router = Router();

// Get weekly dashboard data
router.get('/weekly', authenticateUser, async (req, res) => {
  try {
    const { team_id } = req.query;
    
    // If no team_id provided, try to get it from user's Slack integration
    let teamId = team_id;
    if (!teamId) {
      const slackToken = await SlackToken.findOne({ user_id: req.user._id });
      if (slackToken) {
        teamId = slackToken.team_id;
      }
    }
    
    // If still no team_id, try to find any available team with data
    if (!teamId) {
      const availableTeam = await WeeklySummary.findOne().sort({ week_start: -1 });
      if (availableTeam) {
        teamId = availableTeam.team_id;
        console.log(`Using available team_id: ${teamId} for user: ${req.user._id}`);
      } else {
        return res.status(404).json({ 
          message: 'No data available. Please run a full sync to populate the dashboard.' 
        });
      }
    }

    // Get current week (or use the week that has data)
    const now = new Date();
    let weekStart = getWeekStart(now);
    
    // If no data for current week, try to find a week that has data
    const availableWeek = await WeeklySummary.findOne().sort({ week_start: -1 });
    if (availableWeek) {
      weekStart = availableWeek.week_start;
      console.log(`Using available week: ${weekStart} instead of current week: ${getWeekStart(now)}`);
    }

    // Try to get existing weekly summary
    let weeklySummary = await WeeklySummary.findOne({
      team_id: teamId,
      week_start: weekStart
    });

    // If no summary exists, generate it
    if (!weeklySummary) {
      weeklySummary = await aggregateWeeklySentiment(teamId, weekStart);
    }

    if (!weeklySummary) {
      return res.status(404).json({ 
        message: 'No weekly data available. Please run a full sync to populate the dashboard.' 
      });
    }

    res.json({
      week_start: weeklySummary.week_start,
      avg_sentiment: weeklySummary.avg_sentiment,
      trend: weeklySummary.trend,
      burnout_risk: weeklySummary.burnout_risk,
      top_themes: weeklySummary.top_themes,
      channel_summaries: weeklySummary.channel_summaries,
      recommendations: weeklySummary.recommendations
    });
  } catch (error) {
    console.error('Error fetching weekly dashboard:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// Get daily sentiment trend for the past weeks
router.get('/trend', authenticateUser, async (req, res) => {
  try {
    const { team_id, weeks = 4 } = req.query;
    
    // Get team_id from user's Slack integration if not provided
    let teamId = team_id;
    if (!teamId) {
      const slackToken = await SlackToken.findOne({ user_id: req.user._id });
      if (slackToken) {
        teamId = slackToken.team_id;
      }
    }
    
    // If still no team_id, try to find any available team with data
    if (!teamId) {
      const availableTeam = await DailyAggregate.findOne().sort({ date: -1 });
      if (availableTeam) {
        teamId = availableTeam.team_id;
        console.log(`Using available team_id: ${teamId} for trend data`);
      } else {
        return res.status(404).json({ 
          message: 'No trend data available. Please run a full sync to populate the dashboard.' 
        });
      }
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));

    const dailyAggregates = await DailyAggregate.find({
      team_id: teamId,
      date: {
        $gte: formatDate(startDate),
        $lte: formatDate(endDate)
      }
    }).sort({ date: 1 });

    // Group by date and calculate average sentiment across all channels
    const trendData = {};
    dailyAggregates.forEach(agg => {
      if (!trendData[agg.date]) {
        trendData[agg.date] = { totalSentiment: 0, totalMessages: 0, count: 0 };
      }
      trendData[agg.date].totalSentiment += agg.avg_sentiment * agg.message_count;
      trendData[agg.date].totalMessages += agg.message_count;
      trendData[agg.date].count++;
    });

    const trend = Object.entries(trendData).map(([date, data]) => ({
      date,
      avg_sentiment: data.totalMessages > 0 ? data.totalSentiment / data.totalMessages : 0,
      message_count: data.totalMessages
    }));

    res.json({ trend });
  } catch (error) {
    console.error('Error fetching sentiment trend:', error);
    res.status(500).json({ message: 'Failed to fetch trend data' });
  }
});

// Get channel breakdown
router.get('/channels', authenticateUser, async (req, res) => {
  try {
    const { team_id } = req.query;
    
    // Get team_id from user's Slack integration if not provided
    let teamId = team_id;
    if (!teamId) {
      const slackToken = await SlackToken.findOne({ user_id: req.user._id });
      if (slackToken) {
        teamId = slackToken.team_id;
      }
    }
    
    // If still no team_id, try to find any available team with data
    if (!teamId) {
      const availableTeam = await DailyAggregate.findOne().sort({ date: -1 });
      if (availableTeam) {
        teamId = availableTeam.team_id;
        console.log(`Using available team_id: ${teamId} for channel data`);
      } else {
        return res.status(404).json({ 
          message: 'No channel data available. Please run a full sync to populate the dashboard.' 
        });
      }
    }

    // Get current week's data
    const weekStart = getWeekStart(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const channelData = await DailyAggregate.aggregate([
      {
        $match: {
          team_id: teamId,
          date: {
            $gte: weekStart,
            $lt: formatDate(weekEnd)
          }
        }
      },
      {
        $group: {
          _id: '$channel_id',
          avg_sentiment: { $avg: '$avg_sentiment' },
          total_messages: { $sum: '$message_count' },
          positive_messages: { $sum: '$positive_count' },
          negative_messages: { $sum: '$negative_count' },
          neutral_messages: { $sum: '$neutral_count' }
        }
      },
      {
        $sort: { total_messages: -1 }
      }
    ]);

    // Enrich with channel names
    const enrichedData = [];
    for (const data of channelData) {
      const channel = await Channel.findOne({ channel_id: data._id });
      if (channel) {
        enrichedData.push({
          channel_id: data._id,
          channel_name: channel.channel_name,
          avg_sentiment: data.avg_sentiment,
          total_messages: data.total_messages,
          positive_messages: data.positive_messages,
          negative_messages: data.negative_messages,
          neutral_messages: data.neutral_messages,
          sentiment_distribution: {
            positive: Math.round((data.positive_messages / data.total_messages) * 100),
            negative: Math.round((data.negative_messages / data.total_messages) * 100),
            neutral: Math.round((data.neutral_messages / data.total_messages) * 100)
          }
        });
      }
    }

    res.json({ channels: enrichedData });
  } catch (error) {
    console.error('Error fetching channel breakdown:', error);
    res.status(500).json({ message: 'Failed to fetch channel data' });
  }
});

// Get team overview stats
router.get('/overview', authenticateUser, async (req, res) => {
  try {
    const { team_id } = req.query;
    
    // Get team_id from user's Slack integration if not provided
    let teamId = team_id;
    if (!teamId) {
      const slackToken = await SlackToken.findOne({ user_id: req.user._id });
      if (slackToken) {
        teamId = slackToken.team_id;
      }
    }
    
    // If still no team_id, try to find any available team with data
    if (!teamId) {
      const availableTeam = await WeeklySummary.findOne().sort({ week_start: -1 });
      if (availableTeam) {
        teamId = availableTeam.team_id;
        console.log(`Using available team_id: ${teamId} for overview data`);
      } else {
        return res.status(404).json({ 
          message: 'No overview data available. Please run a full sync to populate the dashboard.' 
        });
      }
    }

    // Get current week
    const weekStart = getWeekStart(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Get configured channels count
    const channelCount = await Channel.countDocuments({ team_id: teamId, is_active: true });

    // Get current week's summary
    const currentWeek = await WeeklySummary.findOne({
      team_id: teamId,
      week_start: weekStart
    });

    // Get previous week for comparison
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const previousWeek = await WeeklySummary.findOne({
      team_id: teamId,
      week_start: formatDate(prevWeekStart)
    });

    // Calculate week-over-week change
    let sentimentChange = 0;
    if (currentWeek && previousWeek) {
      sentimentChange = currentWeek.avg_sentiment - previousWeek.avg_sentiment;
    }

    // Get total messages this week
    const weeklyMessages = await DailyAggregate.aggregate([
      {
        $match: {
          team_id: teamId,
          date: {
            $gte: weekStart,
            $lt: formatDate(weekEnd)
          }
        }
      },
      {
        $group: {
          _id: null,
          total_messages: { $sum: '$message_count' }
        }
      }
    ]);

    const totalMessages = weeklyMessages.length > 0 ? weeklyMessages[0].total_messages : 0;

    res.json({
      channels_monitored: channelCount,
      current_sentiment: currentWeek ? currentWeek.avg_sentiment : 0,
      sentiment_change: sentimentChange,
      trend: currentWeek ? currentWeek.trend : 'stable',
      burnout_risk: currentWeek ? currentWeek.burnout_risk : false,
      total_messages_this_week: totalMessages,
      week_start: weekStart
    });
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({ message: 'Failed to fetch overview data' });
  }
});

export default router;
