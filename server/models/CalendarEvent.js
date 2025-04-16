const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CalendarEventSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  startDate: {
    year: {
      type: Number,
      required: true
    },
    month: {
      type: Number,
      required: true
    },
    day: {
      type: Number,
      required: true
    }
  },
  endDate: {
    year: {
      type: Number
    },
    month: {
      type: Number
    },
    day: {
      type: Number
    }
  },
  isAllDay: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#4a6de5'
  },
  important: {
    type: Boolean,
    default: false
  },
  articleId: {
    type: Schema.Types.ObjectId,
    ref: 'Article'
  },
  world: {
    type: Schema.Types.ObjectId,
    ref: 'World',
    required: true
  },
  // Add user association later
  // user: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'User',
  //   required: true
  // }
}, { timestamps: true });

module.exports = mongoose.model('CalendarEvent', CalendarEventSchema); 