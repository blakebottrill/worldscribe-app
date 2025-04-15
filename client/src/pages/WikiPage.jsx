import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';
import ArticleList from '../components/wiki/ArticleList';
import ArticleEditor from '../components/wiki/ArticleEditor';
import ArticleLinkModal from '../components/common/ArticleLinkModal';
import './WikiPage.css';

// --- API Functions ---
const fetchArticlesAPI = async () => {
  const response = await fetch('http://localhost:5001/api/articles');
  if (!response.ok) {
    throw new Error('Failed to fetch articles');
  }
  const data = await response.json();
  return data.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
};

const createArticleAPI = async (articleData) => {
  const response = await fetch('http://localhost:5001/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(articleData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ msg: 'Failed to create article' }));
    throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

const updateArticleAPI = async ({ articleId, articleData }) => {
  const response = await fetch(`http://localhost:5001/api/articles/${articleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(articleData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ msg: 'Failed to update article' }));
    throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

const deleteArticleAPI = async (articleId) => {
  const response = await fetch(`http://localhost:5001/api/articles/${articleId}`, { method: 'DELETE' });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ msg: 'Failed to delete article' }));
    throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
  }
  return { success: true, deletedId: articleId };
};

const syncArticleIconToPinsAPI = async ({ articleId, icon, iconId }) => {
  console.log(`API: Syncing icon for Article ${articleId} to pins`);
  // This endpoint needs to be implemented on the backend
  // It should find all pins across all maps linked to articleId and update their icon/iconId
  const response = await fetch(`http://localhost:5001/api/articles/${articleId}/sync-icon-to-pins`, { // Add full base URL
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ icon, iconId }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ msg: 'Failed to sync icon to pins' }));
    throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
  }
  return response.json(); // Should indicate success/number of pins updated
};

const generateArticleAPI = async ({ template, prompt }) => {
    const response = await fetch('http://localhost:5001/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, prompt }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate content');
    }
    return response.json(); // Returns the generated { title, body, tags, icon? }
};

// --- End API Functions ---

const WikiPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- State Hooks ---
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [editingArticleData, setEditingArticleData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('npc');
  const [userPrompt, setUserPrompt] = useState('');
  const [showEditorLinkModal, setShowEditorLinkModal] = useState(false);
  const [editorLinkRange, setEditorLinkRange] = useState(null);
  const [editorInstance, setEditorInstance] = useState(null);

  // --- React Query Hooks ---
  const { data: articles = [], isLoading, error } = useQuery({
    queryKey: ['articles'],
    queryFn: fetchArticlesAPI,
  });

  // --- React Query Mutations ---

  // Mutation for syncing article icon changes TO pins
  const syncArticleIconToPinsMutation = useMutation({
      mutationFn: syncArticleIconToPinsAPI,
      onSuccess: (data) => {
          console.log("Icon sync to pins successful:", data);
          queryClient.invalidateQueries({ queryKey: ['maps'] });
          queryClient.invalidateQueries({ queryKey: ['map'] }); 
      },
      onError: (err) => {
          console.error("Error syncing icon to pins:", err);
          toast.error(`Failed to sync icon to pins: ${err.message}`);
      }
  });

  const saveArticleMutation = useMutation({
    mutationFn: (articleData) => {
      const { _id, ...payload } = articleData;
      // Ensure tags are passed as an array if they exist as a string
      const finalPayload = { ...payload };
      if (typeof payload.tags === 'string') {
        finalPayload.tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean);
      }
      
      if (String(_id).startsWith('temp-')) {
        return createArticleAPI(finalPayload); // Create
      } else {
        return updateArticleAPI({ articleId: _id, articleData: finalPayload }); // Update
      }
    },
    onMutate: async (articleData) => {
      const { _id, ...payload } = articleData;
      const isCreating = String(_id).startsWith('temp-');
      const tempId = isCreating ? _id : null;
      
      // Convert tags string to array for optimistic update payload
      const optimisticPayload = { ...payload };
      if (typeof payload.tags === 'string') {
        optimisticPayload.tags = payload.tags.split(',').map(t=>t.trim()).filter(Boolean);
      }

      await queryClient.cancelQueries({ queryKey: ['articles'] });
      const previousArticles = queryClient.getQueryData(['articles']);
      const previousArticleData = previousArticles?.find(a => a._id === _id);

      // Optimistic Update
      queryClient.setQueryData(['articles'], (old = []) => {
        let newArticles;
        if (isCreating) {
          // Add temp article with essential fields
          const optimisticArticle = { 
            ...optimisticPayload, 
            _id: tempId, 
            title: optimisticPayload.title || 'Untitled' // Ensure title exists 
          }; 
          newArticles = [optimisticArticle, ...old];
        } else {
          // Update existing article
          newArticles = old.map(article =>
            article._id === _id 
            ? { ...article, ...optimisticPayload, title: optimisticPayload.title || article.title } // Merge, ensure title exists
            : article
          );
        }
        // Sort optimistically updated list
        return newArticles.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      });

      // Keep editor state synced (use original string tags for editor)
      setEditingArticleData({ ...payload, _id: _id }); 
      setSelectedArticleId(_id);

      // Return context including previous article data for icon check
      return { previousArticles, tempId, previousArticleData };
    },
    onError: (err, articleData, context) => {
      console.error("Error saving article:", err);
      toast.error(`Failed to save article: ${err.message}`);
      // Rollback
      if (context?.previousArticles) {
        queryClient.setQueryData(['articles'], context.previousArticles);
      }
      // If creation failed, clear editor if it still shows temp data
      if (context?.tempId && editingArticleData?._id === context.tempId) {
        handleCancelEdit(); // Use cancel handler to potentially remove temp item
      }
    },
    onSuccess: (savedArticle, articleData, context) => {
      const isCreating = !!context?.tempId;
      
      // Update cache with server data (replaces temp or updates existing)
      queryClient.setQueryData(['articles'], (old = []) => {
        const updatedArticles = old.map(article => 
          article._id === (isCreating ? context.tempId : savedArticle._id) 
            ? savedArticle // Use the complete data from server
            : article
        );
        // Ensure the list remains sorted
        return updatedArticles.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      });
       
      // --- Trigger Icon Sync if needed ---
      const previousIcon = context?.previousArticleData?.icon;
      const previousIconId = context?.previousArticleData?.iconId;
      const currentIcon = savedArticle.icon;
      const currentIconId = savedArticle.iconId; // Backend should ensure iconId is set/updated

      // Check if icon actually changed (and it's not a new article)
      if (!isCreating && savedArticle._id && (previousIcon !== currentIcon || previousIconId !== currentIconId)) {
           if (currentIcon && currentIconId) {
               console.log(`Icon changed for ${savedArticle._id}. Triggering sync to pins...`);
               // Re-enable the call to the backend endpoint
               // /*
               syncArticleIconToPinsMutation.mutate({ 
                   articleId: savedArticle._id, 
                   icon: currentIcon, 
                   iconId: currentIconId 
               });
               // */
              // console.warn("Backend endpoint for icon sync to pins is not yet implemented. Sync skipped."); // Remove warning
           } else {
                console.warn("Icon changed but new icon/iconId missing, cannot sync.");
           }
      }
      // --- End Trigger Icon Sync ---
      
      // Update editor state with real ID and data (tags as string)
      setEditingArticleData({ ...savedArticle, tags: savedArticle.tags?.join(', ') || '' });
      setSelectedArticleId(savedArticle._id);
    },
    onSettled: (savedArticle, error, articleData, context) => {
      // Invalidate to ensure consistency, especially if sorting or other derived state changes
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      
      // TODO: Handle icon sync logic - trigger another mutation if icon changed
      // Example check (requires storing previous icon state or comparing in onMutate context):
      // if (articleData.icon !== context?.previousArticle?.icon) { 
      //    iconSyncMutation.mutate({ articleId: savedArticle._id, icon: savedArticle.icon, iconId: savedArticle.iconId });
      // }
    },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: deleteArticleAPI,
    onMutate: async (articleIdToDelete) => {
      await queryClient.cancelQueries({ queryKey: ['articles'] });
      const previousArticles = queryClient.getQueryData(['articles']);

      // Optimistic remove
      queryClient.setQueryData(['articles'], (old = []) => 
        old.filter(article => article._id !== articleIdToDelete)
      );

      // Store the article being deleted in context for potential rollback
      const deletedArticle = previousArticles?.find(a => a._id === articleIdToDelete);

      // If deleting the selected article, clear editor
      if (selectedArticleId === articleIdToDelete) {
        setEditingArticleData(null);
        setSelectedArticleId(null);
      }

      return { previousArticles, deletedArticle };
    },
    onError: (err, articleId, context) => {
      console.error("Error deleting article:", err);
      toast.error(`Failed to delete article: ${err.message}`);
      if (context?.previousArticles) {
        // Restore previous articles on error
        queryClient.setQueryData(['articles'], context.previousArticles);
      }
      // If rollback happens and deleted article was selected, attempt to re-select it
      if (context?.deletedArticle && articleId === selectedArticleId) {
         handleSelectArticle(context.deletedArticle); // Reselect the article
      }
    },
    onSuccess: (data, articleId) => {
      if (editingArticleData?._id === articleId) {
        setEditingArticleData(null);
        setSelectedArticleId(null);
      }
    },
    onSettled: () => {
      // Invalidate to ensure data consistency after delete attempt
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });

  // Mutation for AI Generation
  const generateArticleMutation = useMutation({
      mutationFn: generateArticleAPI,
      onSuccess: (generatedArticle) => {
          const tempId = `temp-${Date.now()}`;
          const articlePayload = {
              _id: tempId,
              title: generatedArticle.title || 'Generated Article',
              body: generatedArticle.body || '',
              // Handle potential string/array tags from AI
              tags: Array.isArray(generatedArticle.tags) 
                    ? generatedArticle.tags.join(',') 
                    : (generatedArticle.tags || ''),
              icon: generatedArticle.icon || 'FaBook'
          };
          saveArticleMutation.mutate(articlePayload);
          // Editor will be set via saveArticleMutation's onSuccess/onMutate
          setUserPrompt(''); // Reset prompt
      },
      onError: (err) => {
          console.error("AI Generation failed:", err);
          toast.error(`AI Generation failed: ${err.message}`);
      },
      // onSettled: () => { // No specific cleanup needed here? }
  });

  // Filter articles based on search term (uses data from useQuery)
  const filteredArticles = articles.filter(article => {
    const term = searchTerm.toLowerCase();
    const titleMatch = (article.title || '').toLowerCase().includes(term);
    const bodyMatch = (article.body || '').toLowerCase().includes(term);
    const tagsMatch = Array.isArray(article.tags) && article.tags.some(tag => tag.toLowerCase().includes(term));
    return titleMatch || bodyMatch || tagsMatch;
  });

  // Effect to deselect if filtered out (based on editingArticleData)
  useEffect(() => {
    if (editingArticleData && editingArticleData._id && !String(editingArticleData._id).startsWith('temp-') && !filteredArticles.some(a => a._id === editingArticleData._id)) {
      console.log("Clearing editor because selected article is no longer in the filtered list.");
      setEditingArticleData(null);
      setSelectedArticleId(null);
    }
  }, [filteredArticles, editingArticleData]);

  // Effect to handle selection via navigation state (sets editingArticleData)
  useEffect(() => {
    if (!isLoading && articles.length > 0 && location.state?.selectedArticleId) {
      const articleIdFromNav = location.state.selectedArticleId;
      if (articleIdFromNav !== selectedArticleId) {
        const articleToEdit = articles.find(a => a._id === articleIdFromNav);
       if (articleToEdit) {
         console.log("Selecting article to edit from navigation state:", articleToEdit.title);
          handleSelectArticle(articleToEdit); // Use the select handler
          navigate(location.pathname, { replace: true, state: {} });
        } else {
          console.warn(`Article with ID ${articleIdFromNav} not found.`);
          toast.error(`Could not find the linked article.`);
          navigate(location.pathname, { replace: true, state: {} });
        }
      }
    }
  }, [articles, isLoading, location.state, location.pathname, navigate, selectedArticleId]);

  // Select Article: Now directly sets data for the editor
  const handleSelectArticle = (article) => {
    if (!article || article._id === selectedArticleId) return;
    console.log("Selected article to edit:", article.title);
    setEditingArticleData({
        _id: article._id, 
        title: article.title,
        body: article.body,
        icon: article.icon || 'FaBook',
        tags: Array.isArray(article.tags) ? article.tags.join(', ') : '' // Ensure tags is string for editor
    });
    setSelectedArticleId(article._id);
  };

  // REFACTORED: Add New - Sets editor state, relies on save mutation for actual creation/optimistic add
  const handleAddNewClick = () => {
    // Prevent adding another new one if already editing a temp one
    if (editingArticleData && String(editingArticleData._id).startsWith('temp-')) {
        toast("Save or cancel the current new article first.");
        // Optionally focus the editor or title field here
        return;
    }
    
    const tempId = `temp-${Date.now()}`;
    const newArticleData = {
      _id: tempId, 
      title: 'Untitled', 
      body: '',
      tags: '', // Editor expects string
      icon: 'FaBook'
    };
    // Set for editing. The save mutation's onMutate will add it optimistically.
    setEditingArticleData(newArticleData);
    setSelectedArticleId(tempId);
    // TODO: Focus title input in ArticleEditor? (might require passing a ref)
  };

  // REFACTORED: Delete Click - Calls the mutation
  const handleDeleteClick = (articleToDelete) => {
    if (!articleToDelete?._id) return;

    // Handle deleting unsaved new articles locally by cancelling
    if (String(articleToDelete._id).startsWith('temp-')) {
        handleCancelEdit(); 
        return;
    }

    // Confirm and trigger mutation for saved articles
    if (window.confirm(`Are you sure you want to delete "${articleToDelete.title || 'this article'}"?`)) {
        deleteArticleMutation.mutate(articleToDelete._id);
    }
  };

  // REFACTORED: Cancel Edit - Clears editor state, removes temp article from cache if needed
  const handleCancelEdit = () => {
    const currentEditingId = editingArticleData?._id;
    
    // Check if cancelling a temporary (unsaved) article
    if (currentEditingId && String(currentEditingId).startsWith('temp-')) {
        // Manually remove the optimistically added temp article if it exists in cache
        // It might have been added by saveArticleMutation's onMutate
        queryClient.setQueryData(['articles'], (old = []) => {
            const exists = old.some(article => article._id === currentEditingId);
            if (exists) {
                console.log("Removing temporary article from cache on cancel:", currentEditingId);
                return old.filter(article => article._id !== currentEditingId);
            }
            return old; // Return unchanged if temp article wasn't found (already saved or removed)
        });
    }
    // Always clear editor state on cancel
    setEditingArticleData(null);
    setSelectedArticleId(null);
  };

  // REFACTORED: Save Article - Triggered by editor, calls the save mutation
  const handleSaveArticle = (articleDataFromEditor) => {
    // Ensure required fields have default values if empty
    const dataToSave = {
        ...articleDataFromEditor,
        title: articleDataFromEditor.title || 'Untitled', // Ensure title is not empty
        // Backend should handle timestamps
    };
    // Trigger the mutation
    saveArticleMutation.mutate(dataToSave);
    
    // TODO: Move icon syncing logic here or make it a separate mutation
    // Consider triggering after onSuccess of the saveArticleMutation if the icon changed.
    // Example: Find previous article data in onMutate context
    // if (savedArticle.icon !== context?.previousArticleData?.icon) { triggerIconSyncMutation(...) }
  };

  // REFACTORED: AI Generation - Calls generate mutation
  const handleGenerateFromTemplate = () => {
     console.log("Generate from template clicked");
     // Trigger the mutation, loading state is handled by isPending
     generateArticleMutation.mutate({ template: selectedTemplate, prompt: userPrompt });
  };

  // Handler to be called by Tiptap mention command
  const handleShowEditorLinkModal = (editor, range) => {
    setEditorInstance(editor);
    setEditorLinkRange(range);
    setShowEditorLinkModal(true);
  };

  // Handler for modal selection (for editor mentions)
  const handleEditorModalSelect = (selectedArticle) => {
    if (editorInstance && editorLinkRange && selectedArticle) {
      // Remove the @ character first
      editorInstance.chain().focus()
        .deleteRange(editorLinkRange)
        .run();
        
      // Insert the mention mark with the article ID and title
      editorInstance.chain().focus()
        .insertContent({
          type: 'text',
          text: selectedArticle.title,
          marks: [
            {
              type: 'mentionMark',
              attrs: {
                id: selectedArticle._id,
                label: selectedArticle.title
              }
            }
          ]
        })
        .insertContent(' ') // Add a space after the mention
        .run();
    }
    setShowEditorLinkModal(false);
    setEditorInstance(null);
    setEditorLinkRange(null);
  };

  // Realtime title update handler (passed to editor)
  const handleTitleChangeRealtime = (newTitle) => {
    // Update list optimistically for immediate feedback in the list view
    if (editingArticleData?._id) {
        queryClient.setQueryData(['articles'], (old = []) => {
            let changed = false;
            const newArticles = old.map(article => {
                if (article._id === editingArticleData._id) {
                    if (article.title !== newTitle) {
                        changed = true;
                        return { ...article, title: newTitle };
                    }
                }
                return article;
            });
            // Only update query data if a change occurred and sort
            return changed ? newArticles.sort((a, b) => (a.title || '').localeCompare(b.title || '')) : old;
        });
    }
  };

  // Mention click handler (passed to editor)
  const handleMentionClick = (articleId) => {
    console.log("Mention clicked, selecting article ID:", articleId);
    const articleToSelect = articles.find(a => a._id === articleId);
    if (articleToSelect) {
      handleSelectArticle(articleToSelect);
    } else {
      toast.error("Linked article not found!");
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
          <button 
            onClick={handleGenerateFromTemplate} 
            // Disable if generating or saving
            disabled={generateArticleMutation.isPending || saveArticleMutation.isPending} 
            style={{width: '100%'}}
          >
            {/* Show spinner based on generation mutation state */}
            {generateArticleMutation.isPending ? <FaSpinner className="spinner"/> : 'Generate'}
          </button>
        </div>
        
        <div className="wiki-article-list-container">
           {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                 <FaSpinner className="spinner" size={24} />
              </div>
            )}
           {error && <p className="error-message" style={{ padding: '0 10px' }}>Error: {error.message}</p>}
           {!isLoading && !error && (
             <ArticleList 
               articles={filteredArticles} 
               selectedArticleId={selectedArticleId}
               onSelectArticle={handleSelectArticle} 
               onDelete={handleDeleteClick}
             />
           )}
        </div>

        <div className="wiki-left-pane-footer">
           <button 
                onClick={handleAddNewClick} 
                style={{width: '100%'}} 
                disabled={saveArticleMutation.isPending || deleteArticleMutation.isPending} // Disable if saving/deleting
            >
                + New Article
            </button>
        </div>

      </div>

      {/* Right Pane: View/Edit Article or Welcome Message */}
      <div className="wiki-right-pane">
        {editingArticleData ? (
          <ArticleEditor 
            key={selectedArticleId || 'new'}
            initialData={editingArticleData}
            articles={articles} 
            onSave={handleSaveArticle} 
            onCancel={handleCancelEdit} 
            onShowMentionLinkModal={handleShowEditorLinkModal}
            onDelete={() => handleDeleteClick(editingArticleData)} 
            onTitleChangeRealtime={handleTitleChangeRealtime} 
            onMentionClick={handleMentionClick}
            isSaving={saveArticleMutation.isPending}
          />
        ) : (
          <div className="welcome-message">
            <h2>Welcome to Worldscribe</h2>
            <p>Select an article from the sidebar or create a new one to get started with your worldbuilding journey.</p>
          </div>
        )}
      </div>

      {/* Modal remains outside the main layout panes */}
      {showEditorLinkModal && editorInstance && (
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