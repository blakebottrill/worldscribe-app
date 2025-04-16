const CalendarSettings = require('../models/CalendarSettings');

// Get all calendar settings
exports.getAllCalendarSettings = async (req, res) => {
  try {
    const calendarSettings = await CalendarSettings.find();
    return res.json(calendarSettings);
  } catch (err) {
    console.error('Error getting calendar settings:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

// Get a single calendar setting by ID
exports.getCalendarSettingsById = async (req, res) => {
  try {
    const calendarSettings = await CalendarSettings.findById(req.params.id);
    if (!calendarSettings) {
      return res.status(404).json({ msg: 'Calendar settings not found' });
    }
    return res.json(calendarSettings);
  } catch (err) {
    console.error('Error getting calendar settings:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

// Create new calendar settings
exports.createCalendarSettings = async (req, res) => {
  try {
    // Create a new calendar settings instance
    const newCalendarSettings = new CalendarSettings({
      name: req.body.name || 'Custom Calendar',
      description: req.body.description,
      dayNames: req.body.dayNames,
      daysInWeek: req.body.daysInWeek,
      months: req.body.months,
      yearPrefix: req.body.yearPrefix,
      yearSuffix: req.body.yearSuffix,
      startingYear: req.body.startingYear,
      hasLeapYears: req.body.hasLeapYears,
      leapYearRule: req.body.leapYearRule,
      leapYearExtraDay: req.body.leapYearExtraDay,
      dateFormatString: req.body.dateFormatString,
      createdBy: req.body.createdBy,
      isDefault: req.body.isDefault || false
    });

    const savedCalendarSettings = await newCalendarSettings.save();
    return res.status(201).json(savedCalendarSettings);
  } catch (err) {
    console.error('Error creating calendar settings:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

// Update calendar settings
exports.updateCalendarSettings = async (req, res) => {
  try {
    // Find the calendar settings
    const calendarSettings = await CalendarSettings.findById(req.params.id);
    if (!calendarSettings) {
      return res.status(404).json({ msg: 'Calendar settings not found' });
    }

    // Update fields
    const updateData = {
      name: req.body.name !== undefined ? req.body.name : calendarSettings.name,
      description: req.body.description !== undefined ? req.body.description : calendarSettings.description,
      dayNames: req.body.dayNames !== undefined ? req.body.dayNames : calendarSettings.dayNames,
      daysInWeek: req.body.daysInWeek !== undefined ? req.body.daysInWeek : calendarSettings.daysInWeek,
      months: req.body.months !== undefined ? req.body.months : calendarSettings.months,
      yearPrefix: req.body.yearPrefix !== undefined ? req.body.yearPrefix : calendarSettings.yearPrefix,
      yearSuffix: req.body.yearSuffix !== undefined ? req.body.yearSuffix : calendarSettings.yearSuffix,
      startingYear: req.body.startingYear !== undefined ? req.body.startingYear : calendarSettings.startingYear,
      hasLeapYears: req.body.hasLeapYears !== undefined ? req.body.hasLeapYears : calendarSettings.hasLeapYears,
      leapYearRule: req.body.leapYearRule !== undefined ? req.body.leapYearRule : calendarSettings.leapYearRule,
      leapYearExtraDay: req.body.leapYearExtraDay !== undefined ? req.body.leapYearExtraDay : calendarSettings.leapYearExtraDay,
      dateFormatString: req.body.dateFormatString !== undefined ? req.body.dateFormatString : calendarSettings.dateFormatString,
      isDefault: req.body.isDefault !== undefined ? req.body.isDefault : calendarSettings.isDefault
    };

    const updatedCalendarSettings = await CalendarSettings.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    return res.json(updatedCalendarSettings);
  } catch (err) {
    console.error('Error updating calendar settings:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

// Delete calendar settings
exports.deleteCalendarSettings = async (req, res) => {
  try {
    const calendarSettings = await CalendarSettings.findById(req.params.id);
    if (!calendarSettings) {
      return res.status(404).json({ msg: 'Calendar settings not found' });
    }

    // Don't allow deletion of default calendar if it's the only one
    if (calendarSettings.isDefault) {
      const count = await CalendarSettings.countDocuments();
      if (count <= 1) {
        return res.status(400).json({ msg: 'Cannot delete the only calendar settings' });
      }
    }

    await CalendarSettings.findByIdAndDelete(req.params.id);
    return res.json({ msg: 'Calendar settings deleted' });
  } catch (err) {
    console.error('Error deleting calendar settings:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

// Get default calendar settings
exports.getDefaultCalendarSettings = async (req, res) => {
  try {
    let defaultSettings = await CalendarSettings.findOne({ isDefault: true });
    
    // If no default settings exist, create one with standard calendar
    if (!defaultSettings) {
      defaultSettings = await CalendarSettings.create({
        name: 'Standard Calendar',
        isDefault: true
      });
    }
    
    return res.json(defaultSettings);
  } catch (err) {
    console.error('Error getting default calendar settings:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

// Set a calendar as default
exports.setDefaultCalendar = async (req, res) => {
  try {
    // Find the calendar to set as default
    const calendarSettings = await CalendarSettings.findById(req.params.id);
    if (!calendarSettings) {
      return res.status(404).json({ msg: 'Calendar settings not found' });
    }
    
    // Clear any existing default
    await CalendarSettings.updateMany({}, { isDefault: false });
    
    // Set this calendar as default
    calendarSettings.isDefault = true;
    await calendarSettings.save();
    
    return res.json(calendarSettings);
  } catch (err) {
    console.error('Error setting default calendar:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
}; 