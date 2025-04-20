import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaSpinner, FaPlus, FaStream, FaCog } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { Container, Row, Col, Button } from 'react-bootstrap'; // Added react-bootstrap components

// Import the new service and components
import timelineService from '../services/timelineService';
import EventForm from '../components/EventForm'; // Use the calendar event form
import { CalendarProvider, useCalendar } from '../contexts/CalendarContext'; // Import Calendar context

// Keep relevant view component and article linking
import HorizontalTimelineView from '../components/timeline/HorizontalTimelineView';
import ArticleLinkModal from '../components/common/ArticleLinkModal';
import CalendarSettings from '../components/CalendarSettings'; // Import the settings modal

import './TimelinePage.css';

// Utility function to convert date object {year, month, day} to JS Date
// Needed for sorting or display components that expect JS Date
// Note: month is 0-indexed in JS Date, assuming our model is also 0-indexed
const convertToJSDate = (dateObj) => {
  if (!dateObj || dateObj.year === undefined || dateObj.month === undefined || dateObj.day === undefined) {
    return null;
  }
  // Month needs to be 0-indexed for JS Date constructor
  return new Date(dateObj.year, dateObj.month, dateObj.day);
};

// Main page component content
const TimelinePageContent = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatDate, calendarSettings, getDaysInMonth } = useCalendar(); // Get formatting function, settings, and getDaysInMonth

  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showSettings, setShowSettings] = useState(false); // State for settings modal

  // --- Queries ---
  // Fetch timeline events using the new service
  const { data: events = [], isLoading: isLoadingEvents, error: eventsError } = useQuery({
    queryKey: ['timelineEvents'], 
    queryFn: () => timelineService.getAllEvents(), 
    select: (data) => { 
      // Sort data after fetching, comparing date components directly
      return [...data].sort((a, b) => {
        const dateA = a.startDate;
        const dateB = b.startDate;

        // Handle cases where dates might be missing or incomplete
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1; // Sort items without dates after those with dates
        if (!dateB) return -1;

        // Compare year first
        if (dateA.year !== dateB.year) {
          return (dateA.year || 0) - (dateB.year || 0);
        }
        // If years are the same, compare month
        if (dateA.month !== dateB.month) {
          return (dateA.month || 0) - (dateB.month || 0);
        }
        // If months are the same, compare day
        if (dateA.day !== dateB.day) {
          return (dateA.day || 0) - (dateB.day || 0);
        }
        
        // If all components are the same, maintain original order
        return 0; 
      });
    }
  });

  // Fetch articles for linking (assuming this service exists or is created)
  // Let's reuse the old direct fetch for now, refactor later if needed
  const fetchArticlesAPI = async () => { 
    const response = await fetch('http://localhost:5001/api/articles');
    if (!response.ok) throw new Error('Failed to fetch articles');
    return response.json();
  };
  const { data: articles = [], isLoading: isLoadingArticles, error: articlesError } = useQuery({
    queryKey: ['articles'], 
    queryFn: fetchArticlesAPI, 
  });

  const isLoading = isLoadingEvents || isLoadingArticles;
  // Combine errors, prioritizing events error
  const error = eventsError || articlesError; 

  // --- Mutations ---
  // Use the new service for saving events
  const saveEventMutation = useMutation({
    mutationFn: async (eventData) => {
        const dataToSave = { 
            ...eventData, 
            articleId: eventData.articleId || null 
        }; 
        delete dataToSave.id; 
        
        // Log the data being sent
        console.log('[TimelinePage] Saving event payload:', dataToSave);
        
        if (eventData.id) { 
            return await timelineService.updateEvent(eventData.id, dataToSave);
        } else {
            return await timelineService.createEvent(dataToSave);
        }
    },
    onSuccess: (savedEvent) => {
        toast.success(`Event ${savedEvent.title} saved successfully!`);
        queryClient.invalidateQueries({ queryKey: ['timelineEvents'] });
        setShowEventForm(false);
        setEditingEvent(null);
    },
    onError: (err) => {
        // Error already logged by service, toast displayed here
        toast.error(`Failed to save event: ${err.message || 'Check console for details'}`);
        // Re-throw to allow EventForm's .catch() to potentially work
        throw err; 
    },
  });

  // Use the new service for deleting events
  const deleteEventMutation = useMutation({
      mutationFn: timelineService.deleteEvent,
      onSuccess: () => {
          toast.success('Event deleted!');
          queryClient.invalidateQueries({ queryKey: ['timelineEvents'] });
          setShowEventForm(false); // Close form if deleting from form
          setEditingEvent(null);
      },
      onError: (err) => {
           console.error("Error deleting timeline event:", err);
           toast.error(`Failed to delete event: ${err.message || 'Unknown error'}`);
      },
  });

  // --- Handlers ---
  const handleNavigateToArticle = (articleId) => {
    if (articleId) {
      navigate('/wiki', { state: { selectedArticleId: articleId } });
    }
  };

  // Open the EventForm modal for creating a new event
  const handleAddClick = () => {
    setEditingEvent(null);
    setShowEventForm(true);
  };

  // Open the EventForm modal for editing an existing event
  const handleEditEvent = (event) => {
    const articleData = articles.find(a => a._id === event.article?._id);
    const eventForForm = {
        ...event,
        id: event._id,
        articleId: event.article?._id || null,
        // Include article title for display in form
        linkedArticleTitle: articleData?.title || '' 
    };
    setEditingEvent(eventForForm);
    setShowEventForm(true);
  };

  // Passed to EventForm, returns the promise from the mutation
  const handleEventSaved = (eventDataFromForm) => {
    // Return the promise so EventForm can use .then/.catch/.finally
    return saveEventMutation.mutateAsync(eventDataFromForm); 
  };

  // Handler to pass down for deleting an event
  const handleDeleteEvent = (eventId) => {
    // Optional: Add confirmation here if desired, though it's better in the form
    deleteEventMutation.mutate(eventId);
  };

  // --- Render Logic ---
  // Display loading indicator more reliably
  if (isLoading && !error) { 
    return <Container className="text-center mt-5"><FaSpinner className="spinner" size={30} /> Loading Timeline...</Container>;
  }

  // Display error prominently if fetching fails
  if (error && !isLoading) { 
    return <Container className="alert alert-danger mt-5">Error loading timeline: {error.message}</Container>;
  }

  return (
    <Container fluid className="timeline-page py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="page-title">
              <FaStream className="me-2" />
              Timeline / Events 
            </h2>
            <div>
              <Button 
                variant="outline-secondary" 
                className="me-2" 
                onClick={() => setShowSettings(true)} // Show settings modal
              >
                <FaCog className="me-1" /> Calendar Settings
              </Button>
              <Button variant="primary" onClick={handleAddClick}>
                <FaPlus className="me-1" /> Add Event
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      <HorizontalTimelineView 
        events={events} 
        onEventClick={handleEditEvent} 
        formatDate={formatDate} // Keep passing this for display
        calendarSettings={calendarSettings} // Pass settings
        getDaysInMonth={getDaysInMonth} // Pass function
      />
      
      {/* Render the new EventForm Modal */} 
      {showEventForm && (
          <EventForm
            key={editingEvent?.id || 'new'} 
            show={showEventForm}
            onHide={() => {
              setShowEventForm(false);
              setEditingEvent(null);
            }}
            event={editingEvent} 
            onEventSaved={handleEventSaved}
            onDelete={handleDeleteEvent} 
            articles={articles} // Pass articles list
          />
      )}

      {/* Conditionally render Calendar Settings Modal */}
      <CalendarSettings 
        show={showSettings} 
        onHide={() => setShowSettings(false)} 
      />

    </Container>
  );
}

// Main component that includes the Provider
const TimelinePage = () => {
  return (
    <CalendarProvider> 
      <TimelinePageContent />
    </CalendarProvider>
  );
};

export default TimelinePage; 