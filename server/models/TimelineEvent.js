const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TimelineEventSchema = new Schema({
  eventName: {
    type: String,
    required: true,
    trim: true,
  },
  dateString: { // Flexible date representation (e.g., "Year 512", "10th Sun's Dawn, Year 2")
    type: String,
    required: true,
    trim: true,
  },
  description: { // Optional longer description (could be markdown later)
    type: String,
    trim: true,
  },
  article: { // Optional link to a wiki article detailing the event
    type: Schema.Types.ObjectId,
    ref: 'Article',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Add user association later
  // user: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'User',
  //   required: true,
  // }
});

module.exports = mongoose.model('TimelineEvent', TimelineEventSchema); 