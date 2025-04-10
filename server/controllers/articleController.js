const mongoose = require('mongoose'); // Add mongoose import
const Article = require('../models/Article');
const Map = require('../models/Map'); // Import Map model for pin updates

// @desc    Get all articles
// @route   GET /api/articles
// @access  Public // TODO: Add auth
exports.getAllArticles = async (req, res) => {
  // console.log('Received request for GET /api/articles'); // Can remove this log now
  try {
    // Restore original database query
    const articles = await Article.find().sort({ createdAt: -1 }); 
    res.json(articles);
  } catch (err) {
    console.error('Error in getAllArticles:', err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get single article by ID
// @route   GET /api/articles/:id
// @access  Public // TODO: Add auth
exports.getArticleById = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ msg: 'Article not found' });
    }
    res.json(article);
  } catch (err) {
    console.error(err.message);
    // If the ID format is invalid
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Article not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Create an article
// @route   POST /api/articles
// @access  Private // TODO: Add auth
exports.createArticle = async (req, res) => {
  // Destructure icon from req.body
  const { title, body, tags, icon } = req.body;

  try {
    const newArticle = new Article({
      title,
      body,
      icon, // Add icon to new article data
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [] // Basic tag handling
      // TODO: Add user association later
    });

    const article = await newArticle.save();
    res.status(201).json(article);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update an article
// @route   PUT /api/articles/:id
// @access  Private // TODO: Add auth
exports.updateArticle = async (req, res) => {
  try {
    // Build the article update object from incoming data
    const { title, body, icon, iconId, tags } = req.body;
    
    // Build the article fields object with only the provided fields
    const articleFields = {};
    if (title !== undefined) articleFields.title = title; // Allow empty title for now?
    if (body !== undefined) articleFields.body = body; 
    if (icon !== undefined) articleFields.icon = icon; // Allow setting icon
    if (iconId !== undefined) articleFields.iconId = iconId; // Allow setting iconId
    if (tags !== undefined) { 
        // Ensure tags are stored as an array
        if (Array.isArray(tags)) {
            articleFields.tags = tags.map(tag => tag.trim()).filter(Boolean);
        } else if (typeof tags === 'string') {
            articleFields.tags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
        } else {
             articleFields.tags = []; // Default to empty array if invalid type
        }
    }
    
    // Ensure updatedAt is updated
    articleFields.updatedAt = Date.now();

    // Update record
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { $set: articleFields },
      { new: true, runValidators: true } // Return the updated document and run schema validators
    );
    
    if (!article) {
      return res.status(404).json({ msg: 'Article not found' });
    }
    
    res.json(article);
  } catch (err) {
    console.error("Error updating article:", err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Article not found' });
    }
    res.status(500).json({ msg: 'Server Error', error: err.message }); // Send error message back
  }
};

// @desc    Delete an article
// @route   DELETE /api/articles/:id
// @access  Private // TODO: Add auth
exports.deleteArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) return res.status(404).json({ msg: 'Article not found' });

    // TODO: Add authorization check (ensure user owns the article)

    await Article.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Article removed' });
  } catch (err) {
    console.error(err.message);
    // If the ID format is invalid
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Article not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Sync Article Icon to Linked Pins
// @route   POST /api/articles/:id/sync-icon-to-pins
// @access  Private // TODO: Add auth
exports.syncArticleIconToPins = async (req, res) => {
  const { icon, iconId } = req.body;
  const articleId = req.params.id;

  // Basic validation
  if (!icon || !iconId) {
      return res.status(400).json({ msg: 'Missing icon or iconId in request body' });
  }
  if (!mongoose.Types.ObjectId.isValid(articleId)) {
       return res.status(400).json({ msg: 'Invalid Article ID format' });
  }

  try {
    console.log(`Syncing icon for article ${articleId} to icon: ${icon}, iconId: ${iconId}`);
    
    // Find all maps that contain at least one pin linked to the target article
    // This uses $elemMatch to efficiently find relevant maps
    const mapsToUpdate = await Map.find({ 'pins.article': articleId });

    let updatedPinCount = 0;
    const updatePromises = [];

    for (const map of mapsToUpdate) {
      let mapModified = false;
      map.pins.forEach(pin => {
        // Check if the pin is linked to the target article
        if (pin.article && pin.article.toString() === articleId) {
          // Check if update is actually needed
          if (pin.icon !== icon || pin.iconId !== iconId) {
             pin.icon = icon;       // Update the pin's icon
             pin.iconId = iconId;     // Update the pin's iconId
             updatedPinCount++;
             mapModified = true;
          }
        }
      });

      // If any pin in this map was modified, add its save operation to the promises array
      if (mapModified) {
        console.log(`Map ${map._id} modified, scheduling save.`);
        updatePromises.push(map.save());
      }
    }

    // Execute all save operations concurrently
    if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        console.log(`Successfully synced icons for ${updatedPinCount} pins across ${updatePromises.length} maps.`);
    }

    res.json({ 
        success: true, 
        message: `Synced icon to ${updatedPinCount} pins.`,
        updatedPinCount: updatedPinCount,
        mapsAffected: updatePromises.length
    });

  } catch (err) {
    console.error("Error syncing article icon to pins:", err.message);
    res.status(500).json({ msg: 'Server Error during icon sync', error: err.message });
  }
}; 