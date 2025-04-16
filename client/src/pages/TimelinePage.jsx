import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaSpinner, FaPlus } from 'react-icons/fa';
import toast from 'react-hot-toast';
// import TimelineEventList from '../components/timeline/TimelineEventList';
import HorizontalTimelineView from '../components/timeline/HorizontalTimelineView';
import TimelineEventForm from '../components/timeline/TimelineEventForm';
import ArticleLinkModal from '../components/common/ArticleLinkModal';
import './TimelinePage.css';
// TODO: Import components later

// --- Utility Functions ---
const parseDate = (dateString) => {
  if (!dateString) return null;
  // This is basic, assumes YYYY or YYYY-MM-DD formats mostly
  // Consider using a date library like Moment.js or date-fns for robustness
  const yearMatch = dateString.match(/^(\d{1,4})/); 
  if (yearMatch) {
      // Attempt to create a date, might need refinement based on actual date formats
      return new Date(dateString);
  }
  return null;
};

// --- API Functions ---
const fetchTimelineEventsAPI = async () => {
  const response = await fetch('http://localhost:5001/api/timeline');
  if (!response.ok) throw new Error('Failed to fetch timeline events');
  const data = await response.json();
  // TODO: Update sorting based on startDate
  return data.sort((a, b) => {
    const dateA = parseDate(a.startDate || a.dateString);
    const dateB = parseDate(b.startDate || b.dateString);
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });
};

const fetchArticlesAPI = async () => { // Reusing from WikiPage refactor
  const response = await fetch('http://localhost:5001/api/articles');
  if (!response.ok) throw new Error('Failed to fetch articles');
  return response.json();
};

