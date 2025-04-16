const mongoose = require('mongoose');

const calendarSettingsSchema = new mongoose.Schema({
  // Basic calendar structure
  name: {
    type: String,
    required: true,
    default: 'Custom Calendar'
  },
  description: {
    type: String,
    default: ''
  },
  
  // Days configuration
  dayNames: {
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  daysInWeek: {
    type: Number,
    min: 1,
    max: 20,
    default: 7
  },
  
  // Months configuration
  months: {
    type: [{
      name: { type: String, required: true },
      days: { type: Number, required: true, min: 1, max: 100 }
    }],
    default: [
      { name: 'January', days: 31 },
      { name: 'February', days: 28 },
      { name: 'March', days: 31 },
      { name: 'April', days: 30 },
      { name: 'May', days: 31 },
      { name: 'June', days: 30 },
      { name: 'July', days: 31 },
      { name: 'August', days: 31 },
      { name: 'September', days: 30 },
      { name: 'October', days: 31 },
      { name: 'November', days: 30 },
      { name: 'December', days: 31 }
    ]
  },
  
  // Year configuration
  yearPrefix: {
    type: String,
    default: ''
  },
  yearSuffix: {
    type: String,
    default: ''
  },
  startingYear: {
    type: Number,
    default: 1
  },
  
  // Other calendar features
  hasLeapYears: {
    type: Boolean,
    default: false
  },
  leapYearRule: {
    type: String,
    default: 'Every 4 years'
  },
  leapYearExtraDay: {
    type: Number, // Index of the month that gets the extra day
    default: 1 // February in the default calendar
  },
  
  // Appearance settings
  dateFormatString: {
    type: String,
    default: 'MMM D, YYYY'  // Format string for displaying dates
  },
  
  // Associated with a user/world
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const CalendarSettings = mongoose.model('CalendarSettings', calendarSettingsSchema);

module.exports = CalendarSettings; 