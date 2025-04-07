const TimelineEvent = require('../models/TimelineEvent');
const Article = require('../models/Article'); // If linking articles

// Placeholder functions - implement logic later

// Get all events, populate linked article title
exports.getAllEvents = async (req, res) => {
  try {
    // TODO: Add user filtering
    const events = await TimelineEvent.find()
      .populate('article', 'title') // Populate title of linked article
      .sort({ createdAt: 1 }); // Sort by creation date for now (can change later)
    res.json(events);
  } catch (err) {
    console.error("Error fetching timeline events:", err);
    res.status(500).send('Server Error');
  }
};

// Create event
exports.createEvent = async (req, res) => {
  // Expect articleId instead of articleTitle
  const { eventName, dateString, description, articleId } = req.body;

  if (!eventName || !dateString) {
    return res.status(400).json({ msg: 'Event Name and Date are required.' });
  }

  try {
    // Remove article lookup by title
    /* let articleId = null; ... */ 

    const newEvent = new TimelineEvent({
      eventName,
      dateString,
      description,
      article: articleId || null, // Use passed ID or null
      // TODO: Add user ID
    });

    const event = await newEvent.save();
    // Populate the article title in the response if it was linked
    const populatedEvent = await TimelineEvent.findById(event._id).populate('article', 'title');
    res.status(201).json(populatedEvent);

  } catch (err) {
    console.error("Error creating timeline event:", err);
    res.status(500).send('Server Error');
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  // Expect articleId instead of articleTitle
  const { eventName, dateString, description, articleId } = req.body;
  const eventId = req.params.id;

  if (!eventName || !dateString) {
    return res.status(400).json({ msg: 'Event Name and Date are required.' });
  }

  try {
     // Remove article lookup by title
    /* let articleId = null; ... */

    const updateData = {
      eventName,
      dateString,
      description,
    };
    // Only update article link if articleId is explicitly provided (even if null)
    if (articleId !== undefined) {
       updateData.article = articleId; // Use passed ID (can be null to unlink)
    }

    const updatedEvent = await TimelineEvent.findByIdAndUpdate(
      eventId,
      { $set: updateData },
      { new: true } // Return the updated document
    ).populate('article', 'title'); // Populate for the response

    if (!updatedEvent) {
      return res.status(404).json({ msg: 'Timeline event not found' });
    }

    // TODO: Check user ownership

    res.json(updatedEvent);

  } catch (err) {
    console.error(`Error updating timeline event ${eventId}:`, err);
     if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Timeline event not found' });
    }
    res.status(500).send('Server Error');
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  const eventId = req.params.id;
  try {
    const event = await TimelineEvent.findById(eventId);

    if (!event) {
      return res.status(404).json({ msg: 'Timeline event not found' });
    }

    // TODO: Check user ownership

    await TimelineEvent.findByIdAndDelete(eventId);

    res.json({ msg: 'Timeline event removed' });

  } catch (err) {
    console.error(`Error deleting timeline event ${eventId}:`, err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Timeline event not found' });
    }
    res.status(500).send('Server Error');
  }
}; 