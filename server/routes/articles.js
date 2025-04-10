const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');

// Get all articles
router.get('/', articleController.getAllArticles);

// Get a single article by ID
router.get('/:id', articleController.getArticleById);

// Create a new article
router.post('/', articleController.createArticle);

// Update an article by ID
router.put('/:id', articleController.updateArticle);

// Delete an article by ID
router.delete('/:id', articleController.deleteArticle);

// Sync article icon to linked pins
router.post('/:id/sync-icon-to-pins', articleController.syncArticleIconToPins);

module.exports = router; 