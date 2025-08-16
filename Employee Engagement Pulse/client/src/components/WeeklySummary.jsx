export default function WeeklySummary({ data }) {
  if (!data) {
    return (
      <div className="weekly-summary">
        <h3>Weekly Summary</h3>
        <div className="no-data">
          <p>No weekly summary available</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const getWeekEndDate = (weekStart) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + 6);
    return date;
  };

  return (
    <div className="weekly-summary">
      <div className="summary-header">
        <h3>Weekly Summary</h3>
        <div className="week-range">
          {formatDate(data.week_start)} - {formatDate(getWeekEndDate(data.week_start))}
        </div>
      </div>

      <div className="summary-grid">
        {/* Main Metrics */}
        <div className="summary-card main-metrics">
          <h4>Key Metrics</h4>
          <div className="metrics-grid">
            <div className="metric">
              <span className="metric-label">Average Sentiment</span>
              <span className={`metric-value sentiment ${getSentimentClass(data.avg_sentiment)}`}>
                {data.avg_sentiment.toFixed(3)}
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Trend</span>
              <span className={`metric-value trend ${data.trend}`}>
                {getTrendIcon(data.trend)} {data.trend}
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Burnout Risk</span>
              <span className={`metric-value risk ${data.burnout_risk ? 'high' : 'low'}`}>
                {data.burnout_risk ? '⚠️ HIGH' : '✅ LOW'}
              </span>
            </div>
          </div>
        </div>

        {/* Top Themes */}
        {data.top_themes && data.top_themes.length > 0 && (
          <div className="summary-card themes">
            <h4>Top Themes</h4>
            <div className="themes-list">
              {data.top_themes.map((theme, index) => (
                <div key={theme} className="theme-item">
                  <span className="theme-rank">#{index + 1}</span>
                  <span className="theme-name">{theme}</span>
                  <span className="theme-icon">{getThemeIcon(theme)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Channel Performance */}
        {data.channel_summaries && data.channel_summaries.length > 0 && (
          <div className="summary-card channels">
            <h4>Channel Performance</h4>
            <div className="channels-list">
              {data.channel_summaries.slice(0, 5).map(channel => (
                <div key={channel.channel_id} className="channel-item">
                  <div className="channel-info">
                    <span className="channel-name">#{channel.channel_name}</span>
                    <span className="message-count">{channel.message_count} messages</span>
                  </div>
                  <div className={`channel-sentiment ${getSentimentClass(channel.avg_sentiment)}`}>
                    {channel.avg_sentiment.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {data.recommendations && data.recommendations.length > 0 && (
          <div className="summary-card recommendations">
            <h4>💡 Recommendations</h4>
            <div className="recommendations-list">
              {data.recommendations.map((recommendation, index) => (
                <div key={index} className="recommendation-item">
                  <span className="recommendation-icon">
                    {getRecommendationIcon(recommendation)}
                  </span>
                  <span className="recommendation-text">{recommendation}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {data.burnout_risk && (
        <div className="alert alert-warning">
          <div className="alert-icon">⚠️</div>
          <div className="alert-content">
            <h5>Burnout Risk Detected</h5>
            <p>Your team is showing signs of sustained negative sentiment. Consider taking immediate action to address potential burnout.</p>
          </div>
        </div>
      )}

      {data.trend === 'downward' && (
        <div className="alert alert-info">
          <div className="alert-icon">📉</div>
          <div className="alert-content">
            <h5>Declining Sentiment Trend</h5>
            <p>Team sentiment has been declining. This might be a good time for a team check-in or retrospective.</p>
          </div>
        </div>
      )}

      {data.avg_sentiment > 0.2 && data.trend === 'upward' && (
        <div className="alert alert-success">
          <div className="alert-icon">🎉</div>
          <div className="alert-content">
            <h5>Great Team Sentiment!</h5>
            <p>Your team is doing well with positive sentiment trending upward. Keep up the good work!</p>
          </div>
        </div>
      )}
    </div>
  );
}

function getSentimentClass(score) {
  if (score > 0.1) return 'positive';
  if (score < -0.1) return 'negative';
  return 'neutral';
}

function getTrendIcon(trend) {
  switch (trend) {
    case 'upward': return '📈';
    case 'downward': return '📉';
    case 'stable': return '➡️';
    default: return '➡️';
  }
}

function getThemeIcon(theme) {
  const icons = {
    'workload': '📊',
    'deadlines': '⏰',
    'collaboration': '🤝',
    'recognition': '🏆',
    'frustration': '😤',
    'communication': '💬',
    'progress': '✅',
    'planning': '📋'
  };
  return icons[theme] || '📌';
}

function getRecommendationIcon(recommendation) {
  if (recommendation.includes('burnout')) return '🚨';
  if (recommendation.includes('check-in') || recommendation.includes('1:1')) return '👥';
  if (recommendation.includes('retrospective')) return '🔄';
  if (recommendation.includes('workload')) return '⚖️';
  if (recommendation.includes('deadline')) return '📅';
  if (recommendation.includes('communication')) return '📞';
  if (recommendation.includes('bonding') || recommendation.includes('activities')) return '🎯';
  if (recommendation.includes('Great') || recommendation.includes('well')) return '🌟';
  return '💡';
}

