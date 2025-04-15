import React, { useState, useEffect } from 'react';
// Remove ArticleLinkModal import if not used directly in form submission logic
// import ArticleLinkModal from '../common/ArticleLinkModal';
import { FaSpinner } from 'react-icons/fa'; // For loading state

// Updated props: onSubmit, isSubmitting, submitError
const TimelineEventForm = ({ 
    initialData = null, 
    onSubmit, // Renamed from onSubmitSuccess
    onCancel, 
    articles, // Still needed for display?
    onShowLinkModal, 
    isSubmitting, // Passed down from page mutation
    submitError // Passed down from page mutation
}) => {
  const [eventName, setEventName] = useState('');
  const [dateString, setDateString] = useState('');
  const [description, setDescription] = useState('');
  const [linkedArticle, setLinkedArticle] = useState(null); // Local state for selection
  // const [isSubmitting, setIsSubmitting] = useState(false); // Removed, use prop
  const [error, setError] = useState(null); // Local form validation error

  const isEditing = initialData !== null;

  useEffect(() => {
    if (isEditing) {
      setEventName(initialData.eventName || '');
      setDateString(initialData.dateString || '');
      setDescription(initialData.description || '');
      // Find the full article object from the articles list prop if available
      // This assumes initialData.article might just be an ID
      const initialArticle = articles?.find(a => a._id === initialData.article) || initialData.article; // Fallback if already populated
      setLinkedArticle(initialArticle || null);
    } else {
      // Reset fields for add mode
      setEventName('');
      setDateString('');
      setDescription('');
      setLinkedArticle(null);
    }
  }, [initialData, isEditing, articles]);

  // handleSubmit now calls the passed onSubmit prop (the mutation trigger)
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!eventName || !dateString) {
      setError('Event Name and Date are required.');
      return;
    }
    setError(null); // Clear local validation error

    // Prepare data, including _id if editing
    const eventData = { 
        ...(isEditing && { _id: initialData._id }), // Include _id only if editing
        eventName, 
        dateString, 
        description, 
        articleId: linkedArticle?._id || null // Send only the ID
    };
    
    onSubmit(eventData); // Call the mutation function passed via props
  };

  // Local error display combines local validation and mutation error
  const displayError = error || submitError?.message;

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', margin: '20px 0' }}>
      <h3>{isEditing ? 'Edit Timeline Event' : 'Add New Timeline Event'}</h3>
      <form onSubmit={handleSubmit}>
        {/* Input Fields (disabled={isSubmitting}) */}
        <div style={{ marginBottom: '10px' }}>
          <label>Event Name:*</label>
          <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} required disabled={isSubmitting} style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Date/Time:*</label>
          <input type="text" value={dateString} onChange={(e) => setDateString(e.target.value)} required disabled={isSubmitting} placeholder="e.g., Year 512, 3rd Era" style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Description:</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSubmitting} style={{ width: '100%', boxSizing: 'border-box', minHeight: '80px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Linked Article:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
            {/* Display linked article title */}
            <span>{linkedArticle ? linkedArticle.title : 'None'}</span> 
            <button type="button" onClick={() => onShowLinkModal(linkedArticle?._id, setLinkedArticle)} disabled={isSubmitting}>
              {linkedArticle ? 'Change Link' : 'Link Article'}
            </button>
          </div>
        </div>
        
        {/* Display combined error message */}
        {displayError && <p style={{ color: 'red' }}>{displayError}</p>}
        
        <button type="submit" disabled={isSubmitting} style={{ marginRight: '10px' }}>
          {/* Show spinner when submitting */}
          {isSubmitting ? <FaSpinner className="spinner" size={14}/> : (isEditing ? 'Update Event' : 'Add Event')}
        </button>
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </form>
    </div>
  );
};

export default TimelineEventForm; 