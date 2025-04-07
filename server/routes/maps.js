const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController'); // Uncomment
const upload = require('../middleware/upload'); // Uncomment

// TODO: Add auth middleware to protected routes

// @route   GET /api/maps
// @desc    Get all maps (metadata only)
// @access  Private
// router.get('/', mapController.getAllMaps);

// @route   GET /api/maps/:id
// @desc    Get a single map by ID (including pins)
// @access  Private
// router.get('/:id', mapController.getMapById);

// @route   POST /api/maps
// @desc    Create a new map (upload image + title)
// @access  Private
router.post('/', upload.single('mapImage'), mapController.createMap); // Uncomment

// @route   PUT /api/maps/:id/pins
// @desc    Update pins for a map
// @access  Private
// router.put('/:id/pins', mapController.updateMapPins);

// @route   DELETE /api/maps/:id
// @desc    Delete a map
// @access  Private
// router.delete('/:id', mapController.deleteMap);

module.exports = router; 