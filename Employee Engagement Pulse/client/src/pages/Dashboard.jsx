import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import SentimentChart from '../components/SentimentChart';
import ChannelBreakdown from '../components/ChannelBreakdown';
import WeeklySummary from '../components/WeeklySummary';
import SlackIntegration from '../components/SlackIntegration';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [channelData, setChannelData] = useState(null);
  const [overviewData, setOverviewData] = useState(null);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(null);

  useEffect(() => {
    loadUserAndDashboard();
  }, []);

  const loadUserAndDashboard = async () => {
    try {
      // Load user data
      const { data: userData } = await api.get('/api/auth/me');
      setUser(userData);

      // Load dashboard data
      await loadDashboardData();
    } catch (err) {
      console.error('Error loading data:', err);
      if (err.response?.status === 401) {
        navigate('/');
      } else {
        setError('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setError(null);
      
      const [overviewRes, weeklyRes, trendRes, channelsRes] = await Promise.all([
        api.get('/api/dashboard/overview'),
        api.get('/api/dashboard/weekly'),
        api.get('/api/dashboard/trend?weeks=4'),
        api.get('/api/dashboard/channels')
      ]);

      setOverviewData(overviewRes.data);
      setDashboardData(weeklyRes.data);
      setTrendData(trendRes.data.trend);
      setChannelData(channelsRes.data.channels);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      if (err.response?.status === 400) {
        setError('Please connect to Slack first to view dashboard data');
      } else {
        setError('Failed to load dashboard data');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch { /* empty */ }
    navigate('/');
  };

  const handleSlackConnected = () => {
    setError(null);
    loadDashboardData();
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSyncSuccess(null);
      
      // Perform full sync
      const response = await api.post('/api/slack/sync/full');
      
      // Process aggregations immediately after full sync
      try {
        await api.post('/api/slack/aggregate/force-all');
        await api.post('/api/slack/aggregate/weekly/current');
      } catch (aggregationError) {
        console.error('Error processing aggregations:', aggregationError);
      }
      
      // Refresh dashboard data
      await loadDashboardData();
      
      setSyncSuccess(`Sync completed! ${response.data.results.totalMessages} messages processed and dashboard refreshed.`);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSyncSuccess(null), 5000);
      
    } catch (err) {
      console.error('Error during sync:', err);
      setError('Failed to sync data. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error && error.includes('Slack')) {
    return (
      <div className="container">
        <div className="topbar">
          <h1>Employee Engagement Pulse</h1>
          <div className="topbar-right">
            <span>Welcome, {user?.firstName}</span>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
        <div className="slack-setup">
          <SlackIntegration onConnected={handleSlackConnected} />
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="topbar">
        <h1>Employee Engagement Pulse</h1>
        <div className="topbar-right">
          <span>Welcome, {user?.firstName}</span>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {syncSuccess && (
        <div className="success-message">
          {syncSuccess}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="tab-navigation">
        <div className="tab-buttons">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            Trends
          </button>
          <button 
            className={`tab ${activeTab === 'channels' ? 'active' : ''}`}
            onClick={() => setActiveTab('channels')}
          >
            Channels
          </button>
          <button 
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleSync}
          disabled={syncing || loading}
          title="Sync all messages and refresh dashboard"
        >
          {syncing ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {overviewData && (
              <div className="overview-stats">
                <div className="stat-card">
                  <h3>Current Sentiment</h3>
                  <div className={`sentiment-score ${getSentimentClass(overviewData.current_sentiment)}`}>
                    {(overviewData.current_sentiment || 0).toFixed(2)}
                  </div>
                  <div className="sentiment-change">
                    {overviewData.sentiment_change > 0 ? '↗' : overviewData.sentiment_change < 0 ? '↘' : '→'} 
                    {Math.abs(overviewData.sentiment_change || 0).toFixed(2)} from last week
                  </div>
                </div>
                
                <div className="stat-card">
                  <h3>Trend</h3>
                  <div className={`trend ${overviewData.trend}`}>
                    {overviewData.trend || 'stable'}
                  </div>
                </div>
                
                <div className="stat-card">
                  <h3>Burnout Risk</h3>
                  <div className={`risk-indicator ${overviewData.burnout_risk ? 'high' : 'low'}`}>
                    {overviewData.burnout_risk ? 'HIGH' : 'LOW'}
                  </div>
                </div>
                
                <div className="stat-card">
                  <h3>Channels Monitored</h3>
                  <div className="metric-value">
                    {overviewData.channels_monitored || 0}
                  </div>
                </div>
                
                <div className="stat-card">
                  <h3>Messages This Week</h3>
                  <div className="metric-value">
                    {overviewData.total_messages_this_week || 0}
                  </div>
                </div>
              </div>
            )}
            
            {dashboardData && (
              <WeeklySummary data={dashboardData} />
            )}
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="trends-tab">
            {trendData && (
              <SentimentChart data={trendData} />
            )}
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="channels-tab">
            {channelData && (
              <ChannelBreakdown data={channelData} />
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-tab">
            <SlackIntegration onConnected={handleSlackConnected} />
          </div>
        )}
      </div>
    </div>
  );
}

function getSentimentClass(score) {
  if (score > 0.1) return 'positive';
  if (score < -0.1) return 'negative';
  return 'neutral';
}

