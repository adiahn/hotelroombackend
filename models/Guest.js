import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  name: {
    type: String,
    required: [true, 'Guest name is required'],
    trim: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: [true, 'Agent ID is required']
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room ID is required']
  },
  checkInDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expectedCheckOutDate: {
    type: Date
  },
  checkedOut: {
    type: Boolean,
    default: false
  },
  checkedOutDate: {
    type: Date
  }
}, {
  timestamps: true
});

guestSchema.index({ userId: 1 });
guestSchema.index({ roomId: 1 });
guestSchema.index({ agentId: 1 });
guestSchema.index({ checkedOut: 1 });
guestSchema.index({ userId: 1, checkedOut: 1 });

export default mongoose.model('Guest', guestSchema);

