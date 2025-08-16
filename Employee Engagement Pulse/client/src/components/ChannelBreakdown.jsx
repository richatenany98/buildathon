import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function ChannelBreakdown({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="channel-breakdown">
        <h3>Channel Breakdown</h3>
        <div className="no-data">
          <p>No channel data available</p>
        </div>
      </div>
    );
  }

  // Sort channels by message count
  const sortedChannels = [...data].sort((a, b) => b.total_messages - a.total_messages);

  // Prepare data for sentiment chart
  const sentimentChartData = {
    labels: sortedChannels.map(channel => `#${channel.channel_name}`),
    datasets: [
      {
        label: 'Average Sentiment',
        data: sortedChannels.map(channel => channel.avg_sentiment),
        backgroundColor: sortedChannels.map(channel => {
          if (channel.avg_sentiment > 0.1) return 'rgba(75, 192, 192, 0.8)';
          if (channel.avg_sentiment < -0.1) return 'rgba(255, 99, 132, 0.8)';
          return 'rgba(255, 206, 86, 0.8)';
        }),
        borderColor: sortedChannels.map(channel => {
          if (channel.avg_sentiment > 0.1) return 'rgba(75, 192, 192, 1)';
          if (channel.avg_sentiment < -0.1) return 'rgba(255, 99, 132, 1)';
          return 'rgba(255, 206, 86, 1)';
        }),
        borderWidth: 1
      }
    ]
  };

  // Prepare data for message distribution
  const messageChartData = {
    labels: sortedChannels.map(channel => `#${channel.channel_name}`),
    datasets: [
      {
        label: 'Messages',
        data: sortedChannels.map(channel => channel.total_messages),
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            if (context.datasetIndex === 0 && context.chart.canvas.id === 'sentiment-chart') {
              const score = context.parsed.y;
              let sentiment = 'Neutral';
              if (score > 0.1) sentiment = 'Positive';
              else if (score < -0.1) sentiment = 'Negative';
              return `Sentiment: ${score.toFixed(3)} (${sentiment})`;
            }
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  return (
    <div className="channel-breakdown">
      <h3>Channel Analysis</h3>
      
      {/* Summary Statistics */}
      <div className="channel-stats">
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Total Channels:</span>
            <span className="stat-value">{data.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Messages:</span>
            <span className="stat-value">{data.reduce((sum, ch) => sum + ch.total_messages, 0)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Most Active:</span>
            <span className="stat-value">#{sortedChannels[0]?.channel_name}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg Sentiment:</span>
            <span className={`stat-value ${getSentimentClass(getOverallSentiment(data))}`}>
              {getOverallSentiment(data).toFixed(3)}
            </span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-container">
          <h4>Message Volume by Channel</h4>
          <div className="chart-wrapper">
            <Bar data={messageChartData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-container">
          <h4>Sentiment by Channel</h4>
          <div className="chart-wrapper">
            <Bar 
              id="sentiment-chart"
              data={sentimentChartData} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: {
                    display: false
                  }
                },
                scales: {
                  ...chartOptions.scales,
                  y: {
                    ...chartOptions.scales.y,
                    title: {
                      display: true,
                      text: 'Sentiment Score'
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Detailed Channel List */}
      <div className="channel-list">
        <h4>Channel Details</h4>
        <div className="channel-table">
          <div className="table-header">
            <div className="col-channel">Channel</div>
            <div className="col-messages">Messages</div>
            <div className="col-sentiment">Avg Sentiment</div>
            <div className="col-distribution">Sentiment Distribution</div>
          </div>
          {sortedChannels.map(channel => (
            <div key={channel.channel_id} className="table-row">
              <div className="col-channel">
                <span className="channel-name">#{channel.channel_name}</span>
              </div>
              <div className="col-messages">
                {channel.total_messages}
              </div>
              <div className="col-sentiment">
                <span className={`sentiment-score ${getSentimentClass(channel.avg_sentiment)}`}>
                  {channel.avg_sentiment.toFixed(3)}
                </span>
              </div>
              <div className="col-distribution">
                <div className="sentiment-bar">
                  <div 
                    className="sentiment-segment positive" 
                    style={{ width: `${channel.sentiment_distribution.positive}%` }}
                    title={`${channel.sentiment_distribution.positive}% Positive`}
                  ></div>
                  <div 
                    className="sentiment-segment neutral" 
                    style={{ width: `${channel.sentiment_distribution.neutral}%` }}
                    title={`${channel.sentiment_distribution.neutral}% Neutral`}
                  ></div>
                  <div 
                    className="sentiment-segment negative" 
                    style={{ width: `${channel.sentiment_distribution.negative}%` }}
                    title={`${channel.sentiment_distribution.negative}% Negative`}
                  ></div>
                </div>
                <div className="distribution-labels">
                  <span className="positive">{channel.sentiment_distribution.positive}%</span>
                  <span className="neutral">{channel.sentiment_distribution.neutral}%</span>
                  <span className="negative">{channel.sentiment_distribution.negative}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getSentimentClass(score) {
  if (score > 0.1) return 'positive';
  if (score < -0.1) return 'negative';
  return 'neutral';
}

function getOverallSentiment(channels) {
  const totalMessages = channels.reduce((sum, ch) => sum + ch.total_messages, 0);
  if (totalMessages === 0) return 0;
  
  const weightedSentiment = channels.reduce((sum, ch) => 
    sum + (ch.avg_sentiment * ch.total_messages), 0);
  
  return weightedSentiment / totalMessages;
}

