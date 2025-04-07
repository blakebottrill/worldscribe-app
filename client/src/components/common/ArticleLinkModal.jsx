import React, { useState, useMemo } from 'react';

const ArticleLinkModal = ({ articles, currentArticleId, onSelectArticle, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredArticles = useMemo(() => {
    if (!searchTerm) {
      // Maybe show recently edited or a limited list initially?
      return articles.slice(0, 20); // Limit initial display
    }
    return articles.filter(article => 
      article.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [articles, searchTerm]);

  const currentArticle = articles.find(a => a._id === currentArticleId);

  // Same modal styles as PinEditModal for consistency
  const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 1050, // Higher than other modals if needed
  };
  const modalContentStyle = {
    background: '#333', color: '#eee', padding: '20px',
    borderRadius: '5px', width: '90%', maxWidth: '500px',
    maxHeight: '80vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
  };
  const listStyle = {
    listStyle: 'none', padding: 0, margin: '10px 0',
    overflowY: 'auto', flexGrow: 1,
    border: '1px solid #444'
  };
  const listItemStyle = {
     padding: '8px 10px', cursor: 'pointer',
     borderBottom: '1px solid #444'
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
        <h3>Link to Article</h3>
        {currentArticle && (
           <p>Currently linked to: <strong>{currentArticle.title}</strong></p>
        )}
        <input
          type="text"
          placeholder="Search articles by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box', background: '#444', color:'#eee', border:'1px solid #555' }}
          autoFocus // Focus input on open
        />
        <ul style={listStyle}>
          {filteredArticles.length > 0 ? (
            filteredArticles.map(article => (
              <li 
                key={article._id} 
                style={listItemStyle}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#555'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                onClick={() => onSelectArticle(article)} // Pass the whole article object back
              >
                {article.title}
              </li>
            ))
          ) : (
            <li style={{ padding: '10px', fontStyle: 'italic' }}>No matching articles found.</li>
          )}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
           <button onClick={() => onSelectArticle(null)} style={{ backgroundColor: '#dc3545', color: 'white' }}>
            Unlink Article
           </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ArticleLinkModal; 