import React, { useState, useCallback } from 'react';
import TiptapEditor from './MarkdownEditor'; // Import the new Tiptap wrapper

const ArticleEditor = ({ initialData = { title: '', body: '', tags: '' }, articles, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialData.title);
  // Assume body is HTML for now, will handle conversion later
  const [bodyHtml, setBodyHtml] = useState(initialData.body || ''); 
  const [tags, setTags] = useState(initialData.tags);

  // Renamed handler
  const handleBodyHtmlChange = useCallback((html) => {
    setBodyHtml(html);
  }, []);

  const handleSave = () => {
    // Basic validation: Check if body is empty (ignoring empty tags like <p></p>)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = bodyHtml;
    const bodyText = tempDiv.textContent || tempDiv.innerText || "";

    if (!title.trim() || !bodyText.trim()) {
      alert('Title and Body are required.'); 
      return;
    }
    onSave({ 
      title: title.trim(), 
      body: bodyHtml, // Pass HTML body back up
      tags 
    });
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', margin: '20px 0' }}>
      <h3>Create / Edit Article</h3>
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="article-title" style={{ marginRight: '10px' }}>Title:</label>
        <input 
          type="text" 
          id="article-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: 'calc(100% - 60px)' }}
          required
        />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="article-tags" style={{ marginRight: '10px' }}>Tags (comma-separated):</label>
        <input 
          type="text" 
          id="article-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          style={{ width: 'calc(100% - 180px)' }}
        />
      </div>

      {/* Replace SimpleMDE with TiptapEditor */}
      <TiptapEditor 
        content={bodyHtml} 
        onChange={handleBodyHtmlChange} 
        articles={articles} // Pass articles to TiptapEditor
      />
      
      <div style={{ marginTop: '10px' }}>
        <button onClick={handleSave} style={{ marginRight: '10px' }}>Save Article</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

export default ArticleEditor; 