import React, { useEffect, useRef } from 'react';
import { FaTag } from 'react-icons/fa'; // Import tag icon
import './ArticleView.css'; // Add CSS file for view-specific styles
// Remove ReactMarkdown and pre-processing logic
// import ReactMarkdown from 'react-markdown';
// const mentionRegex = /@([a-zA-Z0-9\s-]+)/g;
// const preprocessMarkdown = ... 

// Component receives articles and onSelectArticle again
const ArticleView = ({ article, articles, onSelectArticle, onEdit, onDelete }) => {
  const viewStyles = {
    flexGrow: 1, 
    padding: '10px 20px',
    height: 'calc(100vh - 150px)', 
    overflowY: 'auto'
  };
  const contentRef = useRef(null); // Ref to access the content container DOM node

  useEffect(() => {
    const container = contentRef.current;
    if (!container || !articles || !onSelectArticle) return; // Guard

    const handleClick = (event) => {
      // Find the closest ancestor span with the data-mention-id attribute
      const mentionSpan = event.target.closest('span[data-mention-id]');
      
      if (mentionSpan) {
        event.preventDefault(); // Prevent any default behavior
        const mentionId = mentionSpan.getAttribute('data-mention-id');
        // const mentionLabel = mentionSpan.getAttribute('data-mention-label'); // Label if needed
        
        console.log('Clicked mention span, ID:', mentionId);
        
        // Find the corresponding article object using the ID
        const targetArticle = articles.find(a => a._id === mentionId);
        
        if (targetArticle) {
          console.log('Found target article:', targetArticle.title);
          onSelectArticle(targetArticle);
        } else {
          console.warn('Clicked mention, but target article not found in list for ID:', mentionId);
          // Optionally indicate a broken link visually here if needed
        }
      }
    };

    // Add the event listener
    container.addEventListener('click', handleClick);

    // Cleanup: remove the event listener when component unmounts or dependencies change
    return () => {
      container.removeEventListener('click', handleClick);
    };

  }, [article, articles, onSelectArticle]); // Rerun if article, articles list, or handler changes

  if (!article) {
    return <div style={viewStyles}><p>Select an article to view its content.</p></div>;
  }

  // Remove processedBody calculation
  // const processedBody = preprocessMarkdown(article.body);

  return (
    <div className="article-view-container" style={viewStyles}>
      <div className="article-header">
        <h2>{article.title}</h2>
        <div className="article-actions">
          <button onClick={onEdit} style={{ marginRight: '10px' }}>Edit</button>
          <button onClick={onDelete} className="delete-button">Delete</button>
        </div>
      </div>
      
      {/* Render body content */} 
      <div 
        ref={contentRef} 
        className="tiptap-rendered-content article-body" 
        dangerouslySetInnerHTML={{ __html: article.body || '' }} 
      />
      
      {/* Render tags in the new style */}
      {article.tags && article.tags.length > 0 && (
        <div className="article-tags-container">
          {article.tags.map((tag, index) => (
            <span key={index} className="tag-pill">
              <FaTag className="tag-icon" /> {tag}
            </span>
          ))}
        </div>
      )}

      {/* Metadata (Optional, example) */}
      {/* 
      <div className="article-metadata"> 
         <span>Created: {new Date(article.createdAt).toLocaleString()}</span> 
         <span>Updated: {new Date(article.updatedAt).toLocaleString()}</span> 
      </div> 
      */}
    </div>
  );
};

export default ArticleView; 