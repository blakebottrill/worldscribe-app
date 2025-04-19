import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarPlus, faTimes, faLink, faUnlink, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import DatePicker from './DatePicker';
import { useCalendar } from '../contexts/CalendarContext';
import toast from 'react-hot-toast';
import './EventForm.css';

// --- Copied Helper Function (Ideally move to utils) ---
const dateToDayNumber = (dateObj, settings, getDaysInMonthFunc) => {
    // ... (Full implementation of dateToDayNumber as used previously)
  if (
    !dateObj ||
    dateObj.year === undefined ||
    dateObj.month === undefined ||
    dateObj.day === undefined ||
    !settings ||
    !getDaysInMonthFunc ||
    dateObj.month < 0 ||
    dateObj.month >= settings.monthNames.length ||
    dateObj.day < 1
  ) {
    return null; 
  }
  let totalDays = 0;
  const targetYear = dateObj.year;
  const targetMonth = dateObj.month;
  const targetDay = dateObj.day;
  if (targetYear < 1) {
    return null;
  }
  for (let y = 1; y < targetYear; y++) {
    let daysInYearY = 0;
    for (let m = 0; m < settings.monthNames.length; m++) {
      daysInYearY += getDaysInMonthFunc(m, y);
    }
    if (!Number.isFinite(daysInYearY)) {
        return null;
    }
    totalDays += daysInYearY;
     if (totalDays > Number.MAX_SAFE_INTEGER / 2) {
        totalDays = Number.MAX_SAFE_INTEGER / 2;
        break;
     }
  }
  for (let m = 0; m < targetMonth; m++) {
    const daysInMonthM = getDaysInMonthFunc(m, targetYear);
     if (!Number.isFinite(daysInMonthM)) {
        return null;
    }
    totalDays += daysInMonthM;
  }
  const daysInTargetMonth = getDaysInMonthFunc(targetMonth, targetYear);
  if (targetDay > daysInTargetMonth) {
      totalDays += daysInTargetMonth;
  } else {
       totalDays += targetDay;
  }
  if (!Number.isFinite(totalDays)) {
      return null;
  }
  return totalDays > 0 ? totalDays : 1;
};
// --- End Helper Function ---

