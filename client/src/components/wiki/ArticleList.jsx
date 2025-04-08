import React from 'react';
import * as FaIcons from 'react-icons/fa'; // Import all FaIcons
import './ArticleList.css'; // Keep CSS for item styling

// Helper to get icon component from name, defaulting to FaBook
const getIconComponent = (iconName) => {
  return FaIcons[iconName] || FaIcons.FaBook;
};

// Simplified component: receives articles and handler, renders list items.
const ArticleList = ({ articles, selectedArticleId, onSelectArticle }) => {
  
  // If no articles match search/filters (after loading), show message
  if (articles.length === 0) {
    return <p className="no-articles-message">No articles found.</p>;
  }

  return (
    <ul className="article-list"> {/* Use class instead of inline style */} 
      {articles.map(article => {
        const IconComponent = getIconComponent(article.icon); // Get icon for this article
        return (
          <li 
            key={article._id} 
            className={`article-list-item ${selectedArticleId === article._id ? 'selected' : ''}`}
          >
            {/* Make the whole item clickable */}
            <button onClick={() => onSelectArticle(article)} className="article-list-button">
              {/* Add icon before title */}
              <div className="article-list-item-content">
                <span className="article-list-icon"><IconComponent /></span>
                <span className="article-title">{article.title}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default ArticleList; 