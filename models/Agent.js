import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  name: {
    type: String,
    required: [true, 'Agent name is required'],
    trim: true
  }
}, {
  timestamps: true
});

agentSchema.index({ userId: 1 });

export default mongoose.model('Agent', agentSchema);

