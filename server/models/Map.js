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
    required: true,
  }
}, { _id: false }); // Don't create separate IDs for pins within the array

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