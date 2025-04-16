const express = require('express');
const router = express.Router();
const calendarEventController = require('../controllers/calendarEventController');

// Routes are relative to /api/worlds/:worldId/events

// Get events for a world in a date range
router.get('/', calendarEventController.getEvents);

// Create a new event
router.post('/', calendarEventController.createEvent);

// Update an event
router.put('/:eventId', calendarEventController.updateEvent);

// Delete an event
router.delete('/:eventId', calendarEventController.deleteEvent);

module.exports = router; 