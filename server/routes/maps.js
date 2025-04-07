const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController'); // Uncomment
const upload = require('../middleware/upload'); // Uncomment

// TODO: Add auth middleware to protected routes

// @route   GET /api/maps
// @desc    Get all maps (metadata only)
// @access  Private
router.get('/', mapController.getAllMaps); // Uncomment

// @route   GET /api/maps/:id
// @desc    Get a single map by ID (including pins)
// @access  Private
router.get('/:id', mapController.getMapById); // Uncomment

// @route   POST /api/maps
// @desc    Create a new map (upload image + title)
// @access  Private
router.post('/', upload.single('mapImage'), mapController.createMap); // Uncomment

// @route   PUT /api/maps/:id/pins
// @desc    Update pins for a map (adds a new pin)
// @access  Private
router.put('/:id/pins', mapController.updateMapPins); // Uncomment

// @route   DELETE /api/maps/:id
// @desc    Delete a map
// @access  Private
router.delete('/:id', mapController.deleteMap); // Uncomment

// @route   DELETE /api/maps/:mapId/pins/:pinId
// @desc    Delete a specific pin from a map
// @access  Private
router.delete('/:mapId/pins/:pinId', mapController.deleteMapPin);

// @route   PUT /api/maps/:mapId/pins/:pinId
// @desc    Update a specific pin on a map
// @access  Private
router.put('/:mapId/pins/:pinId', mapController.updateMapPin);

module.exports = router; 