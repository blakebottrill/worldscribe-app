import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';
import TimelineEventList from '../components/timeline/TimelineEventList';
import TimelineEventForm from '../components/timeline/TimelineEventForm';
import ArticleLinkModal from '../components/common/ArticleLinkModal';
// TODO: Import components later

// --- Utility Functions ---
const extractFirstNumber = (str) => {
  if (!str) return Infinity;
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : Infinity;
};

// --- API Functions ---
const fetchTimelineEventsAPI = async () => {
  const response = await fetch('http://localhost:5001/api/timeline');
  if (!response.ok) throw new Error('Failed to fetch timeline events');
  const data = await response.json();
  // Sort events after fetching
  return data.sort((a, b) => extractFirstNumber(a.dateString) - extractFirstNumber(b.dateString));
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
            return newEvents.sort((a, b) => extractFirstNumber(a.dateString) - extractFirstNumber(b.dateString));
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
             return updatedEvents.sort((a, b) => extractFirstNumber(a.dateString) - extractFirstNumber(b.dateString));
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
    <div className="timeline-page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Timeline / Calendar</h2>
         {/* Button toggles form visibility, text changes based on state */}
         <button onClick={handleAddClick} disabled={saveEventMutation.isPending || deleteEventMutation.isPending}>
          {isFormVisible ? 'Cancel' : '+ Add Event'}
        </button>
      </div>

      {/* Display combined loading state */}
      {isLoading && (
           <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
               <FaSpinner className="spinner" size={24} />
           </div>
      )}
      {/* Display combined error state */}
      {error && <p style={{ color: 'red' }}>Error loading data: {error.message}</p>}

      {/* Render Form conditionally */}
      {isFormVisible && (
        <TimelineEventForm
          // Key ensures form resets when switching between add/edit or different events
          key={editingEvent?._id || 'add'}
          initialData={editingEvent} // Pass the event being edited (or null for add)
          // Pass the mutation function for submission
          onSubmit={handleFormSubmit} 
          onCancel={handleFormCancel}
          articles={articles} // Pass article list for linking
          onShowLinkModal={handleShowLinkModal} // Pass modal handler
          // Pass mutation state to disable form elements
          isSubmitting={saveEventMutation.isPending}
          // Pass mutation error state to display within the form?
          submitError={saveEventMutation.isError ? saveEventMutation.error : null}
        />
      )}

      {/* Render Event List */}
      {!isLoadingEvents && !eventsError && (
        <TimelineEventList 
          events={events} // Pass events from query
          onNavigateToArticle={handleNavigateToArticle}
          onEdit={handleEdit}
          onDelete={handleDelete} // Pass refactored delete handler
          // Disable edit/delete buttons while mutations are pending?
          isDisabled={saveEventMutation.isPending || deleteEventMutation.isPending}
        />
      )}

      {/* Article Link Modal (remains the same) */}
      {showArticleLinkModal && (
        <ArticleLinkModal
          articles={articles} // Pass articles from query
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