import React, { useState, useEffect, useRef } from 'react';
import MarkdownEditor from './MarkdownEditor'; // Assuming this holds Tiptap

// Accept articles and onShowMentionLinkModal
const ArticleEditor = ({ initialData, onSave, onCancel, articles, onShowMentionLinkModal }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const editorRef = useRef(null); // Ref to access editor instance if needed elsewhere

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setBody(initialData.body || '');
      setTags(initialData.tags || '');
    }
  }, [initialData]);

  const handleSave = () => {
    // Ensure body state reflects latest editor content if needed?
    // Might need a way for MarkdownEditor to update body state on change.
    onSave({ title, body, tags });
  };

  const handleBodyChange = (newBody) => {
    setBody(newBody);
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px' }}>
      <h3>{initialData?._id ? 'Edit Article' : 'Create New Article'}</h3>
      {/* Title Input */}
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="article-title" style={{ marginRight: '10px' }}>Title:</label>
        <input
          type="text"
          id="article-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ width: 'calc(100% - 60px)' }}
        />
      </div>

      {/* Editor Component */}
      <MarkdownEditor 
        content={body} 
        onChange={handleBodyChange}
        articles={articles} // Pass articles for mention suggestions
        onShowMentionLinkModal={onShowMentionLinkModal} // Pass modal trigger
        ref={editorRef} // Forward ref if needed
      />

      {/* Tags Input */}
      <div style={{ marginTop: '10px', marginBottom: '10px' }}>
        <label htmlFor="article-tags" style={{ marginRight: '10px' }}>Tags (comma-separated):</label>
        <input
          type="text"
          id="article-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          style={{ width: 'calc(100% - 180px)' }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ marginTop: '20px' }}>
        <button onClick={handleSave} style={{ marginRight: '10px' }}>Save Article</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

export default ArticleEditor; 