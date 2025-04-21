import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarPlus, faTimes, faLink, faUnlink, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import DatePicker from './DatePicker';
import { useCalendar } from '../contexts/CalendarContext';
import toast from 'react-hot-toast';
import './EventForm.css';
import ArticleLinkModal from './common/ArticleLinkModal';
import { dateToDayNumber } from '../utils/calendarUtils';

const EventForm = ({ show, onHide, event = null, onEventSaved, onDelete, articles = [] }) => {
  const { formatDate, calendarSettings, getDaysInMonth } = useCalendar();
  const [loading, setLoading] = useState(false);
  const [validated, setValidated] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: null,
    endDate: null,
    color: '#4a6de5',
    articleId: null,
  });
  
  const [showLinkModal, setShowLinkModal] = useState(false);

  useEffect(() => {
    if (event) {
      setFormData({
        id: event.id || null,
        title: event.title || '',
        description: event.description || '',
        startDate: event.startDate || null,
        endDate: event.endDate || null,
        color: event.color || '#4a6de5',
        articleId: event.articleId || null,
      });
    } else {
      resetForm();
    }
  }, [event?.id, show]);
  
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
      color: '#4a6de5',
      articleId: null,
      id: null
    });
    setValidated(false);
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleDateChange = (field, value) => {
    setFormData(prev => {
      const newState = {
        ...prev,
        [field]: value
      };
      
      // NEW: If setting startDate and endDate is null, set endDate too.
      if (field === 'startDate' && !prev.endDate) {
        newState.endDate = value; 
      }

      // Existing useEffect handles case where new startDate > existing endDate.
      
      return newState;
    });
  };
  
  const handleLinkClick = () => {
    setShowLinkModal(true);
  };

  const handleUnlinkClick = (e) => {
    e.stopPropagation();
    setFormData(prev => ({ ...prev, articleId: null }));
  };

  const handleArticleSelected = (selectedArticle) => {
      setFormData(prev => ({
          ...prev,
          articleId: selectedArticle?._id || null,
      }));
      setShowLinkModal(false);
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
  
  const linkedArticleTitleDisplay = useMemo(() => {
      if (!formData.articleId || !articles || articles.length === 0) return 'None';
      const linkedArticle = articles.find(a => a._id === formData.articleId);
      return linkedArticle?.title || 'Linked (Article not found)'; 
  }, [formData.articleId, articles]);

  return (
    <>
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
                  initialViewDate={formData.startDate}
                  disabled={loading}
                />
              </Col>
            </Row>
            
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
              <Form.Label>Linked Article</Form.Label>
              <div className="d-flex align-items-center">
                <span className="linked-article-display me-2">
                  {linkedArticleTitleDisplay}
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

      {showLinkModal && (
        <ArticleLinkModal
          articles={articles} 
          currentArticleId={formData.articleId || null} 
          onSelectArticle={handleArticleSelected}
          onClose={() => setShowLinkModal(false)}
        />
      )}
    </>
  );
};

export default EventForm; 