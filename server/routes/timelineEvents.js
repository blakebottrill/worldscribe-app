const express = require('express');
const router = express.Router();
const timelineEventController = require('../controllers/timelineEventController'); // Import later

// TODO: Add auth middleware

// @route   GET /api/timeline
// @desc    Get all timeline events
// @access  Private
router.get('/', timelineEventController.getAllEvents);

// @route   POST /api/timeline
// @desc    Create a new timeline event
// @access  Private
router.post('/', timelineEventController.createEvent);

// @route   PUT /api/timeline/:id
// @desc    Update a timeline event
// @access  Private
router.put('/:id', timelineEventController.updateEvent);

// @route   DELETE /api/timeline/:id
// @desc    Delete a timeline event
// @access  Private
router.delete('/:id', timelineEventController.deleteEvent);

module.exports = router; 