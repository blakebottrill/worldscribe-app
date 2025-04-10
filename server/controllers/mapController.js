const Map = require('../models/Map');
const Article = require('../models/Article'); // Needed for pin validation
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Placeholder functions - implement logic later

// Get all map metadata (title, id, maybe thumbnail URL later)
exports.getAllMaps = async (req, res) => {
  try {
    // TODO: Add user filtering later: const maps = await Map.find({ user: req.user.id }).select('title imageUrl').sort({ createdAt: -1 });
    const maps = await Map.find().select('title imageUrl').sort({ createdAt: -1 });
    res.json(maps);
  } catch (err) {
    console.error("Error fetching maps:", err);
    res.status(500).send('Server Error');
  }
};

// Get single map details (including pins and associated article titles)
exports.getMapById = async (req, res) => {
  try {
    const map = await Map.findById(req.params.id).populate({
      path: 'pins.article',
      select: 'title icon iconId' // Include title, icon, and iconId from linked Article
    });

    if (!map) {
      return res.status(404).json({ msg: 'Map not found' });
    }

    // TODO: Check if user owns map req.user.id

    res.json(map);

  } catch (err) {
    console.error(`Error fetching map ${req.params.id}:`, err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Map not found' });
    }
    res.status(500).send('Server Error');
  }
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

// Update map pins - This seems to be for CREATING new pins based on frontend usage
exports.updateMapPins = async (req, res) => {
  const { x, y, articleId, icon, iconId, shape, color, displayType } = req.body;
  const mapId = req.params.id;

  if (typeof x !== 'number' || typeof y !== 'number') {
    return res.status(400).json({ msg: 'Invalid pin coordinates provided.' });
  }
  // articleId can be null/undefined

  try {
    const map = await Map.findById(mapId);
    if (!map) {
      return res.status(404).json({ msg: 'Map not found' });
    }

    // Validate Article ID if provided
    if (articleId) {
        if (!mongoose.Types.ObjectId.isValid(articleId)) {
             return res.status(400).json({ msg: 'Invalid Article ID format' });
        }
        const articleExists = await Article.findById(articleId).select('_id');
        if (!articleExists) {
             return res.status(404).json({ msg: `Article with ID ${articleId} not found` });
        }
    }

    // Create the new pin object
    const newPin = {
      x: x,
      y: y,
      article: articleId || null,
      icon: icon || null,      // Use provided icon or null
      iconId: iconId || null,  // Use provided iconId or null
      shape: shape || 'pin',
      color: color || '#dc3545',
      displayType: displayType || 'pin+icon'
    };

    map.pins.push(newPin);
    await map.save();

    // Find the newly added pin in the saved map (Mongoose adds _id)
    // The newly added pin will be the last one in the array
    const createdPin = map.pins[map.pins.length - 1];

    // Respond with the newly created pin data (including its generated _id)
    res.status(201).json(createdPin);

  } catch (err) {
    console.error(`Error creating pin for map ${mapId}:`, err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Map not found' });
    }
    res.status(500).send('Server Error');
  }
};

// Delete a map (including its image file)
exports.deleteMap = async (req, res) => {
  const mapId = req.params.id;
  try {
    const map = await Map.findById(mapId);

    if (!map) {
      return res.status(404).json({ msg: 'Map not found' });
    }

    // TODO: Check user ownership

    // Extract filename from imageUrl (e.g., /uploads/maps/filename.jpg -> filename.jpg)
    const filename = path.basename(map.imageUrl);
    const imagePath = path.join(__dirname, '../uploads/maps', filename);

    // Attempt to delete the image file
    fs.unlink(imagePath, (err) => {
      if (err && err.code !== 'ENOENT') { // Log error unless file just didn't exist
        console.error(`Error deleting map image file ${imagePath}:`, err);
        // Decide if you want to proceed with DB deletion even if file deletion fails
        // For now, we proceed but log the error.
      }
    });

    // Delete the map document from the database
    await Map.findByIdAndDelete(mapId);

    res.json({ msg: 'Map deleted successfully' });

  } catch (err) {
    console.error(`Error deleting map ${mapId}:`, err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Map not found' });
    }
    res.status(500).send('Server Error');
  }
};

// Delete a specific pin from a map
exports.deleteMapPin = async (req, res) => {
  const { mapId, pinId } = req.params;

  try {
    const map = await Map.findById(mapId);
    if (!map) {
      return res.status(404).json({ msg: 'Map not found' });
    }

    // TODO: Check user ownership

    // Check if the pin exists before attempting to remove
    const pinExists = map.pins.some(pin => pin._id.toString() === pinId);
    if (!pinExists) {
      return res.status(404).json({ msg: 'Pin not found on this map' });
    }

    // Use $pull to remove the pin with the matching _id
    map.pins.pull({ _id: pinId });

    // Save the map with the pin removed
    await map.save();

    res.json({ msg: 'Pin deleted successfully' });

  } catch (err) {
    console.error(`Error deleting pin ${pinId} from map ${mapId}:`, err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Map or Pin not found' });
    }
    res.status(500).send('Server Error');
  }
};

// Update a specific pin
exports.updateMapPin = async (req, res) => {
  const { mapId, pinId } = req.params;
  const { articleId, x, y, icon, iconId, shape, color, displayType } = req.body;

  // Check if any valid update data is present
  const updateFields = {};
  if (articleId !== undefined) updateFields.article = articleId; // Allow null
  if (x !== undefined) updateFields.x = x;
  if (y !== undefined) updateFields.y = y;
  if (icon !== undefined) updateFields.icon = icon; // Allow null
  if (iconId !== undefined) updateFields.iconId = iconId; // Allow null
  if (shape !== undefined) updateFields.shape = shape;
  if (color !== undefined) updateFields.color = color;
  if (displayType !== undefined) updateFields.displayType = displayType;

  if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ msg: 'No update data provided for pin.' });
  }

  try {
    const map = await Map.findById(mapId);
    if (!map) {
      return res.status(404).json({ msg: 'Map not found' });
    }

    const pin = map.pins.id(pinId);
    if (!pin) {
      return res.status(404).json({ msg: 'Pin not found on this map' });
    }

    // Validate Article ID if it's being updated (and not set to null)
    if (updateFields.article) {
        if (!mongoose.Types.ObjectId.isValid(updateFields.article)) {
             return res.status(400).json({ msg: 'Invalid Article ID format' });
        }
        const articleExists = await Article.findById(updateFields.article).select('_id');
        if (!articleExists) {
             return res.status(404).json({ msg: `Article with ID ${updateFields.article} not found` });
        }
    }

    // Apply updates to the pin subdocument
    Object.assign(pin, updateFields);

    // Save the parent Map document
    await map.save();

    // Populate the article details for the updated pin before sending response
    // We need to find the map again or populate manually
    const updatedPin = map.pins.id(pinId); // Get the updated pin again
    let populatedPin = updatedPin.toObject(); // Convert to plain object
    if (populatedPin.article) {
        const articleDetails = await Article.findById(populatedPin.article).select('title icon iconId');
        populatedPin.article = articleDetails; // Replace ID with populated object
    }

    res.json(populatedPin); // Return the updated pin data (populated)

  } catch (err) {
    console.error(`Error updating pin ${pinId} on map ${mapId}:`, err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Map or Pin not found' });
    }
     if (err.name === 'ValidationError') {
        return res.status(400).json({ msg: 'Validation Error', errors: err.errors });
    }
    res.status(500).send('Server Error');
  }
}; 