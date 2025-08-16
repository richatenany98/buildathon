# PRD: Employee Engagement Pulse

## 1. Executive Summary
Employee Engagement Pulse provides managers with a weekly sentiment dashboard built from Slack activity. The system continuously monitors a configurable set of Slack channels, including threads and reactions, and performs both text and emoji sentiment analysis. Daily mood is aggregated into weekly trends, highlighting potential burnout risks. Managers receive actionable insights at the team level to proactively address engagement issues.

## 2. Goals
- Integrate with Slack to monitor user-specified channels.
- Capture messages, threads, and reactions for analysis.
- Perform sentiment analysis on text and emojis.
- Aggregate daily sentiment into weekly dashboards.
- Identify burnout risks and generate actionable insights for managers.

## 3. Detailed Requirements
### Core Features
1. **Slack Channel Monitoring**
   - Allow managers to configure a list of Slack channels.
   - Continuously ingest messages, threads, and reactions.
   - Store metadata (author, timestamp, channel, message type).

2. **Sentiment Analysis**
   - Run text-based sentiment analysis (positive/negative/neutral, intensity scoring).
   - Analyze emoji reactions for sentiment contribution.
   - Assign sentiment scores at message-level.

3. **Aggregation & Trends**
   - Aggregate sentiment scores into daily averages per channel/team.
   - Compute weekly engagement trends and mood shifts.
   - Detect anomalies (sudden drops in sentiment).
   - Flag burnout risks (sustained negative trends).

4. **Manager Dashboard**
   - Present weekly summaries with charts (e.g., sentiment over time).
   - Highlight top positive/negative themes.
   - Provide burnout risk alerts.
   - Recommend potential actions (e.g., schedule 1:1s, run feedback survey).

### Edge Cases
- Channels with **low message volume** (insufficient data → flag low confidence).
- Sarcasm or mixed signals in text (misclassification risk).
- Over-reliance on emojis (messages with only reactions).
- Private channels or restricted access (system must handle permissions gracefully).
- Deleted messages or edits (ensure updates in analysis).

### Unit Test Cases
1. Add Slack channel → messages are ingested successfully.
2. Ingest messages with reactions → reactions included in sentiment analysis.
3. Analyze text “Great job!” → positive score returned.
4. Analyze text “This is terrible” → negative score returned.
5. Message with only 😡 → negative sentiment assigned.
6. Daily aggregation matches expected average sentiment.
7. Weekly trend correctly identifies drop in mood.
8. Burnout warning triggered after 5 days of sustained negative sentiment.
9. Dashboard displays correct data for configured channels only.
10. Deleted message → system updates sentiment calculation.

## 4. Technical Specs

### MongoDB Schema
```json
{
  "message_id": "UUID",
  "channel_id": "string",
  "author_id": "string",
  "timestamp": "datetime",
  "text": "string",
  "reactions": [
    { "emoji": "string", "count": "int" }
  ],
  "sentiment_score": "float",
  "daily_aggregate": {
    "date": "YYYY-MM-DD",
    "avg_sentiment": "float"
  },
  "weekly_summary": {
    "week_start": "YYYY-MM-DD",
    "avg_sentiment": "float",
    "burnout_risk": "boolean"
  }
}
```

### API Endpoints
#### 1. Configure Channels
- **POST** `/api/channels/configure`
- **Body:**
```json
{ "channels": ["channel_id_1", "channel_id_2"] }
```
- **Response:**
```json
{ "status": "success", "configured_channels": 2 }
```

#### 2. Get Weekly Dashboard
- **GET** `/api/dashboard/weekly?team_id={team_id}`
- **Response:**
```json
{
  "week_start": "2025-08-11",
  "avg_sentiment": 0.72,
  "trend": "downward",
  "burnout_risk": true,
  "top_themes": ["workload", "deadlines"]
}
```

### Auth & Security
- Token-based authentication for API calls.
- Example: `Authorization: Bearer MONGODB_AUTH_TOKEN={{secure_token_here}}`
- Use Slack OAuth2 for channel access.
- Ensure compliance with Slack’s privacy and data retention policies.
