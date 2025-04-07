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
      select: 'title' // Only select the title from the linked Article
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
  // Expect articleId instead of articleTitle
  const { x, y, articleId } = req.body;
  const mapId = req.params.id;

  // Basic validation
  if (typeof x !== 'number' || typeof y !== 'number' || articleId === undefined) { // articleId can be null, but must be present
    return res.status(400).json({ msg: 'Invalid pin data provided (requires x, y, articleId).' });
  }

  try {
    // Remove Article lookup by title
    /* const article = await Article.findOne({ ... }); */

    // 2. Find the Map
    const map = await Map.findById(mapId);
    if (!map) {
      return res.status(404).json({ msg: 'Map not found' });
    }

    // TODO: Check user ownership of the map

    // 3. Create the new pin object
    const newPin = {
      x: x,
      y: y,
      article: articleId || null // Use passed ID or null
    };

    // 4. Add the pin to the map's pins array
    map.pins.push(newPin);

    // 5. Save the updated map
    await map.save();

    // 6. Fetch the updated map with populated pins for the response
    const updatedMap = await Map.findById(mapId).populate({
      path: 'pins.article',
      select: 'title'
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
  // Expect articleId instead of articleTitle (and optionally x, y)
  const { articleId, x, y } = req.body;

  // Basic check: at least one updatable field must be present
  if (articleId === undefined && x === undefined && y === undefined) {
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
    if (x !== undefined && y !== undefined) {
        // Add validation if needed (e.g., ensure they are numbers between 0 and 1)
        if (typeof x === 'number' && typeof y === 'number') {
            pin.x = Math.max(0, Math.min(1, x));
            pin.y = Math.max(0, Math.min(1, y));
        } else {
            return res.status(400).json({ msg: 'Invalid coordinate format provided.' });
        }
    }

    // Save the parent map document
    await map.save();

    // Find the map again to populate the updated pin for the response
    const updatedMap = await Map.findById(mapId).populate({
      path: 'pins.article',
      select: 'title'
    });
    const updatedPin = updatedMap.pins.id(pinId);

    res.json(updatedPin); // Return the updated pin data

  } catch (err) {
    console.error(`Error updating pin ${pinId} on map ${mapId}:`, err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Map, Pin, or Article not found' });
    }
    res.status(500).send('Server Error');
  }
}; 