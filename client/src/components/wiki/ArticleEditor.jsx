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
  const debounceTimeoutRef = useRef(null);
  const isMountedRef = useRef(false);
  const prevArticleIdRef = useRef(null);
  // Refs to store previous values for comparison in auto-save effect
  const prevSaveDataRef = useRef({});

  useEffect(() => {
    const currentArticleId = initialData?._id;

    if (currentArticleId !== prevArticleIdRef.current || !initialData) {
      console.log('Article ID changed or initialData is null/undefined. Resetting editor state.');
      setTitle(initialData?.title || '');
      setBody(initialData?.body || '');
      // Assume initialData.tags is already an array (or null/undefined)
      setTagList(initialData?.tags || []); 
      setTagInput(''); 
      setIcon(initialData?.icon || 'FaBook');
      isMountedRef.current = !!initialData; 
      prevSaveDataRef.current = { 
         title: initialData?.title || '',
         body: initialData?.body || '',
         // Store tags as array stringified for comparison
         tagsString: JSON.stringify(initialData?.tags || []), 
         icon: initialData?.icon || 'FaBook'
      }; 
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        console.log('Cleared pending save due to article change.');
      }
    } 
    else if (initialData && !debounceTimeoutRef.current) { 
      console.log('InitialData changed (same ID, no save pending). Updating non-input fields if necessary.');
      if (initialData.title !== title) setTitle(initialData.title);
      if (initialData.body !== body) setBody(initialData.body);
      // Assume initialData.tags is an array
      const newTagList = initialData.tags || []; 
      if (JSON.stringify(newTagList) !== JSON.stringify(tagList)) {
         console.log('Updating tagList from initialData as it differs and no save is pending.');
         setTagList(newTagList); 
      }
      if (initialData.icon !== icon) setIcon(initialData.icon || 'FaBook');
      prevSaveDataRef.current = {
         title: initialData.title, 
         body: initialData.body, 
         // Store tags as array stringified for comparison
         tagsString: JSON.stringify(initialData.tags || []), 
         icon: initialData.icon || 'FaBook' 
      };
    } else if (initialData && debounceTimeoutRef.current) {
        console.log('InitialData changed but save is pending. Skipping state overwrite.');
    }

    prevArticleIdRef.current = currentArticleId;

  }, [initialData]);

  // Debounced Save Logic - Update comparison ref value
  useEffect(() => {
    if (!isMountedRef.current) {
      // Don't run on initial mount before data is stable
      // isMountedRef is set to true in the initialData effect
      return;
    }

    const currentData = {
      title,
      body,
      // Use stringified array for comparison logic
      tagsString: JSON.stringify(tagList), 
      icon,
      _id: initialData?._id
    };

    const hasDataChanged = 
      currentData.title !== prevSaveDataRef.current.title ||
      currentData.body !== prevSaveDataRef.current.body ||
      // Compare stringified arrays
      currentData.tagsString !== prevSaveDataRef.current.tagsString || 
      currentData.icon !== prevSaveDataRef.current.icon;

    if (hasDataChanged) {
        console.log('Data changed, scheduling auto-save...', currentData);
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Condition needs to check stringified empty array
        const isEmptyNewArticle = !currentData._id && !(currentData.title || currentData.body || currentData.tagsString !== '[]' || currentData.icon !== 'FaBook');
        
        if (!isEmptyNewArticle) {
            debounceTimeoutRef.current = setTimeout(async () => {
                if (!isMountedRef.current) return;
                
                // Send tags as comma-separated string
                const tagsToSend = tagList.join(',');
                console.log("Executing auto-save with tags string:", tagsToSend);
                try {
                    await onSave({ 
                        _id: currentData._id, 
                        title: currentData.title, 
                        body: currentData.body, 
                        tags: tagsToSend, // Send string
                        icon: currentData.icon 
                    });
                    console.log("Auto-save successful.");
                    // Update the ref *after* successful save, store stringified array
                    prevSaveDataRef.current = { ...currentData, tagsString: JSON.stringify(tagList) }; 
                } catch (error) {
                    console.error("Auto-save failed:", error);
                }
            }, 1000);
        } else {
             console.log("Skipping save schedule for new/empty article.");
        }
    } 

    // Update previous data ref - store stringified array
    if (hasDataChanged) {
       prevSaveDataRef.current = { ...currentData, tagsString: JSON.stringify(tagList) };
    }

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
    // Keep dependencies that define the data being saved
  }, [title, body, tagList, icon, initialData?._id, onSave]); 

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
      const newTagsRaw = tagInput.trim();
      
      if (newTagsRaw) {
        // Split by comma, trim, filter empty strings and duplicates
        const newTags = newTagsRaw
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag !== '' && !tagList.includes(tag));
          
        if (newTags.length > 0) {
          setTagList([...tagList, ...newTags]);
        }
      }
      setTagInput(''); // Clear the input field regardless
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
          placeholder="Add tags (comma-separated)..."
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