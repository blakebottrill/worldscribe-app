const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TimelineEventSchema = new Schema({
  title: { // Renamed from eventName
    type: String,
    required: true,
    trim: true,
  },
  startDate: { // Changed from dateString
    year: { type: Number, required: true },
    month: { type: Number, required: true }, // 0-indexed (like JS Date)
    day: { type: Number, required: true },
  },
  endDate: { // Changed type
    year: { type: Number, required: true },
    month: { type: Number, required: true }, // 0-indexed
    day: { type: Number, required: true },
  },
  description: { // Optional longer description (could be markdown later)
    type: String,
    trim: true,
  },
  article: { // Link to a wiki article
    type: Schema.Types.ObjectId,
    ref: 'Article',
  },
  isAllDay: { // Added for consistency with CalendarEvent
    type: Boolean,
    default: true
  },
  color: { // Added for consistency
    type: String,
    default: '#3a87ad' // Default timeline color
  },
  important: { // Added for consistency
    type: Boolean,
    default: false
  },
  // Add user association later
  // user: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'User',
  //   required: true,
  // }
}, { timestamps: true }); // Added timestamps

module.exports = mongoose.model('TimelineEvent', TimelineEventSchema); 