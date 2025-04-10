import React, { useState, useRef, useEffect, useCallback } from 'react';
import MarkdownEditor from './MarkdownEditor'; // Assuming this holds Tiptap
import IconPicker from '../common/IconPicker'; // Import IconPicker
import * as FaIcons from 'react-icons/fa'; // Import all FaIcons
import { FaSpinner } from 'react-icons/fa'; // Keep spinner for potential future use
import './ArticleEditor.css'; // Add for specific editor styles

// Helper to get icon component from name, defaulting to FaBook
const getIconComponent = (iconName) => {
  return FaIcons[iconName] || FaIcons.FaBook;
};

// Accept articles and onShowMentionLinkModal and onDelete, and new onTitleChangeRealtime and onMentionClick
const ArticleEditor = ({ initialData, onSave, onCancel, articles, onShowMentionLinkModal, onDelete, onTitleChangeRealtime, onMentionClick, isSaving }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState(''); // Add state for body content
  const [tagList, setTagList] = useState([]); // New state for tags array
  const [tagInput, setTagInput] = useState(''); // New state for tag input field
  const [icon, setIcon] = useState('FaBook'); // Add state for icon name
  const [showIconPicker, setShowIconPicker] = useState(false); // State for modal
  const debounceTimerRef = useRef(null);
  const editorRef = useRef(null); // Define editorRef
  const initialDataLoadedRef = useRef(false); // Define initialDataLoadedRef
  const pendingSaveDataRef = useRef(null); // Define pendingSaveDataRef

  // Handle initialData changes (e.g., when navigating between articles)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setBody(initialData.body || ''); // Initialize body state
      const parsedTags = initialData.tags 
        ? initialData.tags.split(',').map(tag => tag.trim()).filter(Boolean) 
        : [];
      setTagList(parsedTags);
      setTagInput('');
      setIcon(initialData.icon || 'FaBook');
      initialDataLoadedRef.current = true; // Set flag to true after loading
    } else {
      // Reset fields if initialData becomes null
      setTitle('');
      setBody(''); // Reset body state
      setTagList([]);
      setTagInput('');
      setIcon('FaBook');
      initialDataLoadedRef.current = false; // Reset flag
    }
  }, [initialData]);

  // Title change handler with debounced save AND realtime update
  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    // Call the realtime update prop immediately
    if (onTitleChangeRealtime) {
      onTitleChangeRealtime(newTitle);
    }
    
    // Pass the complete intended state to debouncedSave
    debouncedSave({ 
      title: newTitle, 
      body: body, 
      tags: tagList.join(','), 
      icon: icon 
    });
  };

  // Body change handler with debounced save
  const handleBodyChange = useCallback((newBody) => {
    setBody(newBody); // This setter is now defined
    // Pass the complete intended state to debouncedSave
    debouncedSave({ 
      title: title, 
      body: newBody, 
      tags: tagList.join(','), 
      icon: icon 
    });
  }, [title, tagList, icon]); // Dependencies seem correct as setBody is stable

  // Icon change handler - only updates local state and triggers save via prop
  const handleIconSelect = (iconName) => {
    setIcon(iconName);
    setShowIconPicker(false);
    
    // Don't save immediately here. Instead, trigger the main save function.
    // The icon sync logic is now handled in WikiPage after the save succeeds.
    // Ensure iconId is included for the save
    const iconId = initialData?.iconId || `icon_${Date.now()}`;
    saveArticle({ icon: iconName, iconId: iconId }, false); // Trigger immediate save for icon change
  };

  // Handle tag input key events (Enter to add tag)
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTagsRaw = tagInput.trim();
      if (newTagsRaw) {
        const newTags = newTagsRaw.split(',').map(tag => tag.trim()).filter(tag => tag !== '' && !tagList.includes(tag));
        if (newTags.length > 0) {
          const updatedTagList = [...tagList, ...newTags];
          setTagList(updatedTagList);
          // Trigger immediate save with only changed field
          saveArticle({ tags: updatedTagList.join(',') }, false);
        }
      }
      setTagInput('');
    }
  };

  // Remove tag handler with immediate save
  const handleRemoveTag = (indexToRemove) => {
    const updatedTagList = tagList.filter((_, index) => index !== indexToRemove);
    setTagList(updatedTagList);
    // Trigger immediate save with only changed field
    saveArticle({ tags: updatedTagList.length ? updatedTagList.join(',') : '' }, false);
  };

  // Delete article handler
  const handleDelete = () => {
    if (onDelete && initialData?._id) {
      onDelete();
    }
  };

  // Debounced save function (for content that changes frequently like title and body)
  const debouncedSave = (intendedData) => {
    if (!initialDataLoadedRef.current || isSaving) return;
    
    // Store the latest intended data
    pendingSaveDataRef.current = intendedData;
    
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set a new timer
    debounceTimerRef.current = setTimeout(() => {
      // When timer expires, save the data that was last pending
      if (pendingSaveDataRef.current && !isSaving) {
        // Pass the *full* pending data to saveArticle
        saveArticle(pendingSaveDataRef.current, true); // Pass flag indicating it's a debounced save
        pendingSaveDataRef.current = null; // Clear pending data after scheduling save
      }
    }, 1000);
  };

  // Function to save article
  // Takes either partial data (for immediate saves) or full data (for debounced saves)
  const saveArticle = (dataToSave, isDebounced = false) => {
    if (isSaving || (!initialDataLoadedRef.current && !initialData?._id?.startsWith('temp-'))) return;
    
    // Construct the final data object to send via onSave
    // Start with current full state as baseline
    const finalArticleData = {
      _id: initialData?._id,
      title: title,
      body: body,
      tags: tagList.join(','), // Always send current tag list as string
      icon: icon,
      iconId: initialData?.iconId // Preserve existing iconId unless changed by handleIconSelect
    };

    // Merge the specific changes from dataToSave (could be partial for immediate saves)
    Object.assign(finalArticleData, dataToSave);

    // Ensure tags is always a string, even if empty
    finalArticleData.tags = finalArticleData.tags || '';

    console.log(`Calling onSave (isDebounced: ${isDebounced}) with:`, finalArticleData);
    if (onSave) {
        // Call the actual mutation trigger passed down via props
        onSave(finalArticleData);
    }
  };

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const CurrentIcon = getIconComponent(icon); // Get current icon component

  // Prevent editing title/tags while saving?
  const controlsDisabled = isSaving;

  return (
    <div className="article-editor-container" style={{ padding: '1rem', position: 'relative' }}>
      {/* Title and Icon Input Area */}
      <div className="title-icon-area">
        <button 
          className="icon-select-button" 
          onClick={() => setShowIconPicker(true)}
          disabled={controlsDisabled}
          title="Change Icon"
        >
          <CurrentIcon size="1.5em" /> {/* Display current icon */} 
        </button>
        <input
          type="text"
          className="title-input"
          placeholder="Article Title"
          value={title}
          onChange={handleTitleChange}
          required
          disabled={controlsDisabled}
        />
      </div>

      {/* Editor Component */}
      <MarkdownEditor 
        content={body} 
        onChange={handleBodyChange}
        articles={articles} // Pass articles for mention suggestions
        onShowMentionLinkModal={onShowMentionLinkModal} // Pass modal trigger
        onMentionClick={onMentionClick} // Pass prop down
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
          disabled={controlsDisabled}
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
                disabled={controlsDisabled}
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
          <button onClick={handleDelete} className="delete-button" disabled={controlsDisabled || !initialData?._id}>Delete</button>
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