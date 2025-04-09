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

// Accept articles and onShowMentionLinkModal and onDelete, and new onTitleChangeRealtime and onMentionClick
const ArticleEditor = ({ initialData, onSave, onCancel, articles, onShowMentionLinkModal, onDelete, onTitleChangeRealtime, onMentionClick }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagList, setTagList] = useState([]); // New state for tags array
  const [tagInput, setTagInput] = useState(''); // New state for tag input field
  const [icon, setIcon] = useState('FaBook'); // Add state for icon name
  const [showIconPicker, setShowIconPicker] = useState(false); // State for modal
  const editorRef = useRef(null); // Ref to access editor instance if needed elsewhere
  // Track if initial data has been loaded
  const initialDataLoadedRef = useRef(false);
  // Track if we're in the middle of a save operation
  const isSavingRef = useRef(false);
  const debounceTimerRef = useRef(null);
  // Ref to store the data intended for the next debounced save
  const pendingSaveDataRef = useRef(null);

  // Handle initialData changes (e.g., when navigating between articles)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setBody(initialData.body || '');
      
      // Parse tags from comma-separated string
      const parsedTags = initialData.tags 
        ? initialData.tags.split(',').map(tag => tag.trim()).filter(Boolean) 
        : [];
      setTagList(parsedTags);
      
      setTagInput('');
      setIcon(initialData.icon || 'FaBook');
      initialDataLoadedRef.current = true;
    } else {
      // Reset fields if initialData becomes null
      setTitle('');
      setBody('');
      setTagList([]);
      setTagInput('');
      setIcon('FaBook');
      initialDataLoadedRef.current = false;
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
    setBody(newBody);
    // Pass the complete intended state to debouncedSave
    debouncedSave({ 
      title: title, 
      body: newBody, 
      tags: tagList.join(','), 
      icon: icon 
    });
  }, [title, tagList, icon]);

  // Icon change handler with immediate save
  const handleIconSelect = (selectedIconName) => {
    setIcon(selectedIconName);
    // Immediate save - Pass only the changed field
    saveArticle({ icon: selectedIconName }); 
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
          // Immediate save - Pass only the changed field
          saveArticle({ tags: updatedTagList.join(',') });
        }
      }
      setTagInput('');
    }
  };

  // Remove tag handler with immediate save
  const handleRemoveTag = (indexToRemove) => {
    const updatedTagList = tagList.filter((_, index) => index !== indexToRemove);
    setTagList(updatedTagList);
    // Immediate save - Pass only the changed field
    saveArticle({ tags: updatedTagList.length ? updatedTagList.join(',') : '' });
  };

  // Delete article handler
  const handleDelete = () => {
    if (onDelete && initialData?._id) {
      onDelete();
    }
  };

  // Debounced save function (for content that changes frequently like title and body)
  const debouncedSave = (intendedData) => {
    if (!initialDataLoadedRef.current) return;
    
    // Store the latest intended data
    pendingSaveDataRef.current = intendedData;
    
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set a new timer
    debounceTimerRef.current = setTimeout(() => {
      // When timer expires, save the data that was last pending
      if (pendingSaveDataRef.current) {
        // Pass the *full* pending data to saveArticle
        saveArticle(pendingSaveDataRef.current, true); // Pass flag indicating it's a debounced save
        pendingSaveDataRef.current = null; // Clear pending data after scheduling save
      }
    }, 1000);
  };

  // Function to save article
  // Takes either partial data (for immediate saves) or full data (for debounced saves)
  const saveArticle = (dataToSave, isDebounced = false) => {
    if (!initialDataLoadedRef.current || isSavingRef.current) return;
    
    isSavingRef.current = true;
    
    // Construct the final data object
    const finalArticleData = {
      _id: initialData?._id,
      // Start with current state as baseline only if it's an immediate save
      title: isDebounced ? dataToSave.title : title,
      body: isDebounced ? dataToSave.body : body,
      tags: isDebounced ? dataToSave.tags : (tagList.length ? tagList.join(',') : ''),
      icon: isDebounced ? dataToSave.icon : icon,
    };

    // If it's an immediate save, merge the specific changed field(s)
    if (!isDebounced) {
      if (dataToSave.title !== undefined) finalArticleData.title = dataToSave.title;
      if (dataToSave.body !== undefined) finalArticleData.body = dataToSave.body;
      if (dataToSave.tags !== undefined) finalArticleData.tags = dataToSave.tags;
      if (dataToSave.icon !== undefined) finalArticleData.icon = dataToSave.icon;
    }

    // Ensure tags is always a string before saving
    finalArticleData.tags = finalArticleData.tags || '';

    console.log("Saving article with data (isDebounced:", isDebounced, "):", finalArticleData);
    
    onSave(finalArticleData)
      .then(() => {
        console.log("Article saved successfully");
        isSavingRef.current = false;
      })
      .catch(error => {
        console.error("Failed to save article:", error);
        isSavingRef.current = false;
      });
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
          onChange={handleTitleChange}
          required
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