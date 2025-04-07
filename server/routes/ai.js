const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController'); // Uncomment

// TODO: Add auth middleware

// @route   POST /api/ai/summarize/article/:id
// @desc    Generate AI summary for an article
// @access  Private
router.post('/summarize/article/:id', aiController.summarizeArticle); // Uncomment

// @route   POST /api/ai/generate
// @desc    Generate text based on context and action
// @access  Private
router.post('/generate', aiController.generateText);

// @route   POST /api/ai/generate/from-template
// @desc    Generate a new article from a template
// @access  Private
router.post('/generate/from-template', aiController.generateFromTemplate);

module.exports = router; 