import mongoose from 'mongoose';

const slackTokenSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  team_id: { 
    type: String, 
    required: true 
  },
  access_token: { 
    type: String, 
    required: true 
  },
  bot_token: { 
    type: String, 
    required: true 
  },
  team_name: { 
    type: String, 
    required: true 
  },
  is_active: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true 
});

// Index for efficient queries
slackTokenSchema.index({ team_id: 1 });
slackTokenSchema.index({ user_id: 1 });

const SlackToken = mongoose.model('SlackToken', slackTokenSchema);
export default SlackToken;

