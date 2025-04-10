const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PinSchema = new Schema({
  x: {
    type: Number,
    required: true, 
  },
  y: {
    type: Number,
    required: true,
  },
  article: {
    type: Schema.Types.ObjectId,
    ref: 'Article', // Link to the Article model
    // required: true, // REMOVED - Link is now optional
  },
  // Pin customization fields
  icon: {
    type: String,
    default: null, // Default to null, potentially derive from article if not set?
  },
  iconId: {
    type: String,
    default: null, // Shared icon identifier
  },
  shape: {
    type: String,
    enum: ['pin', 'circle', 'square', 'arch', 'shield', 'flag', 'ribbon', 'chevron'],
    default: 'pin'
  },
  color: {
    type: String,
    default: '#dc3545' // Default red color
  },
  displayType: {
    type: String,
    enum: ['pin+icon', 'icon-only', 'hide-icon', 'pin'],
    default: 'pin+icon'
  }
}); // REMOVED , { _id: false } - Pins will now have their own _id

const MapSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  imageUrl: { // Stores the path/URL of the uploaded map image
    type: String,
    required: true,
  },
  pins: [PinSchema], // Array of pin objects
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

module.exports = mongoose.model('Map', MapSchema); 