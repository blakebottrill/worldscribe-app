import React, { useEffect, useRef } from 'react';
// Remove ReactMarkdown and pre-processing logic
// import ReactMarkdown from 'react-markdown';
// const mentionRegex = /@([a-zA-Z0-9\s-]+)/g;
// const preprocessMarkdown = ... 

// Regex to find @Title style mentions (same as before)
const mentionRegex = /@([a-zA-Z0-9\s-]+)/g;

// Helper function to find article by title (case-insensitive)
const findArticleByTitle = (title, articles) => {
  if (!articles) return null; // Guard against missing articles prop
  const normalizedTitle = title.trim().toLowerCase();
  return articles.find(a => a.title.trim().toLowerCase() === normalizedTitle);
};

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
    if (!article || !contentRef.current || !articles || !onSelectArticle) {
      return; // Exit if no article, ref, articles list, or handler
    }

    const container = contentRef.current;

    // Function to recursively process text nodes
    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue;
        let lastIndex = 0;
        const replacements = [];

        // Find all @mention matches in this text node
        mentionRegex.lastIndex = 0; // Reset regex state
        let match;
        while ((match = mentionRegex.exec(text)) !== null) {
          const fullMatch = match[0]; // e.g., "@Some Title"
          const title = match[1]; // e.g., "Some Title"
          const targetArticle = findArticleByTitle(title, articles);
          
          // Add text before the match
          if (match.index > lastIndex) {
            replacements.push(document.createTextNode(text.substring(lastIndex, match.index)));
          }

          if (targetArticle) {
            // Create a button for valid links
            const button = document.createElement('button');
            button.textContent = fullMatch;
            button.style.background = 'none';
            button.style.border = 'none';
            button.style.padding = '0';
            button.style.color = '#646cff';
            button.style.textDecoration = 'underline';
            button.style.cursor = 'pointer';
            button.style.font = 'inherit';
            button.onclick = (e) => {
              e.preventDefault(); // Prevent any default link behavior if inside <a>
              onSelectArticle(targetArticle);
            };
            replacements.push(button);
          } else {
            // Create a span for broken links
            const span = document.createElement('span');
            span.textContent = fullMatch;
            span.style.color = '#dc3545';
            span.style.textDecoration = 'line-through';
            replacements.push(span);
          }
          lastIndex = match.index + fullMatch.length;
        }

        // If any replacements were made, replace the original text node
        if (replacements.length > 0) {
          // Add any remaining text after the last match
          if (lastIndex < text.length) {
            replacements.push(document.createTextNode(text.substring(lastIndex)));
          }
          node.replaceWith(...replacements);
        }
      } else {
        // Recursively process child nodes, avoiding nested buttons/spans we created
        if (node.nodeName !== 'BUTTON' && node.nodeName !== 'SPAN') { 
          Array.from(node.childNodes).forEach(processNode);
        }
      }
    };

    // Start processing from the container (clone to avoid modifying during iteration issues)
    const nodesToProcess = Array.from(container.childNodes);
    nodesToProcess.forEach(processNode);

    // No cleanup needed for this simple manipulation, runs on article change

  }, [article, articles, onSelectArticle]); // Rerun when article or list changes

  if (!article) {
    return <div style={viewStyles}><p>Select an article to view its content.</p></div>;
  }

  // Remove processedBody calculation
  // const processedBody = preprocessMarkdown(article.body);

  return (
    <div style={viewStyles}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1em' }}>
        <h2>{article.title}</h2>
        <div>
          <button onClick={onEdit} style={{ marginRight: '10px' }}>Edit</button>
          <button onClick={onDelete} style={{ backgroundColor: '#dc3545', color: 'white' }}>Delete</button>
        </div>
      </div>
      {/* Render HTML and add ref */}
      <div 
        ref={contentRef} // Add ref here
        className="tiptap-rendered-content" 
        dangerouslySetInnerHTML={{ __html: article.body || '' }} 
      />
      
      {article.tags && article.tags.length > 0 && (
        <div style={{ marginTop: '20px', fontStyle: 'italic' }}>
          Tags: {article.tags.join(', ')}
        </div>
      )}
    </div>
  );
};

export default ArticleView; 