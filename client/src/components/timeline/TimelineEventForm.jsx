import React, { useState, useEffect } from 'react';
import ArticleLinkModal from '../common/ArticleLinkModal';

const TimelineEventForm = ({ initialData = null, onSubmitSuccess, onCancel, articles, onShowLinkModal }) => {
  const [eventName, setEventName] = useState('');
  const [dateString, setDateString] = useState('');
  const [description, setDescription] = useState('');
  const [linkedArticle, setLinkedArticle] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEditing = initialData !== null;

  useEffect(() => {
    if (isEditing) {
      setEventName(initialData.eventName || '');
      setDateString(initialData.dateString || '');
      setDescription(initialData.description || '');
      setLinkedArticle(initialData.article || null);
    } else {
      setEventName('');
      setDateString('');
      setDescription('');
      setLinkedArticle(null);
    }
  }, [initialData, isEditing]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!eventName || !dateString) {
      setError('Event Name and Date are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const eventData = { 
        eventName, 
        dateString, 
        description, 
        articleId: linkedArticle?._id || null 
    };
    const url = isEditing 
      ? `http://localhost:5001/api/timeline/${initialData._id}` 
      : 'http://localhost:5001/api/timeline';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ msg: `Failed to ${isEditing ? 'update' : 'add'} event` }));
        throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
      }

      onSubmitSuccess();

    } catch (e) {
      console.error(`Failed to ${isEditing ? 'update' : 'add'} event:`, e);
      setError(`Failed to ${isEditing ? 'update' : 'add'} event: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', margin: '20px 0' }}>
      <h3>{isEditing ? 'Edit Timeline Event' : 'Add New Timeline Event'}</h3>
      <form onSubmit={handleSubmit}>
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
            <span>{linkedArticle ? linkedArticle.title : 'None'}</span>
            <button type="button" onClick={() => onShowLinkModal(linkedArticle?._id, setLinkedArticle)} disabled={isSubmitting}>
              {linkedArticle ? 'Change Link' : 'Link Article'}
            </button>
          </div>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={isSubmitting} style={{ marginRight: '10px' }}>
          {isSubmitting ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Event' : 'Add Event')}
        </button>
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </form>
    </div>
  );
};

export default TimelineEventForm; 