import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  personName: {
    type: String,
    required: [true, 'Person name is required'],
    trim: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room ID is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  cancelled: {
    type: Boolean,
    default: false
  },
  cancelledAt: {
    type: Date
  }
}, {
  timestamps: true
});

bookingSchema.index({ userId: 1 });
bookingSchema.index({ roomId: 1 });
bookingSchema.index({ startDate: 1, endDate: 1 });
bookingSchema.index({ cancelled: 1 });

bookingSchema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    const error = new Error('End date must be after start date');
    error.statusCode = 400;
    return next(error);
  }
  next();
});

bookingSchema.methods.isActive = function() {
  if (this.cancelled) return false;
  const now = new Date();
  return now >= this.startDate && now <= this.endDate;
};

bookingSchema.methods.isUpcoming = function() {
  if (this.cancelled) return false;
  const now = new Date();
  return this.startDate > now;
};

bookingSchema.methods.isPast = function() {
  if (this.cancelled) return false;
  const now = new Date();
  return this.endDate < now;
};

bookingSchema.methods.overlapsWith = function(startDate, endDate) {
  return this.startDate < endDate && this.endDate > startDate;
};

export default mongoose.model('Booking', bookingSchema);

