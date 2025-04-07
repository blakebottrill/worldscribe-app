import React from 'react';
import ReactMarkdown from 'react-markdown';
// Optional: Add plugins for more features like GitHub Flavored Markdown (GFM)
// import remarkGfm from 'remark-gfm' 

const MarkdownRenderer = ({ markdown }) => {
  if (!markdown) {
    return null; // Or return a placeholder if needed
  }

  // Basic styling container if needed
  const style = {
    lineHeight: '1.6',
    // Add other styles as needed
  };

  return (
    <div style={style}>
      <ReactMarkdown
        // plugins={[remarkGfm]} // Example: Enable GFM (tables, strikethrough, etc.)
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer; 