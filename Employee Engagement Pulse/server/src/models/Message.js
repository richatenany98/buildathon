import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  message_id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  channel_id: { 
    type: String, 
    required: true 
  },
  author_id: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    required: true 
  },
  text: { 
    type: String, 
    default: '' 
  },
  reactions: [{
    emoji: { type: String, required: true },
    count: { type: Number, required: true, default: 1 }
  }],
  sentiment_score: { 
    type: Number, 
    default: 0 
  },
  processed: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true 
});

// Index for efficient queries
messageSchema.index({ channel_id: 1, timestamp: -1 });
messageSchema.index({ timestamp: -1 });
messageSchema.index({ processed: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;

