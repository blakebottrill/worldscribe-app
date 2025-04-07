import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ArticleList from '../components/wiki/ArticleList';
import ArticleView from '../components/wiki/ArticleView';
import ArticleEditor from '../components/wiki/ArticleEditor';
import ArticleLinkModal from '../components/common/ArticleLinkModal';
// import PinEditModal from '../components/atlas/PinEditModal'; // Remove this leftover import
// import MarkdownEditor from '../components/wiki/MarkdownEditor'; // We'll add this later

const WikiPage = () => {
  const location = useLocation();
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingArticleData, setEditingArticleData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState('npc'); // Default template
  const [userPrompt, setUserPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showEditorLinkModal, setShowEditorLinkModal] = useState(false);
  const [editorLinkRange, setEditorLinkRange] = useState(null);
  const [editorInstance, setEditorInstance] = useState(null);

  // Fetch articles from the API
  const fetchArticles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Assuming your backend runs on port 5001 now
      const response = await fetch('http://localhost:5001/api/articles'); 
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setArticles(data);
      return data;
    } catch (e) {
      console.error("Failed to fetch articles:", e);
      setError('Failed to load articles. Please ensure the backend server is running.');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and handle navigation state
  useEffect(() => {
    const loadData = async () => {
      await fetchArticles();
      
      // Check for navigation state after articles are loaded
      if (location.state?.selectedArticleId) {
        console.log("Received article ID from navigation:", location.state.selectedArticleId);
        // Find the article in the newly fetched list
        // Need access to the raw articles list *before* filtering
        // We modify fetchArticles to return the data for this purpose
      }
    };
    loadData();
    // Clear location state after using it to prevent re-selection on refresh
    // Note: This might need adjustment depending on React Router version
    // window.history.replaceState({}, document.title) 

    // Dependency array should probably be empty or depend on location.key if needed
    // }, [location.state]); // This might cause loop if state isn't cleared properly
  }, []); // Run once on mount

  // Filter articles based on search term (case-insensitive)
  const filteredArticles = articles.filter(article => {
    const term = searchTerm.toLowerCase();
    const titleMatch = article.title.toLowerCase().includes(term);
    const bodyMatch = article.body.toLowerCase().includes(term);
    // Check if any tag matches the search term
    const tagsMatch = article.tags && article.tags.some(tag => tag.toLowerCase().includes(term));
    
    return titleMatch || bodyMatch || tagsMatch;
  });

  // Effect to deselect article if it's filtered out
  useEffect(() => {
    if (selectedArticle && !filteredArticles.some(a => a._id === selectedArticle._id)) {
      setSelectedArticle(null);
    }
    // Only re-run if the filtered list changes OR the selected article changes
  }, [filteredArticles, selectedArticle]);

  // Effect to handle selection via navigation state (runs *after* initial load)
  useEffect(() => {
     if (location.state?.selectedArticleId && articles.length > 0) {
       const articleToSelect = articles.find(a => a._id === location.state.selectedArticleId);
       if (articleToSelect) {
         console.log("Selecting article from navigation state:", articleToSelect.title);
         setSelectedArticle(articleToSelect);
         // Clear the state to prevent re-selection
         // This might not work reliably across all routers/browsers, state management lib is better
         window.history.replaceState({}, document.title) 
       }
     }
   }, [articles, location.state]); // Rerun if articles load OR location state changes

  const handleSelectArticle = (article) => {
    setSelectedArticle(article);
    setIsEditing(false);
    setEditingArticleData(null);
  };

  const handleAddNewClick = () => {
    setSelectedArticle(null);
    setEditingArticleData({ title: '', body: '', tags: '' });
    setIsEditing(true);
  };

  const handleEditClick = () => {
    if (!selectedArticle) return;
    setEditingArticleData({
      title: selectedArticle.title,
      body: selectedArticle.body,
      tags: selectedArticle.tags ? selectedArticle.tags.join(', ') : ''
    });
    setIsEditing(true);
  };

  const handleDeleteClick = async () => {
    if (!selectedArticle) return; // Should not happen

    if (window.confirm(`Are you sure you want to delete "${selectedArticle.title}"?`)) {
      console.log(`Deleting article with ID: ${selectedArticle._id}`);
      setError(null);
      try {
        const response = await fetch(`http://localhost:5001/api/articles/${selectedArticle._id}`, {
          method: 'DELETE',
          // TODO: Add Authorization header when auth is implemented
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ msg: 'Failed to delete article' }));
          throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
        }

        // If delete is successful, update state immediately
        setSelectedArticle(null); // Deselect the deleted article
        setArticles(articles.filter(a => a._id !== selectedArticle._id)); // Remove from list
        // No need to call fetchArticles() again if we update state locally

      } catch (e) {
        console.error("Failed to delete article:", e);
        setError(`Failed to delete article: ${e.message}`);
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingArticleData(null);
  };

  const handleSaveArticle = async (articleData) => {
    const isUpdating = selectedArticle && editingArticleData;
    const url = isUpdating 
      ? `http://localhost:5001/api/articles/${selectedArticle._id}` 
      : 'http://localhost:5001/api/articles';
    const method = isUpdating ? 'PUT' : 'POST';

    // *** Log the body HTML before sending ***
    console.log(`Saving article (Method: ${method}) - Body HTML being sent:`, articleData.body);
    setError(null);
    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(articleData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ msg: `Failed to ${isUpdating ? 'update' : 'save'} article` }));
        throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
      }

      const savedArticle = await response.json();

      setIsEditing(false);
      setEditingArticleData(null);
      await fetchArticles();
      
      setSelectedArticle(isUpdating ? savedArticle : (articles.find(a => a._id === savedArticle._id) || savedArticle));

    } catch (e) {
      console.error(`Failed to ${isUpdating ? 'update' : 'save'} article:`, e);
      setError(`Failed to ${isUpdating ? 'update' : 'save'} article: ${e.message}`);
    }
  };

  const handleGenerateFromTemplate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5001/api/ai/generate/from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateType: selectedTemplate, userPrompt }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ msg: 'Failed to generate article' }));
        throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
      }
      const newArticle = await response.json();
      console.log("Generated article:", newArticle);
      setUserPrompt(''); // Clear prompt input
      await fetchArticles(); // Refresh the list
      setSelectedArticle(newArticle); // Select the newly generated article
      setIsEditing(false); // Ensure we are in view mode

    } catch (e) {
      console.error("Failed to generate article:", e);
      setError(`Failed to generate article: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler to be called by Tiptap mention command
  const handleShowEditorLinkModal = (editor, range) => {
    if (!editor || !range) return;
    setEditorInstance(editor); // Store editor instance
    setEditorLinkRange(range); // Store range where @mention was triggered
    setShowEditorLinkModal(true); // Open the modal
  };

  // Handler for modal selection (for editor mentions)
  const handleEditorModalSelect = (selectedArticle) => {
    if (!editorInstance || !editorLinkRange) return;

    const range = editorLinkRange;
    const editor = editorInstance;

    setShowEditorLinkModal(false); 
    setEditorLinkRange(null);
    setEditorInstance(null);

    if (selectedArticle) {
      console.log('Applying mention mark for:', selectedArticle.title, 'ID:', selectedArticle._id);
      
      // Apply the mark to a text node
      editor.chain().focus()
        .deleteRange(range) // Delete the '@' trigger character
        .insertContent([
          // Create a text node with the label
          {
            type: 'text',
            text: selectedArticle.title, 
            // Apply the mentionMark to this text node
            marks: [
              {
                type: 'mentionMark', // Type of the mark
                attrs: { // Attributes for the mark
                  id: selectedArticle._id,
                  label: selectedArticle.title,
                }
              }
            ]
          },
          // Separate text node for the trailing space
          { type: 'text', text: ' ' } 
        ])
        .run();
    } else {
      console.log('Mention cancelled, deleting trigger');
      editor.chain().focus().deleteRange(range).run();
    }
  };

  return (
    <div className="wiki-page-container">
      <div className="wiki-sidebar">
        {/* Search and Add New Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <input 
            type="text" 
            placeholder="Search articles..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 'calc(100% - 110px)', marginRight: '10px' }} // Adjust width
          />
          <button onClick={handleAddNewClick} disabled={isEditing}>+ New Article</button>
        </div>

        {/* AI Generation Section */} 
        <div style={{ border: '1px solid #444', padding: '10px', marginBottom: '1rem', borderRadius: '4px' }}>
          <h4>Generate Article (AI)</h4>
          <select 
            value={selectedTemplate} 
            onChange={(e) => setSelectedTemplate(e.target.value)}
            style={{ width: '100%', marginBottom: '5px' }} 
            disabled={isGenerating}
          >
            <option value="npc">NPC</option>
            <option value="location">Location</option>
            {/* Add more template types later */}
          </select>
          <input 
            type="text"
            placeholder="Brief prompt (e.g., Dwarf blacksmith, Haunted forest)" 
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            style={{ width: '100%', marginBottom: '5px' }}
            disabled={isGenerating}
          />
          <button 
            onClick={handleGenerateFromTemplate} 
            disabled={isGenerating} 
            style={{ width: '100%' }}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>

        {/* Article List */}
        {!isEditing && isLoading ? (
          <p>Loading articles...</p>
        ) : !isEditing && (
          <div style={{ display: 'flex', gap: '20px' }}>
            <ArticleList 
              articles={filteredArticles}
              onSelectArticle={handleSelectArticle} 
              selectedArticleId={selectedArticle?._id}
            />
            {selectedArticle ? (
              <ArticleView 
                article={selectedArticle} 
                articles={articles}
                onSelectArticle={handleSelectArticle}
                onEdit={handleEditClick} 
                onDelete={handleDeleteClick}
              />
            ) : (
              <div style={{ flexGrow: 1, padding: '10px 20px' }}>
                <p>Select an article to view its content.</p>
              </div>
            )}
            {/* Placeholder for future editor integration */}
            {/* <MarkdownEditor /> */}
          </div>
        )}
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {isEditing && editingArticleData && (
        <ArticleEditor 
          initialData={editingArticleData}
          articles={articles}
          onSave={handleSaveArticle} 
          onCancel={handleCancelEdit}
          onShowMentionLinkModal={handleShowEditorLinkModal}
        />
      )}

      {/* Render Article Link Modal for Editor Mentions */}
      {showEditorLinkModal && (
        <ArticleLinkModal
          articles={articles} 
          currentArticleId={null} // No current link when triggering with @
          onSelectArticle={handleEditorModalSelect}
          onClose={() => {
            setShowEditorLinkModal(false);
            setEditorLinkRange(null);
            setEditorInstance(null);
            // Maybe insert placeholder or delete range if modal closed without selection?
            // editorInstance?.chain().focus().deleteRange(editorLinkRange).run(); 
          }} 
        />
      )}
    </div>
  );
};

export default WikiPage; 