import mongoose from 'mongoose';

const dailyAggregateSchema = new mongoose.Schema({
  date: { 
    type: String, 
    required: true // Format: YYYY-MM-DD
  },
  channel_id: { 
    type: String, 
    required: true 
  },
  team_id: { 
    type: String, 
    required: true 
  },
  avg_sentiment: { 
    type: Number, 
    required: true 
  },
  message_count: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  positive_count: { 
    type: Number, 
    default: 0 
  },
  negative_count: { 
    type: Number, 
    default: 0 
  },
  neutral_count: { 
    type: Number, 
    default: 0 
  }
}, { 
  timestamps: true 
});

// Compound unique index
dailyAggregateSchema.index({ date: 1, channel_id: 1 }, { unique: true });
dailyAggregateSchema.index({ team_id: 1, date: -1 });

const DailyAggregate = mongoose.model('DailyAggregate', dailyAggregateSchema);
export default DailyAggregate;