const createTimelineEventAPI = async (eventData) => {
  const response = await fetch('http://localhost:5001/api/timeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ msg: 'Failed to create event' }));
    throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

const updateTimelineEventAPI = async ({ eventId, eventData }) => {
  const response = await fetch(`http://localhost:5001/api/timeline/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ msg: 'Failed to update event' }));
    throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

const deleteTimelineEventAPI = async (eventId) => {
  const response = await fetch(`http://localhost:5001/api/timeline/${eventId}`, { method: 'DELETE' });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ msg: 'Failed to delete event' }));
    throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
  }
  return { success: true, deletedId: eventId };
};
// --- End API Functions ---

const TimelinePage = () => {
  // Remove unused state
  // const [events, setEvents] = useState([]);
  // const [articles, setArticles] = useState([]);
  // const [isLoading, setIsLoading] = useState(true);
  // const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showArticleLinkModal, setShowArticleLinkModal] = useState(false);
  const [linkModalTargetSetter, setLinkModalTargetSetter] = useState(null);
  const [linkModalCurrentId, setLinkModalCurrentId] = useState(null);
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- Queries ---
  const { data: events = [], isLoading: isLoadingEvents, error: eventsError } = useQuery({
    queryKey: ['timelineEvents'],
    queryFn: fetchTimelineEventsAPI,
  });

  // Fetch articles for linking - shares cache with WikiPage/AtlasPage
  const { data: articles = [], isLoading: isLoadingArticles, error: articlesError } = useQuery({
    queryKey: ['articles'], 
    queryFn: fetchArticlesAPI, 
  });

  const isLoading = isLoadingEvents || isLoadingArticles;
  const error = eventsError || articlesError;

  // --- Mutations ---
  const saveEventMutation = useMutation({
    mutationFn: (eventDataWithId) => {
        const { _id, ...eventData } = eventDataWithId;
        if (_id) { // If ID exists, it's an update
            return updateTimelineEventAPI({ eventId: _id, eventData });
        } else { // Otherwise, it's a create
            return createTimelineEventAPI(eventData);
        }
    },
    onMutate: async (eventDataWithId) => {
        const { _id, ...eventData } = eventDataWithId;
        const isCreating = !_id;
        const tempId = isCreating ? `temp-${Date.now()}` : null;

        await queryClient.cancelQueries({ queryKey: ['timelineEvents'] });
        const previousEvents = queryClient.getQueryData(['timelineEvents']);

        // Optimistic Update
        queryClient.setQueryData(['timelineEvents'], (old = []) => {
            let newEvents;
            if (isCreating) {
                const optimisticEvent = { ...eventData, _id: tempId };
                newEvents = [...old, optimisticEvent];
            } else {
                newEvents = old.map(event => 
                    event._id === _id ? { ...event, ...eventData } : event
                );
            }
            // Re-sort after optimistic update
            return newEvents.sort((a, b) => {
                const dateA = parseDate(a.startDate || a.dateString);
                const dateB = parseDate(b.startDate || b.dateString);
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateA.getTime() - dateB.getTime();
            });
        });
        
        // Close form immediately on optimistic update
        setEditingEvent(null);
        setShowAddForm(false);

        return { previousEvents, tempId };
    },
    onError: (err, variables, context) => {
        console.error("Error saving timeline event:", err);
        toast.error(`Failed to save event: ${err.message}`);
        if (context?.previousEvents) {
            queryClient.setQueryData(['timelineEvents'], context.previousEvents);
        }
    },
    onSuccess: (savedEvent, variables, context) => {
        const isCreating = !!context?.tempId;
        toast.success(`Event ${isCreating ? 'added' : 'updated'} successfully!`);
        
        // Update cache with server data, replacing temp ID if needed
        queryClient.setQueryData(['timelineEvents'], (old = []) => {
             const updatedEvents = old.map(event => 
                event._id === (isCreating ? context.tempId : savedEvent._id) 
                    ? savedEvent 
                    : event
             );
             return updatedEvents.sort((a, b) => {
                const dateA = parseDate(a.startDate || a.dateString);
                const dateB = parseDate(b.startDate || b.dateString);
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateA.getTime() - dateB.getTime();
             });
        });
    },
    onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['timelineEvents'] });
        // Invalidate articles too, in case a link changed?
        queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });

  const deleteEventMutation = useMutation({
      mutationFn: deleteTimelineEventAPI,
      onMutate: async (eventIdToDelete) => {
          await queryClient.cancelQueries({ queryKey: ['timelineEvents'] });
          const previousEvents = queryClient.getQueryData(['timelineEvents']);

          queryClient.setQueryData(['timelineEvents'], (old = []) =>
              old.filter(event => event._id !== eventIdToDelete)
          );
          return { previousEvents };
      },
      onError: (err, variables, context) => {
           console.error("Error deleting timeline event:", err);
           toast.error(`Failed to delete event: ${err.message}`);
           if (context?.previousEvents) {
               queryClient.setQueryData(['timelineEvents'], context.previousEvents);
           }
      },
      onSuccess: () => {
          toast.success('Event deleted!');
      },
      onSettled: () => {
           queryClient.invalidateQueries({ queryKey: ['timelineEvents'] });
      },
  });

  // --- Handlers ---
  const handleNavigateToArticle = (articleId) => {
    if (articleId) {
      navigate('/wiki', { state: { selectedArticleId: articleId } });
    }
  };

  // Toggle Add Form visibility
  const handleAddClick = () => {
    setEditingEvent(null); // Ensure not editing
    setShowAddForm(!showAddForm); // Toggle form visibility
  };

  // Set event data for editing, show form
  const handleEdit = (event) => {
    setEditingEvent(event);
    setShowAddForm(true); // Show form for editing
  };

  // Call delete mutation
  const handleDelete = (eventId) => {
    if (!eventId) return;
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteEventMutation.mutate(eventId);
    }
  };

  // Show article link modal (used by form)
  const handleShowLinkModal = (currentId, targetSetter) => {
    setLinkModalCurrentId(currentId);
    // Store the function that will update the form's state
    setLinkModalTargetSetter(() => targetSetter); 
    setShowArticleLinkModal(true);
  };

  // Handle article selection in modal (used by form)
  const handleModalSelectArticle = (selectedArticle) => {
    if (linkModalTargetSetter) {
      // Call the stored setter function to update the form state
      linkModalTargetSetter(selectedArticle);
    }
    // Close modal and reset state
    setShowArticleLinkModal(false);
    setLinkModalTargetSetter(null);
    setLinkModalCurrentId(null);
  };

  // Renamed: This is now the function passed to the form's onSubmit
  const handleFormSubmit = (formDataFromForm) => {
      saveEventMutation.mutate(formDataFromForm);
  };

  // Cancel button handler for the form
  const handleFormCancel = () => {
    setEditingEvent(null);
    setShowAddForm(false);
  };

  // Determine if the form should be visible (either adding or editing)
  const isFormVisible = showAddForm || editingEvent !== null;

  // --- Render Logic ---
  return (
    <div className="timeline-page">
      <div className="timeline-page-header">
        <h2>Timeline</h2>
        <button onClick={handleAddClick} className="add-event-button">
          <FaPlus /> {showAddForm ? 'Cancel' : 'Add Event'}
        </button>
      </div>

      {/* Conditionally render Add/Edit Form */} 
      {showAddForm && (
        <TimelineEventForm
            event={editingEvent} // Pass null for add, event data for edit
            articles={articles}
          onSubmit={handleFormSubmit} 
          onCancel={handleFormCancel}
            onShowLinkModal={handleShowLinkModal}
          />
      )}
      
      {/* Show loading spinner */}
      {isLoading && (
        <div className="loading-container">
          <FaSpinner className="spinner" /> Loading events...
        </div>
      )}

      {/* Show error message */}
      {error && <div className="error-container">Error loading data: {error.message}</div>}

      {/* Render Horizontal Timeline View */}
      {!isLoading && !error && (
        <HorizontalTimelineView 
          events={events} // Pass events from query
          // Decide what happens when an event is clicked
          // Option 1: Open the edit form
          onEventClick={handleEdit} 
          // Option 2: Navigate to linked article (if exists)
          // onEventClick={(event) => handleNavigateToArticle(event.linkedArticle)}
        />
      )}

      {/* Article Link Modal (remains the same) */}
      {showArticleLinkModal && (
        <ArticleLinkModal
          articles={articles} 
          currentArticleId={linkModalCurrentId}
          onSelectArticle={handleModalSelectArticle}
          onClose={() => {
              setShowArticleLinkModal(false);
              setLinkModalTargetSetter(null);
              setLinkModalCurrentId(null);
          }}
        />
      )}
    </div>
  );
};

export default TimelinePage; 