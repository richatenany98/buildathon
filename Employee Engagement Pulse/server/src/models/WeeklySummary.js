import mongoose from 'mongoose';

const weeklySummarySchema = new mongoose.Schema({
  week_start: { 
    type: String, 
    required: true // Format: YYYY-MM-DD (Monday of the week)
  },
  team_id: { 
    type: String, 
    required: true 
  },
  avg_sentiment: { 
    type: Number, 
    required: true 
  },
  trend: { 
    type: String, 
    enum: ['upward', 'downward', 'stable'], 
    default: 'stable' 
  },
  burnout_risk: { 
    type: Boolean, 
    default: false 
  },
  top_themes: [{ 
    type: String 
  }],
  channel_summaries: [{
    channel_id: { type: String, required: true },
    channel_name: { type: String, required: true },
    avg_sentiment: { type: Number, required: true },
    message_count: { type: Number, required: true }
  }],
  recommendations: [{ 
    type: String 
  }]
}, { 
  timestamps: true 
});

// Compound unique index
weeklySummarySchema.index({ week_start: 1, team_id: 1 }, { unique: true });
weeklySummarySchema.index({ team_id: 1, week_start: -1 });

const WeeklySummary = mongoose.model('WeeklySummary', weeklySummarySchema);
export default WeeklySummary;

