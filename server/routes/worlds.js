const express = require('express');
const router = express.Router();
const calendarSettingsController = require('../controllers/calendarSettingsController');
const calendarEventsRouter = require('./calendarEvents');

// Mount calendar events routes
router.use('/:worldId/events', calendarEventsRouter);

// Calendar settings routes
router.get('/:worldId/calendar', async (req, res) => {
  try {
    // For now, just return default calendar settings
    // Later, this will fetch calendar settings specific to the world
    const defaultSettings = await calendarSettingsController.getDefaultCalendarSettings(req, res);
    return defaultSettings;
  } catch (err) {
    console.error('Error getting world calendar settings:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/:worldId/calendar', async (req, res) => {
  try {
    // For now, create or update default calendar settings
    // Later, this will handle world-specific calendar settings
    if (req.body.id) {
      req.params.id = req.body.id;
      return await calendarSettingsController.updateCalendarSettings(req, res);
    } else {
      return await calendarSettingsController.createCalendarSettings(req, res);
    }
  } catch (err) {
    console.error('Error saving world calendar settings:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router; 