const express = require('express');
const router = express.Router();
const calendarSettingsController = require('../controllers/calendarSettingsController');

// GET /api/calendar-settings
router.get('/', calendarSettingsController.getAllCalendarSettings);

// GET /api/calendar-settings/default
router.get('/default', calendarSettingsController.getDefaultCalendarSettings);

// GET /api/calendar-settings/:id
router.get('/:id', calendarSettingsController.getCalendarSettingsById);

// POST /api/calendar-settings
router.post('/', calendarSettingsController.createCalendarSettings);

// PUT /api/calendar-settings/:id
router.put('/:id', calendarSettingsController.updateCalendarSettings);

// DELETE /api/calendar-settings/:id
router.delete('/:id', calendarSettingsController.deleteCalendarSettings);

// PUT /api/calendar-settings/:id/set-default
router.put('/:id/set-default', calendarSettingsController.setDefaultCalendar);

module.exports = router; 