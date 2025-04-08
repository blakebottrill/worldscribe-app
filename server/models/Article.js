const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String, // Markdown content
    required: true
  },
  icon: {
    type: String,
    default: 'FaBook', // Default icon name (matches Wiki nav icon)
    trim: true
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