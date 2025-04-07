const Map = require('../models/Map');
const Article = require('../models/Article'); // Needed for pin validation
const fs = require('fs');
const path = require('path');

// Placeholder functions - implement logic later

// Get all map metadata (title, id, maybe thumbnail URL later)
exports.getAllMaps = async (req, res) => {
  console.log("GET /api/maps called");
  res.status(501).json({ msg: 'Not Implemented' });
};

// Get single map details (including pins and associated article titles)
exports.getMapById = async (req, res) => {
  console.log(`GET /api/maps/${req.params.id} called`);
  res.status(501).json({ msg: 'Not Implemented' });
};

// Create a new map (handle image upload)
exports.createMap = async (req, res) => {
  // Check if file was uploaded by multer
  if (!req.file) {
    return res.status(400).json({ msg: 'Please upload a map image.' });
  }
  // Check if title was provided
  const { title } = req.body;
  if (!title) {
    // If title is missing, delete the uploaded file to avoid orphans
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error deleting orphaned map upload:", err);
    });
    return res.status(400).json({ msg: 'Please provide a map title.' });
  }

  try {
    // Construct the URL path for the image
    // Assumes uploads are served from /uploads/maps route
    const imageUrl = `/uploads/maps/${req.file.filename}`;

    const newMap = new Map({
      title,
      imageUrl,
      pins: [] // Initialize with empty pins
      // TODO: Add user ID req.user.id later when auth is implemented
    });

    const map = await newMap.save();
    res.status(201).json(map);

  } catch (err) {
    console.error("Error creating map:", err);
    // Attempt to delete uploaded file if DB save fails
    fs.unlink(req.file.path, (unlinkErr) => {
      if (unlinkErr) console.error("Error deleting file after DB error:", unlinkErr);
    });
    res.status(500).send('Server Error');
  }
};

// Update map pins
exports.updateMapPins = async (req, res) => {
  console.log(`PUT /api/maps/${req.params.id}/pins called`);
  res.status(501).json({ msg: 'Not Implemented' });
};

// Delete a map (including its image file)
exports.deleteMap = async (req, res) => {
  console.log(`DELETE /api/maps/${req.params.id} called`);
  res.status(501).json({ msg: 'Not Implemented' });
}; 