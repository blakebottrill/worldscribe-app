const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String, // Markdown content
    // required: true // REMOVED: Body is no longer required
  },
  icon: {
    type: String,
    default: 'FaHome'  // Default icon
  },
  // Add iconId field that matches the one in the Pin schema
  iconId: {
    type: String,
    default: null,  // Shared icon identifier
  },
  tags: [{
    type: String,
    trim: true
  }],
  // Basic revision history (Simplified for MVP)
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
  // More complex revision history could be added later
});

// Middleware to update `updatedAt` field before saving
ArticleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Article', ArticleSchema); 