const Article = require('../models/Article');

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
  const { title, body, tags, icon } = req.body;
  
  const articleFields = {};
  if (title) articleFields.title = title;
  if (body) articleFields.body = body;
  // Add icon to fields if provided
  if (icon) articleFields.icon = icon;
  
  // Check if tags exist, then handle them based on type
  if (tags !== undefined) {
    // If tags is a string, split it; otherwise, assume it's already the proper format
    articleFields.tags = typeof tags === 'string' ? 
      tags.split(',').map(tag => tag.trim()).filter(Boolean) : 
      tags; // Just use as-is
  }
  
  // We also update the `updatedAt` field automatically via schema middleware

  try {
    let article = await Article.findById(req.params.id);

    if (!article) return res.status(404).json({ msg: 'Article not found' });

    // TODO: Add authorization check (ensure user owns the article)

    article = await Article.findByIdAndUpdate(
      req.params.id,
      { $set: articleFields },
      { new: true } // Return the updated document
    );

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