const EventForm = ({ show, onHide, event = null, onEventSaved, onDelete, onLinkArticleClick, linkedArticleTitle }) => {
  const { formatDate, calendarSettings, getDaysInMonth } = useCalendar();
  const [loading, setLoading] = useState(false);
  const [validated, setValidated] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: null,
    endDate: null,
    isAllDay: true,
    color: '#4a6de5',
    articleId: null,
    important: false
  });
  
  const [currentLinkedArticleTitle, setCurrentLinkedArticleTitle] = useState('');

  useEffect(() => {
    if (event) {
      setFormData({
        id: event.id || null,
        title: event.title || '',
        description: event.description || '',
        startDate: event.startDate || null,
        endDate: event.endDate || null,
        isAllDay: event.isAllDay !== undefined ? event.isAllDay : true,
        color: event.color || '#4a6de5',
        articleId: event.articleId || null,
        important: event.important || false
      });
      setCurrentLinkedArticleTitle(linkedArticleTitle || '');
    } else {
      resetForm();
      setCurrentLinkedArticleTitle('');
    }
  }, [event, show, linkedArticleTitle]);
  
  // --- NEW useEffect to synchronize End Date when Start Date changes ---
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
        const startDayNum = dateToDayNumber(formData.startDate, calendarSettings, getDaysInMonth);
        const endDayNum = dateToDayNumber(formData.endDate, calendarSettings, getDaysInMonth);

        if (startDayNum !== null && endDayNum !== null && startDayNum > endDayNum) {
            console.log("Start date changed to be after end date. Updating end date.");
            setFormData(prev => ({ ...prev, endDate: prev.startDate }));
        }
    }
    // Only run when startDate changes (or calendar settings change)
  }, [formData.startDate, calendarSettings, getDaysInMonth]); 

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startDate: null,
      endDate: null,
      isAllDay: true,
      color: '#4a6de5',
      articleId: null,
      important: false,
      id: null
    });
    setValidated(false);
    setCurrentLinkedArticleTitle('');
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleDateChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleLinkClick = () => {
    if (onLinkArticleClick) {
      onLinkArticleClick();
    }
  };

  const handleUnlinkClick = (e) => {
    e.stopPropagation();
    setFormData(prev => ({ ...prev, articleId: null }));
    setCurrentLinkedArticleTitle('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const form = e.currentTarget;
    if (form.checkValidity() === false || !formData.startDate) {
      e.stopPropagation();
      setValidated(true);
      if (!formData.startDate) toast.error('Start date is required');
      return;
    }
    
    setLoading(true);
    
    if (onEventSaved) {
      onEventSaved(formData)
        .then(() => {
          onHide();
        })
        .catch((err) => {
          console.error("Save failed (handled by parent):", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      console.warn("EventForm: onEventSaved prop is missing!");
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!event || !event.id) {
      toast.error("Cannot delete an unsaved event.");
      return;
    }

    if (window.confirm(`Are you sure you want to delete the event "${formData.title}"?`)) {
      if (onDelete) {
        onDelete(event.id);
      } else {
        console.warn("EventForm: onDelete prop is missing!");
      }
    }
  };
  
  return (
    <Modal 
      show={show} 
      onHide={onHide}
      centered
      className="event-form-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <FontAwesomeIcon icon={faCalendarPlus} className="me-2" />
          {event && event.id ? 'Edit Event' : 'Create Event'}
        </Modal.Title>
      </Modal.Header>
      
      <Form noValidate validated={validated} onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="required-label">Title</Form.Label>
            <Form.Control
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Event title"
              required
              disabled={loading}
            />
            <Form.Control.Feedback type="invalid">
              Please provide a title
            </Form.Control.Feedback>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Event description"
              disabled={loading}
            />
          </Form.Group>
          
          <Row className="mb-3">
            <Col md={12}>
              <DatePicker
                label="Start Date"
                required
                value={formData.startDate}
                onChange={(date) => handleDateChange('startDate', date)}
                id="event-start-date"
                isInvalid={validated && !formData.startDate}
                invalidMessage="Start date is required"
                disabled={loading}
              />
            </Col>
          </Row>
          
          <Row className="mb-3">
            <Col md={12}>
              <DatePicker
                label="End Date"
                value={formData.endDate}
                onChange={(date) => handleDateChange('endDate', date)}
                id="event-end-date"
                minDate={formData.startDate}
                disabled={loading}
              />
            </Col>
          </Row>
          
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="all-day-event"
              label="All day event"
              name="isAllDay"
              checked={formData.isAllDay}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Event Color</Form.Label>
            <Form.Control
              type="color"
              name="color"
              value={formData.color}
              onChange={handleInputChange}
              title="Choose event color"
              disabled={loading}
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="important-event"
              label="Mark as important"
              name="important"
              checked={formData.important}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Linked Article</Form.Label>
            <div className="d-flex align-items-center">
              <span className="linked-article-display me-2">
                {currentLinkedArticleTitle || 'None'}
              </span>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={handleLinkClick}
                disabled={loading}
                className="me-1"
              >
                <FontAwesomeIcon icon={faLink} className="me-1" />
                {formData.articleId ? 'Change' : 'Link'}
              </Button>
              {formData.articleId && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={handleUnlinkClick}
                  disabled={loading}
                  title="Unlink Article"
                >
                  <FontAwesomeIcon icon={faUnlink} />
                </Button>
              )}
            </div>
          </Form.Group>
        </Modal.Body>
        
        <Modal.Footer>
          {event && event.id && (
            <Button 
              variant="danger" 
              onClick={handleDelete} 
              disabled={loading} 
              className="me-auto"
            >
              <FontAwesomeIcon icon={faTrashAlt} className="me-1" />
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : (event && event.id ? 'Update Event' : 'Create Event')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EventForm; 