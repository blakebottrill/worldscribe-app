import React from 'react';
import './ArticleList.css'; // Keep CSS for item styling

// Simplified component: receives articles and handler, renders list items.
const ArticleList = ({ articles, selectedArticleId, onSelectArticle }) => {
  
  // If no articles match search/filters (after loading), show message
  if (articles.length === 0) {
    return <p className="no-articles-message">No articles found.</p>;
  }

  return (
    <ul className="article-list"> {/* Use class instead of inline style */} 
      {articles.map(article => (
        <li 
          key={article._id} 
          className={`article-list-item ${selectedArticleId === article._id ? 'selected' : ''}`}
        >
          {/* Make the whole item clickable */}
          <button onClick={() => onSelectArticle(article)} className="article-list-button">
            <span className="article-title">{article.title}</span>
            {/* Optional: Add metadata like tags or updated date */} 
            {article.tags && article.tags.length > 0 && (
               <span className="article-tags">{article.tags.join(', ')}</span>
            )}
             <span className="article-date">{new Date(article.updatedAt || article.createdAt).toLocaleDateString()}</span>
          </button>
        </li>
      ))}
    </ul>
  );
};

export default ArticleList; 