import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ArticleList from '../components/wiki/ArticleList';
// import ArticleView from '../components/wiki/ArticleView'; // Remove view for now
import ArticleEditor from '../components/wiki/ArticleEditor';
import ArticleLinkModal from '../components/common/ArticleLinkModal';
// import PinEditModal from '../components/atlas/PinEditModal'; // Remove this leftover import
// import MarkdownEditor from '../components/wiki/MarkdownEditor'; // We'll add this later
import './WikiPage.css';

const WikiPage = () => {
  const location = useLocation();
  const [articles, setArticles] = useState([]);
  const [selectedArticleId, setSelectedArticleId] = useState(null); // Track ID for list selection
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingArticleData, setEditingArticleData] = useState(null); // This is now the primary state for the right pane
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState('npc');
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

  // Effect to deselect if filtered out (based on editingArticleData now)
  useEffect(() => {
    if (editingArticleData && !filteredArticles.some(a => a._id === editingArticleData._id)) {
      setEditingArticleData(null); // Clear editor if article disappears from list
      setSelectedArticleId(null);
    }
  }, [filteredArticles, editingArticleData]);

  // Effect to handle selection via navigation state (sets editingArticleData)
  useEffect(() => {
     if (location.state?.selectedArticleId && articles.length > 0) {
       const articleToEdit = articles.find(a => a._id === location.state.selectedArticleId);
       if (articleToEdit) {
         console.log("Selecting article to edit from navigation state:", articleToEdit.title);
         setEditingArticleData({ // Set data for editor
           _id: articleToEdit._id, 
           title: articleToEdit.title,
           body: articleToEdit.body,
           icon: articleToEdit.icon || 'FaBook', // *** Include Icon ***
           tags: articleToEdit.tags ? articleToEdit.tags.join(', ') : ''
         });
         setSelectedArticleId(articleToEdit._id);
         window.history.replaceState({}, document.title);
       }
     }
   }, [articles, location.state]);

  // Select Article: Now directly sets data for the editor
  const handleSelectArticle = (article) => {
    console.log("Selected article to edit:", article.title);
    setEditingArticleData({
        _id: article._id, 
        title: article.title,
        body: article.body,
        icon: article.icon || 'FaBook', // *** Include Icon ***
        tags: article.tags ? article.tags.join(', ') : ''
    });
    setSelectedArticleId(article._id);
  };

  // Add New: Clears selection, sets blank data for editor
  const handleAddNewClick = () => {
    setEditingArticleData({ title: '', body: '', tags: '' });
    setSelectedArticleId(null); // Ensure no item is highlighted
  };

  // Delete Click: Needs to clear editor if deleting the edited article
  const handleDeleteClick = async (articleToDelete) => { // Pass the article to delete
    if (!articleToDelete) return; 

    if (window.confirm(`Are you sure you want to delete "${articleToDelete.title}"?`)) {
      console.log(`Deleting article with ID: ${articleToDelete._id}`);
      setError(null);
      try {
        const response = await fetch(`http://localhost:5001/api/articles/${articleToDelete._id}`, { method: 'DELETE' });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ msg: 'Failed to delete article' }));
          throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
        }
        // If delete is successful, update state
        if (editingArticleData?._id === articleToDelete._id) { // Check if deleting the one being edited
            setEditingArticleData(null); // Clear editor
            setSelectedArticleId(null);
        }
        // Fetch articles again to update the list (simplest way)
        await fetchArticles(); 
      } catch (e) {
        console.error("Failed to delete article:", e);
        setError(`Failed to delete article: ${e.message}`);
      }
    }
  };

  // Cancel Edit: Now clears the editor pane
  const handleCancelEdit = () => {
    setEditingArticleData(null);
    setSelectedArticleId(null);
  };

  // Save Article: Update state locally on update, refetch only on create
  const handleSaveArticle = async (articleData) => {
    const isUpdating = editingArticleData && editingArticleData._id;
    const articleId = isUpdating ? editingArticleData._id : null;
    const url = isUpdating 
      ? `http://localhost:5001/api/articles/${articleId}` 
      : 'http://localhost:5001/api/articles';
    const method = isUpdating ? 'PUT' : 'POST';

    console.log(`Saving article (Method: ${method}) - Body:`, articleData.body.substring(0,50)); // Log less
    setError(null);
    // We don't set isSaving state here anymore, editor handles its own status
    
    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ // Only send fields being saved
          title: articleData.title,
          body: articleData.body,
          tags: articleData.tags, // Assuming tags are sent as comma-separated string
          icon: articleData.icon, // *** Add the icon field ***
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ msg: `Failed to ${isUpdating ? 'update' : 'save'} article` }));
        throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
      }
      const savedArticle = await response.json();

      if (isUpdating) {
        // Update state locally for the edited article
        setArticles(prevArticles => 
          prevArticles.map(a => 
            a._id === savedArticle._id ? savedArticle : a
          )
        );
        // Update the editor data to reflect saved state (including potentially new updatedAt)
        setEditingArticleData(prev => ({...prev, ...savedArticle, tags: savedArticle.tags?.join(', ') || ''}));
        setSelectedArticleId(savedArticle._id);
        console.log("Local state updated after save.");
      } else {
        // Refetch the whole list only when creating a new article
        await fetchArticles(); 
        // Set the new article as the one being edited
        setEditingArticleData({ ...savedArticle, tags: savedArticle.tags?.join(', ') || ''});
        setSelectedArticleId(savedArticle._id);
        console.log("Refetched articles after creating new.");
      }
      
      // The ArticleEditor component handles its own save status UI
      // So no need to return anything specific here unless error handling needs it.

    } catch (e) {
      console.error(`Failed to ${isUpdating ? 'update' : 'save'} article:`, e);
      setError(`Failed to ${isUpdating ? 'update' : 'save'} article: ${e.message}`);
      // Rethrow the error so the editor component knows save failed
      throw e; 
    }
  };

  // Generate From Template: Should also select the new article for editing
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
      setUserPrompt('');
      await fetchArticles(); 
      // Select the newly generated article for editing
      handleSelectArticle(newArticle); 

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
    <div className="wiki-page-layout">
      {/* Left Pane: Search, Tabs, AI Gen, List */}
      <div className="wiki-left-pane">
        <div className="wiki-search-bar">
          <input 
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {/* Consider adding a clear button */}
        </div>

        {/* AI Generation Section - Moved here */}
        <div className="ai-generation-section">
          <h4>Generate Article (AI)</h4>
          <select 
             value={selectedTemplate} 
             onChange={e => setSelectedTemplate(e.target.value)} 
             style={{ marginBottom: '10px', width: '100%' }}
          >
             <option value="npc">NPC</option>
             <option value="location">Location</option>
             <option value="item">Item</option>
             <option value="event">Event</option>
             {/* Add more templates as needed */}
          </select>
          <textarea
            placeholder={`Brief prompt (e.g., ${selectedTemplate === 'npc' ? 'Dwarf blacksmith, Haunted forest' : 'Describe the location...'})`}
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={3}
            style={{ marginBottom: '10px', width: '100%' }}
          />
          <button onClick={handleGenerateFromTemplate} disabled={isGenerating || !userPrompt} style={{width: '100%'}}>
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
        
        <div className="wiki-article-list-container">
           {isLoading && <p>Loading articles...</p>}
           {error && <p className="error-message">Error: {error}</p>}
           {!isLoading && !error && (
             <ArticleList 
               articles={filteredArticles} 
               selectedArticleId={selectedArticleId} // Pass ID for highlighting
               onSelectArticle={handleSelectArticle} 
             />
           )}
        </div>

        <div className="wiki-left-pane-footer">
           <button onClick={handleAddNewClick} style={{width: '100%'}}>+ New Article</button>
        </div>

      </div>

      {/* Right Pane: View/Edit Article or Welcome Message */}
      <div className="wiki-right-pane">
        {editingArticleData ? (
          <ArticleEditor 
            key={editingArticleData._id || 'new'} // Key ensures re-mount when switching articles
            initialData={editingArticleData}
            articles={articles} 
            onSave={handleSaveArticle} 
            onCancel={handleCancelEdit} 
            onShowMentionLinkModal={handleShowEditorLinkModal}
            // Add onDelete prop to editor?
            onDelete={() => handleDeleteClick(editingArticleData)} // Pass delete handler for the current article
          />
        ) : (
          <div className="welcome-message">
            <h2>Welcome to Worldscribe</h2>
            <p>Select an article from the sidebar or create a new one to get started with your worldbuilding journey.</p>
          </div>
        )}
      </div>

      {/* Modal remains outside the main layout panes */}
      {showEditorLinkModal && (
        <ArticleLinkModal
          articles={articles} 
          currentArticleId={null}
          onSelectArticle={handleEditorModalSelect}
          onClose={() => { setShowEditorLinkModal(false); /* ... other cleanup */ }}
        />
      )}
    </div>
  );
};

export default WikiPage; 