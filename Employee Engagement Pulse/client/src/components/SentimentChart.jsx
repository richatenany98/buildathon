import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format, parseISO } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function SentimentChart({ data }) {
  const chartRef = useRef();

  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h3>Sentiment Trend</h3>
        <div className="no-data">
          <p>No sentiment data available</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data.map(item => format(parseISO(item.date), 'MMM dd')),
    datasets: [
      {
        label: 'Average Sentiment',
        data: data.map(item => item.avg_sentiment),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: data.map(item => {
          if (item.avg_sentiment > 0.1) return 'rgba(75, 192, 192, 1)';
          if (item.avg_sentiment < -0.1) return 'rgba(255, 99, 132, 1)';
          return 'rgba(255, 206, 86, 1)';
        }),
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Team Sentiment Trend Over Time',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const score = context.parsed.y;
            let sentiment = 'Neutral';
            if (score > 0.1) sentiment = 'Positive';
            else if (score < -0.1) sentiment = 'Negative';
            
            return `Sentiment: ${score.toFixed(3)} (${sentiment})`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value) {
            return value.toFixed(2);
          }
        },
        title: {
          display: true,
          text: 'Sentiment Score'
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        title: {
          display: true,
          text: 'Date'
        }
      }
    },
    elements: {
      point: {
        hoverRadius: 8
      }
    }
  };

  // Add reference lines for positive/negative thresholds
  const plugins = [
    {
      id: 'referenceLine',
      beforeDraw: (chart) => {
        const { ctx, chartArea: { top, bottom, left, right }, scales: { y } } = chart;
        
        // Positive threshold line
        const positiveY = y.getPixelForValue(0.1);
        if (positiveY >= top && positiveY <= bottom) {
          ctx.save();
          ctx.strokeStyle = 'rgba(75, 192, 192, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(left, positiveY);
          ctx.lineTo(right, positiveY);
          ctx.stroke();
          ctx.restore();
        }
        
        // Negative threshold line
        const negativeY = y.getPixelForValue(-0.1);
        if (negativeY >= top && negativeY <= bottom) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 99, 132, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(left, negativeY);
          ctx.lineTo(right, negativeY);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  ];

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>Sentiment Trend</h3>
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-color positive"></span>
            <span>Positive (&gt; 0.1)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color neutral"></span>
            <span>Neutral (-0.1 to 0.1)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color negative"></span>
            <span>Negative (&lt; -0.1)</span>
          </div>
        </div>
      </div>
      <div className="chart-wrapper">
        <Line ref={chartRef} data={chartData} options={options} plugins={plugins} />
      </div>
      <div className="chart-insights">
        <div className="insight-item">
          <strong>Average Sentiment:</strong> {(data.reduce((sum, item) => sum + item.avg_sentiment, 0) / data.length).toFixed(3)}
        </div>
        <div className="insight-item">
          <strong>Total Messages:</strong> {data.reduce((sum, item) => sum + item.message_count, 0)}
        </div>
        <div className="insight-item">
          <strong>Trend:</strong> {getTrend(data)}
        </div>
      </div>
    </div>
  );
}

function getTrend(data) {
  if (data.length < 2) return 'Insufficient data';
  
  const recent = data.slice(-7); // Last 7 days
  const earlier = data.slice(-14, -7); // Previous 7 days
  
  if (earlier.length === 0) return 'Insufficient data';
  
  const recentAvg = recent.reduce((sum, item) => sum + item.avg_sentiment, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, item) => sum + item.avg_sentiment, 0) / earlier.length;
  
  const diff = recentAvg - earlierAvg;
  
  if (diff > 0.05) return 'Improving ↗';
  if (diff < -0.05) return 'Declining ↘';
  return 'Stable →';
}

