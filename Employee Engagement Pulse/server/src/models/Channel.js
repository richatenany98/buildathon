import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema({
  channel_id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  channel_name: { 
    type: String, 
    required: true 
  },
  team_id: { 
    type: String, 
    required: true 
  },
  configured_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  is_active: { 
    type: Boolean, 
    default: true 
  },
  last_message_timestamp: { 
    type: Date, 
    default: null 
  }
}, { 
  timestamps: true 
});

// Index for efficient queries
channelSchema.index({ team_id: 1, is_active: 1 });
channelSchema.index({ configured_by: 1 });

const Channel = mongoose.model('Channel', channelSchema);
export default Channel;

