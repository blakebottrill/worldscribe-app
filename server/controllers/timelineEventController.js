const TimelineEvent = require('../models/TimelineEvent');
const Article = require('../models/Article'); // If linking articles

// Get all events (no world filtering)
exports.getAllEvents = async (req, res) => {
  try {
    // Removed worldId query logic
    const events = await TimelineEvent.find() // Fetch all events
      .populate('article', 'title')
      .sort({ 'startDate.year': 1, 'startDate.month': 1, 'startDate.day': 1 });
      
    res.json(events);
  } catch (err) {
    console.error("Error fetching timeline events:", err);
    res.status(500).send('Server Error');
  }
};

// Create event (no world field)
exports.createEvent = async (req, res) => {
  console.log('[Controller] Received POST /api/timeline request body:', req.body);
  
  const { 
    title, 
    startDate, 
    endDate, 
    description, 
    articleId, 
    isAllDay, 
    color, 
    important 
    // Removed world field from destructuring
  } = req.body;

  // Updated Validation Logic (removed world check)
  let errors = {};
  if (!title) errors.title = 'Title is required';
  if (!startDate) {
    errors.startDate = 'Start date is required';
  } else {
    if (startDate.year == null) errors.startDate = 'Start date year is required';
    if (startDate.month == null) errors.startDate = 'Start date month is required';
    if (startDate.day == null) errors.startDate = 'Start date day is required';
  }
  if (endDate && (endDate.year == null || endDate.month == null || endDate.day == null)) {
      errors.endDate = 'End date must be complete (year, month, day) if provided';
  }

  if (Object.keys(errors).length > 0) {
    console.log('[Controller] Validation failed:', errors);
    return res.status(400).json({ msg: 'Validation failed', errors }); 
  }
  
  const effectiveEndDate = endDate && endDate.year !== undefined && endDate.month !== undefined && endDate.day !== undefined 
                           ? endDate 
                           : startDate;

  try {
    const newEvent = new TimelineEvent({
      title,
      startDate,
      endDate: effectiveEndDate,
      description,
      article: articleId || null,
      isAllDay: isAllDay !== undefined ? isAllDay : true,
      color,
      important
      // Removed world field from creation
    });

    const event = await newEvent.save();
    const populatedEvent = await TimelineEvent.findById(event._id).populate('article', 'title');
    console.log('[Controller] Event created successfully:', populatedEvent._id);
    res.status(201).json(populatedEvent);

  } catch (err) {
    console.error("[Controller] Error creating timeline event:", err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ msg: 'Database validation failed', errors: err.errors });
    }
    res.status(500).send('Server Error');
  }
};

// Update event (no world check/update)
exports.updateEvent = async (req, res) => {
  console.log(`[Controller] Received PUT /api/timeline/${req.params.id} request body:`, req.body);
  
  const { 
    title, 
    startDate, 
    endDate, 
    description, 
    articleId, 
    isAllDay, 
    color, 
    important 
    // Removed world field
  } = req.body;
  const eventId = req.params.id;

  // Updated Validation Logic
  let errors = {};
  if (!title) errors.title = 'Title is required';
  if (!startDate) {
    errors.startDate = 'Start date is required';
  } else {
    if (startDate.year == null) errors.startDate = 'Start date year is required';
    if (startDate.month == null) errors.startDate = 'Start date month is required';
    if (startDate.day == null) errors.startDate = 'Start date day is required';
  }
  if (endDate && (endDate.year == null || endDate.month == null || endDate.day == null)) {
      errors.endDate = 'End date must be complete (year, month, day) if provided';
  }
  
  if (Object.keys(errors).length > 0) {
    console.log('[Controller] Validation failed:', errors);
    return res.status(400).json({ msg: 'Validation failed', errors });
  }
  
  const effectiveEndDate = endDate && endDate.year !== undefined && endDate.month !== undefined && endDate.day !== undefined 
                           ? endDate 
                           : startDate;

  try {
    // Find event by ID only
    const event = await TimelineEvent.findById(eventId);
    if (!event) {
      console.log(`[Controller] Event not found for update: ${eventId}`);
      return res.status(404).json({ msg: 'Event not found' });
    }
    
    // Removed world/ownership check placeholder

    // Update fields
    event.title = title;
    event.startDate = startDate;
    event.endDate = effectiveEndDate;
    event.description = description;
    event.article = articleId !== undefined ? articleId : event.article; 
    event.isAllDay = isAllDay !== undefined ? isAllDay : event.isAllDay;
    event.color = color !== undefined ? color : event.color;
    event.important = important !== undefined ? important : event.important;

    const updatedEvent = await event.save();
    const populatedEvent = await TimelineEvent.findById(updatedEvent._id).populate('article', 'title');
    console.log('[Controller] Event updated successfully:', populatedEvent._id);
    res.json(populatedEvent);

  } catch (err) {
    console.error(`[Controller] Error updating timeline event ${eventId}:`, err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ msg: 'Database validation failed', errors: err.errors });
    }
    if (err.kind === 'ObjectId' || err.name === 'CastError') {
      return res.status(404).json({ msg: 'Timeline event not found' });
    }
    res.status(500).send('Server Error');
  }
};

// Delete event (no world check)
exports.deleteEvent = async (req, res) => {
  const eventId = req.params.id;
  
  try {
    // Find event by ID only
    const event = await TimelineEvent.findById(eventId);

    if (!event) {
      return res.status(404).json({ msg: 'Timeline event not found' });
    }

    // Removed ownership check placeholder

    await TimelineEvent.findByIdAndDelete(eventId);

    res.json({ msg: 'Timeline event removed' });

  } catch (err) {
    console.error(`Error deleting timeline event ${eventId}:`, err);
    if (err.kind === 'ObjectId' || err.name === 'CastError') {
      return res.status(404).json({ msg: 'Timeline event not found' });
    }
    res.status(500).send('Server Error');
  }
}; 