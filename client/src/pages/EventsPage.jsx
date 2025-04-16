import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarPlus, faCog, faCalendarDay } from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router-dom';
import Calendar from '../components/Calendar';
import EventForm from '../components/EventForm';
import CalendarSettings from '../components/CalendarSettings';
import { useCalendar } from '../contexts/CalendarContext';
import toast from 'react-hot-toast';
import calendarService from '../services/calendarService';
import './EventsPage.css';

const EventsPage = () => {
  const { worldId } = useParams();
  const { calendarSettings, formatDate } = useCalendar();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Load events for the current month when calendar or selected date changes
  useEffect(() => {
    if (selectedDate) {
      fetchEvents();
    }
  }, [selectedDate, worldId]);
  
  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Create start date (first day of the month)
      const startDate = {
        ...selectedDate,
        day: 1
      };
      
      // Create end date (last day of the month)
      const endDate = {
        ...selectedDate,
        day: 30 // Approximation, will be determined more precisely in the backend
      };
      
      const data = await calendarService.getEvents(worldId, startDate, endDate);
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };
  
  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setShowEventForm(true);
  };
  
  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setShowEventForm(true);
  };
  
  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await calendarService.deleteEvent(worldId, eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast.success('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };
  
  const handleEventSaved = (savedEvent) => {
    if (savedEvent.id) {
      // Update existing event in the list
      setEvents(prev => prev.map(e => e.id === savedEvent.id ? savedEvent : e));
    } else {
      // Add new event to the list
      setEvents(prev => [...prev, savedEvent]);
    }
  };
  
  const getEventsForDate = (date) => {
    if (!date) return [];
    
    return events.filter(event => {
      const eventStartDate = event.startDate;
      const eventEndDate = event.endDate || event.startDate;
      
      // Check if the date falls between start and end dates
      return (
        (date.year === eventStartDate.year && 
         date.month === eventStartDate.month && 
         date.day === eventStartDate.day) ||
        (date.year === eventEndDate.year && 
         date.month === eventEndDate.month && 
         date.day === eventEndDate.day)
      );
    });
  };
  
  const renderDateEvents = () => {
    if (!selectedDate) {
      return (
        <Card className="mb-4">
          <Card.Body className="text-center p-5">
            <FontAwesomeIcon icon={faCalendarDay} size="3x" className="text-muted mb-3" />
            <h4 className="text-muted">Select a date to view events</h4>
          </Card.Body>
        </Card>
      );
    }
    
    const dateEvents = getEventsForDate(selectedDate);
    
    return (
      <Card className="date-events-card mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Events for {formatDate(selectedDate)}</h5>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleCreateEvent}
          >
            <FontAwesomeIcon icon={faCalendarPlus} className="me-1" /> Add Event
          </Button>
        </Card.Header>
        <Card.Body>
          {dateEvents.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">No events for this date</p>
              <Button 
                variant="outline-primary" 
                onClick={handleCreateEvent}
              >
                <FontAwesomeIcon icon={faCalendarPlus} className="me-1" /> Create Event
              </Button>
            </div>
          ) : (
            <div className="event-list">
              {dateEvents.map(event => (
                <div 
                  key={event.id} 
                  className="event-item"
                  style={{ borderLeftColor: event.color || '#4a6de5' }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <h6 className="event-title mb-0">
                      {event.title}
                      {event.important && (
                        <Badge bg="danger" className="ms-2" pill>Important</Badge>
                      )}
                    </h6>
                    <div className="event-actions">
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-primary p-0 me-2"
                        onClick={() => handleEditEvent(event)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-danger p-0"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  {event.description && (
                    <p className="event-description mb-2">{event.description}</p>
                  )}
                  
                  <div className="event-meta text-muted small">
                    {event.isAllDay ? (
                      <span>All day</span>
                    ) : (
                      <span>Time details would go here</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };
  
  return (
    <Container fluid className="events-page py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="page-title">
              <FontAwesomeIcon icon={faCalendarDay} className="me-2" />
              Events & Calendar
            </h2>
            <Button
              variant="outline-secondary"
              onClick={() => setShowSettings(true)}
            >
              <FontAwesomeIcon icon={faCog} className="me-1" /> Calendar Settings
            </Button>
          </div>
        </Col>
      </Row>
      
      <Row>
        <Col lg={8}>
          <Calendar 
            onDateSelect={handleDateSelect}
            initialDate={selectedDate}
          />
        </Col>
        <Col lg={4}>
          {renderDateEvents()}
        </Col>
      </Row>
      
      <EventForm 
        show={showEventForm}
        onHide={() => setShowEventForm(false)}
        event={selectedEvent}
        onEventSaved={handleEventSaved}
      />
      
      <CalendarSettings
        show={showSettings}
        onHide={() => setShowSettings(false)}
      />
    </Container>
  );
};

export default EventsPage; 