import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TimelineEventList from '../components/timeline/TimelineEventList';
import TimelineEventForm from '../components/timeline/TimelineEventForm';
import ArticleLinkModal from '../components/common/ArticleLinkModal';
// TODO: Import components later

const TimelinePage = () => {
  const [events, setEvents] = useState([]);
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showArticleLinkModal, setShowArticleLinkModal] = useState(false);
  const [linkModalTargetSetter, setLinkModalTargetSetter] = useState(null);
  const [linkModalCurrentId, setLinkModalCurrentId] = useState(null);
  const navigate = useNavigate();

  // Function to extract the first number from a string
  const extractFirstNumber = (str) => {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : Infinity; // Return Infinity if no number found
  };

  // Fetch articles in addition to events
  const fetchWikiData = useCallback(async () => {
    try {
      // Use Promise.all for concurrent fetching
      const [eventsResponse, articlesResponse] = await Promise.all([
        fetch('http://localhost:5001/api/timeline'),
        fetch('http://localhost:5001/api/articles') // Fetch articles
      ]);

      if (!eventsResponse.ok) throw new Error('Failed to fetch timeline events');
      if (!articlesResponse.ok) throw new Error('Failed to fetch articles');

      let eventsData = await eventsResponse.json();
      const articlesData = await articlesResponse.json();
      
      // Sort events
      eventsData.sort((a, b) => extractFirstNumber(a.dateString) - extractFirstNumber(b.dateString));
      
      setEvents(eventsData);
      setArticles(articlesData); // Set articles state
    } catch (error) {
      setError(error.message);
      console.error("Failed to fetch data:", error);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    setIsLoading(true);
    fetchWikiData().finally(() => setIsLoading(false));
  }, [fetchWikiData]);

  const handleNavigateToArticle = (articleId) => {
    if (articleId) {
      console.log(`Navigating to article ID: ${articleId}`);
      // Navigate to the Wiki page and pass the article ID in the state
      navigate('/wiki', { state: { selectedArticleId: articleId } });
    }
  };

  // Handlers for Edit/Delete/Form
  const handleAddClick = () => {
    setEditingEvent(null);
    setShowAddForm(true);
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setShowAddForm(false);
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5001/api/timeline/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ msg: 'Failed to delete event' }));
        throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
      }

      fetchWikiData(); 

    } catch (e) {
      console.error("Failed to delete event:", e);
      setError(`Failed to delete event: ${e.message}`);
    }
  };

  // Show modal handler
  const handleShowLinkModal = (currentId, targetSetter) => {
    setLinkModalCurrentId(currentId);
    setLinkModalTargetSetter(() => targetSetter); // Store the state setter function
    setShowArticleLinkModal(true);
  };

  // Handler when article is selected in modal
  const handleModalSelectArticle = (selectedArticle) => {
    if (linkModalTargetSetter) {
      linkModalTargetSetter(selectedArticle); // Update the state in the form
    }
    setShowArticleLinkModal(false);
    setLinkModalTargetSetter(null);
    setLinkModalCurrentId(null);
  };

  // Handler for successful form submit (add/edit)
  const handleFormSubmitSuccess = () => {
    setEditingEvent(null); 
    setShowAddForm(false); 
    // Refetch both events and articles in case event link changed
    setIsLoading(true);
    fetchWikiData().finally(() => setIsLoading(false));
  };

  const handleFormCancel = () => {
    setEditingEvent(null);
    setShowAddForm(false);
  };

  const isFormVisible = showAddForm || editingEvent !== null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Timeline / Calendar Module</h2>
         <button onClick={handleAddClick}>
          {isFormVisible ? 'Cancel' : '+ Add Event'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {isFormVisible && (
        <TimelineEventForm
          key={editingEvent ? editingEvent._id : 'add'}
          initialData={editingEvent}
          onSubmitSuccess={handleFormSubmitSuccess}
          onCancel={handleFormCancel}
          articles={articles}
          onShowLinkModal={handleShowLinkModal}
        />
      )}

      {isLoading ? (
        <p>Loading events...</p>
      ) : (
        <TimelineEventList 
          events={events} 
          onNavigateToArticle={handleNavigateToArticle}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {showArticleLinkModal && (
        <ArticleLinkModal
          articles={articles}
          currentArticleId={linkModalCurrentId}
          onSelectArticle={handleModalSelectArticle}
          onClose={() => setShowArticleLinkModal(false)}
        />
      )}
    </div>
  );
};

export default TimelinePage; 