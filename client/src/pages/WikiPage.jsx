import React, { useState, useEffect } from 'react';
import ArticleList from '../components/wiki/ArticleList';
import ArticleView from '../components/wiki/ArticleView';
import ArticleEditor from '../components/wiki/ArticleEditor';
// import MarkdownEditor from '../components/wiki/MarkdownEditor'; // We'll add this later

const WikiPage = () => {
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingArticleData, setEditingArticleData] = useState(null);
  const [searchTerm, setSearchTerm] = useState(""); // State for search term

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
    } catch (e) {
      console.error("Failed to fetch articles:", e);
      setError('Failed to load articles. Please ensure the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

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

    console.log(`Saving article (Method: ${method}):`, articleData);
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Wiki</h1>
        <button onClick={handleAddNewClick} disabled={isEditing}>+ New Article</button>
      </div>
      
      {/* Add Search Input */} 
      <div style={{ margin: '1rem 0' }}>
        <input 
          type="text"
          placeholder="Search articles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} 
        />
      </div>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {isEditing && editingArticleData && (
        <ArticleEditor 
          initialData={editingArticleData}
          articles={articles}
          onSave={handleSaveArticle} 
          onCancel={handleCancelEdit}
        />
      )}
      
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
  );
};

export default WikiPage; 