import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  number: {
    type: String,
    required: [true, 'Room number is required'],
    trim: true
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1']
  },
  occupiedBeds: {
    type: Number,
    default: 0,
    min: [0, 'Occupied beds cannot be negative']
  }
}, {
  timestamps: true
});

roomSchema.index({ userId: 1 });
roomSchema.index({ userId: 1, number: 1 }, { unique: true });

roomSchema.methods.hasAvailableBeds = function() {
  return this.occupiedBeds < this.capacity;
};

roomSchema.methods.getAvailableBeds = function() {
  return this.capacity - this.occupiedBeds;
};

export default mongoose.model('Room', roomSchema);

