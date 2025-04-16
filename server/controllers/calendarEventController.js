const CalendarEvent = require('../models/CalendarEvent');
const Article = require('../models/Article'); // Import the Article model for linking

// Get events for a specific date range
exports.getEvents = async (req, res) => {
  try {
    const { worldId } = req.params;
    const { startYear, startMonth, startDay, endYear, endMonth, endDay } = req.query;
    
    // Validate required parameters
    if (!worldId || !startYear || !startMonth || !startDay) {
      return res.status(400).json({ 
        msg: 'World ID and start date parameters (year, month, day) are required' 
      });
    }
    
    // Build query
    const query = {
      world: worldId,
      // An event is in the range if:
      // 1. It starts during the range, or
      // 2. It ends during the range, or 
      // 3. It spans across the entire range
      $or: [
        // Event starts in the range
        {
          'startDate.year': { 
            $gte: parseInt(startYear), 
            $lte: parseInt(endYear || startYear) 
          },
          'startDate.month': { 
            $gte: parseInt(startMonth), 
            $lte: parseInt(endMonth || startMonth) 
          }
        },
        // Event ends in the range
        {
          'endDate.year': { 
            $gte: parseInt(startYear), 
            $lte: parseInt(endYear || startYear) 
          },
          'endDate.month': { 
            $gte: parseInt(startMonth), 
            $lte: parseInt(endMonth || startMonth) 
          }
        }
      ]
    };
    
    const events = await CalendarEvent.find(query)
      .populate('articleId', 'title')
      .sort({ 'startDate.year': 1, 'startDate.month': 1, 'startDate.day': 1 });
    
    res.json(events);
  } catch (err) {
    console.error('Error getting calendar events:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Create a new event
exports.createEvent = async (req, res) => {
  try {
    const { worldId } = req.params;
    const { title, description, startDate, endDate, isAllDay, color, important, articleId } = req.body;
    
    // Validate required fields
    if (!title || !startDate || !startDate.year || !startDate.month || !startDate.day) {
      return res.status(400).json({ 
        msg: 'Title and complete start date (year, month, day) are required' 
      });
    }
    
    // Create new event
    const newEvent = new CalendarEvent({
      title,
      description,
      startDate,
      endDate: endDate || startDate, // Default to startDate if no endDate
      isAllDay: isAllDay !== undefined ? isAllDay : true,
      color,
      important,
      articleId,
      world: worldId
    });
    
    const savedEvent = await newEvent.save();
    
    // If there's an articleId, populate it in the response
    const populatedEvent = articleId 
      ? await CalendarEvent.findById(savedEvent._id).populate('articleId', 'title')
      : savedEvent;
    
    res.status(201).json(populatedEvent);
  } catch (err) {
    console.error('Error creating calendar event:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Update an existing event
exports.updateEvent = async (req, res) => {
  try {
    const { worldId, eventId } = req.params;
    const { title, description, startDate, endDate, isAllDay, color, important, articleId } = req.body;
    
    // Validate required fields
    if (!title || !startDate || !startDate.year || !startDate.month || !startDate.day) {
      return res.status(400).json({ 
        msg: 'Title and complete start date (year, month, day) are required' 
      });
    }
    
    // Find the event
    const event = await CalendarEvent.findOne({ _id: eventId, world: worldId });
    
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    // Update fields
    event.title = title;
    event.description = description;
    event.startDate = startDate;
    event.endDate = endDate || startDate;
    event.isAllDay = isAllDay !== undefined ? isAllDay : event.isAllDay;
    event.color = color || event.color;
    event.important = important !== undefined ? important : event.important;
    event.articleId = articleId || event.articleId;
    
    const updatedEvent = await event.save();
    
    // If there's an articleId, populate it in the response
    const populatedEvent = updatedEvent.articleId 
      ? await CalendarEvent.findById(updatedEvent._id).populate('articleId', 'title')
      : updatedEvent;
    
    res.json(populatedEvent);
  } catch (err) {
    console.error('Error updating calendar event:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Delete an event
exports.deleteEvent = async (req, res) => {
  try {
    const { worldId, eventId } = req.params;
    
    // Find the event
    const event = await CalendarEvent.findOne({ _id: eventId, world: worldId });
    
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    await CalendarEvent.deleteOne({ _id: eventId });
    
    res.json({ msg: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting calendar event:', err);
    res.status(500).json({ msg: 'Server error' });
  }
}; 