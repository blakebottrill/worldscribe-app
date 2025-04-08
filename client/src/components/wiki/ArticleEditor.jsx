import React, { useState, useEffect, useRef, useCallback } from 'react';
import MarkdownEditor from './MarkdownEditor'; // Assuming this holds Tiptap
import IconPicker from '../common/IconPicker'; // Import IconPicker
import * as FaIcons from 'react-icons/fa'; // Import all FaIcons
import './ArticleEditor.css'; // Add for specific editor styles
// import { FaSpinner } from 'react-icons/fa'; // No longer needed

// Helper to get icon component from name, defaulting to FaBook
const getIconComponent = (iconName) => {
  return FaIcons[iconName] || FaIcons.FaBook;
};

// Accept articles and onShowMentionLinkModal and onDelete
const ArticleEditor = ({ initialData, onSave, onCancel, articles, onShowMentionLinkModal, onDelete }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagList, setTagList] = useState([]); // New state for tags array
  const [tagInput, setTagInput] = useState(''); // New state for tag input field
  const [icon, setIcon] = useState('FaBook'); // Add state for icon name
  const [showIconPicker, setShowIconPicker] = useState(false); // State for modal
  const editorRef = useRef(null); // Ref to access editor instance if needed elsewhere
  const debounceTimeoutRef = useRef(null); // Ref to store debounce timeout ID
  const isMountedRef = useRef(false); // Ref to track if component is mounted
  const prevArticleIdRef = useRef(null); // Ref to store the previous article ID

  useEffect(() => {
    const currentArticleId = initialData?._id;

    // Only reset fully if the article ID changes OR if initialData becomes null/undefined
    if (currentArticleId !== prevArticleIdRef.current || !initialData) {
      console.log('Article ID changed or initialData is null/undefined. Resetting editor state.');
      setTitle(initialData?.title || '');
      setBody(initialData?.body || '');
      setTagList(initialData?.tags ? initialData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []);
      setTagInput(''); // Clear input field ONLY on article change/reset
      setIcon(initialData?.icon || 'FaBook');
      isMountedRef.current = !!initialData; // Set mounted based on initialData presence
      
      // Clear any pending saves when switching articles
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        console.log('Cleared pending save due to article change.');
      }
    } 
    // If the ID is the same but the initialData object itself might have changed (e.g. parent refresh)
    // Update state fields *except* tagInput to reflect potential upstream changes without disrupting typing.
    else if (initialData) { 
      console.log('InitialData reference changed but ID is the same. Updating non-input fields if necessary.');
      if (initialData.title !== title) setTitle(initialData.title);
      if (initialData.body !== body) setBody(initialData.body);
      const newTagList = initialData.tags ? initialData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
      // Use stringify for simple comparison of tag arrays to prevent infinite loops if parent updates initialData constantly
      if (JSON.stringify(newTagList) !== JSON.stringify(tagList)) {
         setTagList(newTagList); 
      }
      if (initialData.icon !== icon) setIcon(initialData.icon || 'FaBook');
    }

    // Update the ref for the next render comparison
    prevArticleIdRef.current = currentArticleId;

  }, [initialData]); // Keep dependency on initialData object reference

  // Debounced Save Logic
  useEffect(() => {
    // Don't save on the very first render or if initial data hasn't loaded yet
    if (!isMountedRef.current) {
      return;
    }
    
    // Clear existing timeout if changes are rapid
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Check if initialData (and thus _id) exists before attempting to save
    // Modified check to include tagList length
    if (!initialData?._id && !(title || body || tagList.length > 0 || icon !== 'FaBook')) {
       console.log("Skipping initial auto-save for potentially new/empty article.");
       return;
    }
    // Also check if component might have unmounted / initialData cleared by Cancel
    if (!isMountedRef.current) { 
      return;
    }
    
    console.log("Auto-saving with tags:", tagList.join(','));
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        // Convert tagList array back to comma-separated string for saving
        const tagsString = tagList.join(',');
        await onSave({ _id: initialData?._id, title, body, tags: tagsString, icon });
        console.log("Auto-save successful.")
      } catch (error) {
        console.error("Auto-save failed:", error);
        // Optionally add more visible error handling here?
      }
    }, 1000); // Auto-save after 1 second of inactivity (changed from 2000)

    // Cleanup function to clear timeout if component unmounts or dependencies change before save
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [title, body, tagList, icon, initialData?._id, onSave]); // Depend on tagList instead of tags

  const handleBodyChange = useCallback((newBody) => {
    setBody(newBody);
  }, []);

  const handleDelete = () => {
    // Confirmation is handled in WikiPage, just call the prop
    if (onDelete && initialData?._id) { // Only allow delete if it's an existing article
      onDelete();
    }
  };

  // Handler for when an icon is selected from the picker
  const handleIconSelect = (selectedIconName) => {
    setIcon(selectedIconName);
    // Auto-save will be triggered by the state change via useEffect
  };

  // --- Tag Input Handlers ---
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission or newline
      const newTag = tagInput.trim();
      if (newTag && !tagList.includes(newTag)) {
        setTagList([...tagList, newTag]);
      }
      setTagInput(''); // Clear the input field
    }
  };

  const handleRemoveTag = (indexToRemove) => {
    setTagList(tagList.filter((_, index) => index !== indexToRemove));
  };
  // --- End Tag Input Handlers ---

  const CurrentIcon = getIconComponent(icon); // Get current icon component

  return (
    <div className="article-editor-container" style={{ padding: '1rem', position: 'relative' }}>
      {/* Title and Icon Input Area */}
      <div className="title-icon-area">
        <button 
          className="icon-select-button" 
          onClick={() => setShowIconPicker(true)}
          title="Change Icon"
        >
          <CurrentIcon size="1.5em" /> {/* Display current icon */} 
        </button>
        <input
          type="text"
          className="title-input"
          placeholder="Article Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
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

      {/* Tags Input and Display */}
      <div className="tags-section" style={{ marginTop: '20px' }}>
        <label htmlFor="tag-input" style={{ marginRight: '10px', fontSize: '0.9em', color: '#6c757d' }}>Tags:</label>
        <input
          type="text"
          id="tag-input"
          placeholder="Add a tag..."
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          style={{ width: 'calc(100% - 60px)', fontSize: '0.9em', marginBottom: '5px' }}
        />
        <div className="tags-container"> {/* Container for displaying tags */}
          {tagList.map((tag, index) => (
            <div key={index} className="tag-item">
              <FaIcons.FaTag style={{ marginRight: '5px' }} />
              <span>{tag}</span>
              <button 
                className="remove-tag-button" 
                onClick={() => handleRemoveTag(index)}
                title={`Remove ${tag}`}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons - Remove Save and Cancel */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        {/* Remove Cancel Button */}
        {/* <button onClick={onCancel} style={{ marginRight: '10px' }}>Cancel</button> */}
        {/* Delete button remains */}
        {initialData?._id && (
          <button onClick={handleDelete} className="delete-button">Delete</button>
        )}
      </div>

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <IconPicker 
          onSelectIcon={handleIconSelect} 
          onClose={() => setShowIconPicker(false)} 
        />
      )}
    </div>
  );
};

export default ArticleEditor; 