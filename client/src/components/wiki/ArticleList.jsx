import React from 'react';

const ArticleList = ({ articles, onSelectArticle, selectedArticleId }) => {
  const listStyles = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    width: '200px', // Fixed width for the list
    borderRight: '1px solid #ccc',
    height: 'calc(100vh - 150px)', // Adjust height as needed
    overflowY: 'auto'
  };

  const itemStyles = {
    padding: '10px',
    cursor: 'pointer',
    borderBottom: '1px solid #eee',
  };

  const selectedItemStyles = {
    ...itemStyles,
    backgroundColor: '#e0e0e0',
    fontWeight: 'bold',
  };

  return (
    <ul style={listStyles}>
      {articles.length === 0 && <li style={itemStyles}>No articles found.</li>}
      {articles.map(article => (
        <li 
          key={article._id} 
          style={article._id === selectedArticleId ? selectedItemStyles : itemStyles}
          onClick={() => onSelectArticle(article)}
        >
          {article.title}
        </li>
      ))}
    </ul>
  );
};

export default ArticleList; 