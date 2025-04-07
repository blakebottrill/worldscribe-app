const Article = require('../models/Article');

// Placeholder function for summarizing an article
exports.summarizeArticle = async (req, res) => {
  const articleId = req.params.id;
  console.log(`POST /api/ai/summarize/article/${articleId} called`);

  try {
    const article = await Article.findById(articleId).select('content');
    if (!article) {
      return res.status(404).json({ msg: 'Article not found' });
    }

    const articleContent = article.content; // Or extract text from markdown/HTML
    
    // --- AI Model Call Placeholder ---
    console.log("Simulating AI call for article content:", articleContent.substring(0, 100) + "...");
    // Replace this with actual API call to your chosen AI service (e.g., OpenAI, Gemini)
    // Example prompt: `Summarize the following text for a wiki page in 2-3 sentences:\n${articleContent}`
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
    const summary = `This is a simulated AI summary for the article (ID: ${articleId}). It seems to be about various interesting topics based on the provided content starting with '${articleContent.substring(0, 30)}...'. A real summary would be much more insightful.`;
    // --- End Placeholder ---

    res.json({ summary });

  } catch (err) {
    console.error(`Error summarizing article ${articleId}:`, err);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Article not found' });
    }
    res.status(500).send('Server Error');
  }
};

// Placeholder function for flexible text generation
exports.generateText = async (req, res) => {
  // context: The text preceding the command
  // action: The type of generation (e.g., 'continue', 'expand')
  // topic: Optional topic for expansion
  const { context, action, topic } = req.body;
  
  console.log(`POST /api/ai/generate called with action: ${action}`);
  console.log(`Context: ${context?.substring(0, 100)}...`);
  if (topic) console.log(`Topic: ${topic}`);

  if (!context || !action) {
    return res.status(400).json({ msg: 'Missing context or action for AI generation.' });
  }

  try {
    // --- AI Model Call Placeholder ---
    let prompt = "";
    if (action === 'continue') {
      prompt = `Continue writing the following text:
\n---\n${context}
---\nContinuation:`;
    } else if (action === 'expand' && topic) {
       prompt = `Expand on the topic "${topic}" within the context of the following text. Write a short paragraph:
\n---\n${context}
---\nExpansion on "${topic}":`;
    } else {
       return res.status(400).json({ msg: 'Invalid action or missing topic for AI generation.' });
    }
    
    console.log("Simulating AI call with prompt:", prompt);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
    
    let generatedText = "";
     if (action === 'continue') {
      generatedText = "...and so the journey continued towards the shimmering mountains. (Simulated AI continuation)";
    } else if (action === 'expand') {
       generatedText = `Regarding ${topic}, it is known throughout the land for its peculiar properties and historical significance. Legends say... (Simulated AI expansion)`;
    }
    // --- End Placeholder ---

    res.json({ generatedText });

  } catch (err) {
    console.error(`Error generating text for action ${action}:`, err);
    res.status(500).send('Server Error');
  }
};

// Placeholder function for generating an article from a template
exports.generateFromTemplate = async (req, res) => {
  const { templateType, userPrompt } = req.body;

  console.log(`POST /api/ai/generate/from-template called with type: ${templateType}`);
  if (userPrompt) console.log(`User Prompt: ${userPrompt}`);

  if (!templateType) {
    return res.status(400).json({ msg: 'Template type is required.' });
  }

  try {
    // --- AI Model Call Placeholder ---
    let prompt = "";
    let generatedTitle = `AI Generated ${templateType}`; 
    let generatedContent = ``;
    const baseInstruction = "Generate a wiki article based on the following template type and details. Format the output in Markdown.";

    if (templateType === 'npc') {
      prompt = `${baseInstruction}
Template: NPC
Details: ${userPrompt || 'A generic non-player character'}

Output Format:
## Name
[Generated Name]

## Appearance
[Generated Description]

## Personality
[Generated Description]

## History/Background
[Generated Description]

## Notes
[Any extra details]`;
      generatedTitle = `AI NPC: ${userPrompt || 'Random Character'}`;
      generatedContent = `<h3>Name</h3><p>Bartholomew "Barty" Bumble</p><h3>Appearance</h3><p>A short, stout individual with a perpetually flour-dusted apron and kind eyes.</p><h3>Personality</h3><p>Generally cheerful, but fiercely protective of his secret sourdough recipe.</p><h3>History/Background</h3><p>Inherited the village bakery from his grandfather. Rumored to have once wrestled a bread golem.</p><h3>Notes</h3><p>Weakness for sweet rolls. (Simulated AI NPC based on: ${userPrompt || 'generic'})</p>`;

    } else if (templateType === 'location') {
       prompt = `${baseInstruction}
Template: Location
Details: ${userPrompt || 'A generic fantasy location'}

Output Format:
## Location Name
[Generated Name]

## Description
[Generated Description]

## Key Features
[Generated List]

## History
[Generated Description]

## Inhabitants
[Generated Description]`;
      generatedTitle = `AI Location: ${userPrompt || 'Random Place'}`;
      generatedContent = `<h3>Location Name</h3><p>The Whispering Caves</p><h3>Description</h3><p>A network of damp, echoing caverns known for strange acoustic properties.</p><h3>Key Features</h3><ul><li>Bioluminescent fungi</li><li>Underground river</li><li>Hidden waterfall chamber</li></ul><h3>History</h3><p>Once used by smugglers, now largely unexplored.</p><h3>Inhabitants</h3><p>Mainly bats, cave crickets, and perhaps something older... (Simulated AI Location based on: ${userPrompt || 'generic'})</p>`;
    } else {
      return res.status(400).json({ msg: 'Invalid template type.' });
    }

    console.log("Simulating AI call with template prompt:"); // Prompt can be long, maybe don't log all?
    await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate longer generation time
    // --- End Placeholder ---

    // Save the generated content as a new article
    const newArticle = new Article({
      title: generatedTitle,
      body: generatedContent,
      tags: [templateType, 'ai-generated'] // Add relevant tags
      // TODO: Add user ID
    });

    const savedArticle = await newArticle.save();
    console.log("Saved generated article:", savedArticle._id);
    res.status(201).json(savedArticle);

  } catch (err) {
    console.error(`Error generating from template ${templateType}:`, err);
    res.status(500).send('Server Error');
  }
};

// TODO: Add other AI-related controller functions later 