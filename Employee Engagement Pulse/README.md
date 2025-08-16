# Employee Engagement Pulse

A comprehensive employee engagement monitoring system that analyzes Slack channel sentiment to provide managers with actionable insights into team morale and burnout risks.

## Features

- **Slack Integration**: Connect to Slack workspaces and monitor selected channels
- **Sentiment Analysis**: Real-time analysis of messages and emoji reactions
- **Weekly Dashboards**: Comprehensive sentiment trends and insights
- **Burnout Detection**: Automated alerts for sustained negative sentiment patterns
- **Theme Extraction**: Identification of common discussion topics and concerns
- **Interactive Charts**: Visual representation of sentiment trends over time
- **Channel Breakdown**: Per-channel sentiment analysis and comparison

## Architecture

### Backend (Node.js/Express)
- **Authentication**: JWT-based user authentication
- **Slack Integration**: OAuth 2.0 integration with Slack API
- **Sentiment Analysis**: Text and emoji sentiment processing
- **Data Aggregation**: Daily/weekly sentiment rollups
- **Scheduled Jobs**: Automated data sync and processing
- **MongoDB**: Document storage for messages, aggregates, and summaries

### Frontend (React)
- **Dashboard UI**: Interactive charts and visualizations
- **Slack Setup**: OAuth flow and channel configuration
- **Real-time Updates**: Live sentiment data and trends
- **Responsive Design**: Mobile-friendly interface

## Setup Instructions

### Prerequisites

1. **Node.js** (v18 or higher)
2. **MongoDB** (v5 or higher)
3. **Slack App** credentials

### 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name your app "Employee Engagement Pulse"
4. Select your workspace
5. Under "OAuth & Permissions":
   - Add redirect URL: `http://localhost:5001/api/slack/oauth/callback`
   - Add Bot Token Scopes:
     - `channels:read`
     - `channels:history`
     - `chat:read`
     - `reactions:read`
     - `users:read`
   - Add User Token Scopes:
     - `channels:read`
6. Note down your Client ID and Client Secret

### 2. Environment Setup

Create `.env` file in the `server` directory:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/employee-engagement-pulse

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Server Configuration
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Slack App Configuration
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_STATE_SECRET=your-slack-state-secret
SLACK_REDIRECT_URI=http://localhost:5001/api/slack/oauth/callback
```

### 3. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 4. Start MongoDB

Ensure MongoDB is running on your system:

```bash
# Using MongoDB service
sudo systemctl start mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 5. Run the Application

```bash
# Start the server (from server directory)
npm run dev

# Start the client (from client directory, in a new terminal)
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001

## Usage Guide

### 1. User Registration
1. Navigate to http://localhost:5173
2. Click "Sign up" to create an account
3. Fill in your details and create an account

### 2. Slack Integration
1. After logging in, you'll be prompted to connect to Slack
2. Click "Connect to Slack" and authorize the app
3. Select channels you want to monitor for sentiment analysis
4. Click "Add Selected Channels"

### 3. Dashboard Features

#### Overview Tab
- Current sentiment score and trend
- Burnout risk indicators
- Key metrics (channels monitored, messages processed)
- Weekly summary with insights and recommendations

#### Trends Tab
- Interactive sentiment chart over time
- Trend analysis and patterns
- Historical data visualization

#### Channels Tab
- Per-channel sentiment breakdown
- Message volume analysis
- Sentiment distribution charts

#### Settings Tab
- Manage Slack integration
- Add/remove channels
- Trigger manual sync

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Slack Integration
- `GET /api/slack/oauth/url` - Get OAuth URL
- `GET /api/slack/oauth/callback` - Handle OAuth callback
- `GET /api/slack/channels` - Get available channels
- `POST /api/slack/channels/configure` - Configure channels
- `GET /api/slack/channels/configured` - Get configured channels
- `DELETE /api/slack/channels/:id` - Remove channel
- `POST /api/slack/sync` - Manual sync trigger

### Dashboard
- `GET /api/dashboard/weekly` - Weekly sentiment summary
- `GET /api/dashboard/trend` - Sentiment trend data
- `GET /api/dashboard/channels` - Channel breakdown
- `GET /api/dashboard/overview` - Overview statistics

## Data Processing

### Sentiment Analysis
- **Text Analysis**: Uses `sentiment` library for natural language processing
- **Emoji Analysis**: Custom emoji-to-sentiment mapping
- **Combined Scoring**: Weighted combination of text and emoji sentiment

### Aggregation Schedule
- **Message Sync**: Every 15 minutes
- **Daily Aggregation**: Daily at 1 AM
- **Weekly Summaries**: Mondays at 2 AM

### Burnout Detection
- Monitors sustained negative sentiment (5+ days)
- Flags teams with 60%+ negative sentiment days
- Generates actionable recommendations

## Technical Stack

- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Frontend**: React, Chart.js, React Router
- **Authentication**: JWT tokens, HTTP-only cookies
- **Slack Integration**: Slack Web API, OAuth 2.0
- **Sentiment Analysis**: Sentiment.js, custom emoji mapping
- **Scheduling**: node-cron
- **Charts**: Chart.js, react-chartjs-2

## Development

### Project Structure
```
server/
├── src/
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── middleware/      # Auth middleware
│   └── index.js         # Server entry point
├── package.json
└── .env

client/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── api.js          # API client
│   └── App.jsx         # Main app
├── package.json
└── vite.config.js
```

### Adding New Features

1. **Backend**: Add routes in `routes/`, business logic in `services/`
2. **Frontend**: Create components in `components/`, pages in `pages/`
3. **Database**: Add models in `models/`
4. **Styling**: Update `App.css` for new styles

## Troubleshooting

### Common Issues

1. **Slack OAuth fails**
   - Check redirect URI matches exactly
   - Verify client ID/secret are correct
   - Ensure app has required scopes

2. **No sentiment data**
   - Verify channels are configured
   - Check if sync is running (every 15 minutes)
   - Ensure channels have recent messages

3. **Dashboard not loading**
   - Check if Slack integration is connected
   - Verify MongoDB is running
   - Check browser console for errors

### Database Reset

To reset the database for testing:

```bash
mongo employee-engagement-pulse --eval "db.dropDatabase()"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support or questions:
- Check the troubleshooting section
- Review API documentation
- Submit an issue on GitHub

