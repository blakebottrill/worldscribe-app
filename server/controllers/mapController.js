const Map = require('../models/Map');
const Article = require('../models/Article'); // Needed for pin validation
const fs = require('fs');
const path = require('path');

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

// Update map pins
exports.updateMapPins = async (req, res) => {
  // Expect articleId instead of articleTitle, plus optional customization properties
  const { x, y, articleId, icon, iconId, shape, color, displayType } = req.body;
  const mapId = req.params.id;

  // Basic validation
  if (typeof x !== 'number' || typeof y !== 'number' || articleId === undefined) { // articleId can be null, but must be present
    return res.status(400).json({ msg: 'Invalid pin data provided (requires x, y, articleId).' });
  }

  try {
    // 2. Find the Map
    const map = await Map.findById(mapId);
    if (!map) {
      return res.status(404).json({ msg: 'Map not found' });
    }

    // TODO: Check user ownership of the map

    // 3. Create the new pin object with customization options
    const newPin = {
      x: x,
      y: y,
      article: articleId || null, // Use passed ID or null
      icon: icon || null,      // Legacy field
      iconId: iconId || null,  // New shared icon identifier
      shape: shape || 'pin', // Default to pin shape
      color: color || '#dc3545', // Default red color
      displayType: displayType || 'pin+icon' // Default to showing both
    };

    // 4. Add the pin to the map's pins array
    map.pins.push(newPin);

    // 5. Save the updated map
    await map.save();

    // 6. Fetch the updated map with populated pins for the response
    const updatedMap = await Map.findById(mapId).populate({
      path: 'pins.article',
      select: 'title icon iconId' // Include iconId in populated data
    });

    res.json(updatedMap); // Return the whole updated map

  } catch (err) {
    console.error(`Error updating pins for map ${mapId}:`, err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Map or Article not found' });
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
  // Expanded to include all pin customization properties and iconId
  const { articleId, x, y, icon, iconId, shape, color, displayType } = req.body;

  // Basic check: at least one updatable field must be present
  if (articleId === undefined && x === undefined && y === undefined && 
      icon === undefined && iconId === undefined && shape === undefined && 
      color === undefined && displayType === undefined) {
      return res.status(400).json({ msg: 'No update data provided for pin.' });
  }

  try {
    const map = await Map.findById(mapId);
    if (!map) {
      return res.status(404).json({ msg: 'Map not found' });
    }

    // TODO: Check user ownership

    // Find the pin within the map's pins array
    const pin = map.pins.id(pinId);
    if (!pin) {
      return res.status(404).json({ msg: 'Pin not found on this map' });
    }

    // Update Article Link (if articleId is provided)
    if (articleId !== undefined) {
      // No need to look up - just assign the ID (can be null)
      pin.article = articleId; // Update the pin's article field
    }

    // Update Coordinates (if x and y are provided)
    if (x !== undefined) pin.x = x;
    if (y !== undefined) pin.y = y;
    
    // Handle icon updates - legacy field
    if (icon !== undefined) {
      pin.icon = icon;
    }
    
    // Handle iconId updates - new central identifier
    if (iconId !== undefined) {
      pin.iconId = iconId;
    }

    // Update other customization fields
    if (shape !== undefined) pin.shape = shape;
    if (color !== undefined) pin.color = color;
    if (displayType !== undefined) pin.displayType = displayType;

    // Save the updated map
    await map.save();

    // Populate the pin's article data before sending response
    await Map.populate(map, {
      path: 'pins.article',
      select: 'title icon iconId'
    });

    res.json(pin); // Return just the updated pin with populated article

  } catch (err) {
    console.error(`Error updating pin ${pinId} on map ${mapId}:`, err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Map or Pin not found' });
    }
    res.status(500).send('Server Error');
  }
}; 