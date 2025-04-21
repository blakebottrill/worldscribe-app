import React, { useState, useRef, useEffect } from 'react';
import { InputGroup, Form, Button, Overlay } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import Calendar from './Calendar';
import { useCalendar } from '../contexts/CalendarContext';
import './DatePicker.css';

const DatePicker = ({ 
  value, 
  onChange,
  label,
  required = false,
  placeholder = "Select date...",
  name,
  id,
  isInvalid,
  invalidMessage,
  minDate = null,
  initialViewDate = null
}) => {
  const { formatDate } = useCalendar();
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value || null);
  const target = useRef(null);
  const calendarRef = useRef(null);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0, width: 0 });
  
  useEffect(() => {
    // Update selectedDate if value changes externally
    if (value !== undefined) {
      setSelectedDate(value);
    }
  }, [value]);
  
  useEffect(() => {
    // Add event listener for clicks outside the calendar
    const handleClickOutside = (event) => {
      // Check if the click target is the specific year input field
      // We identify it by its class name added in Calendar.jsx
      const isYearInput = event.target.classList.contains('calendar-year-input');

      if (
        !isYearInput && // Do not close if the click was on the year input
        calendarRef.current && 
        !calendarRef.current.contains(event.target) &&
        target.current && 
        !target.current.contains(event.target)
      ) {
        setShowCalendar(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); // Dependencies remain empty as refs don't change
  
  useEffect(() => {
    if (showCalendar && target.current) {
      // Get position relative to the viewport
      const rect = target.current.getBoundingClientRect();
      
      // Position below the input field, relative to the viewport
      const top = rect.bottom + 5; // 5px below the input
      const left = rect.left; // Align with left edge of input
      // Get width of the input field to match calendar width
      const width = rect.width;
      
      setCalendarPosition({ top, left, width });
    }
  }, [showCalendar]); // Recalculate when calendar visibility changes
  
  const handleInputClick = () => {
    setShowCalendar(!showCalendar);
  };
  
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    
    if (onChange) {
      onChange(date);
    }
    
    setShowCalendar(false);
  };
  
  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedDate(null);
    
    if (onChange) {
      onChange(null);
    }
  };
  
  return (
    <div className="date-picker-container">
      {label && (
        <Form.Label htmlFor={id} className={required ? 'required-label' : ''}>
          {label}
        </Form.Label>
      )}
      
      <InputGroup ref={target} onClick={handleInputClick} className="date-picker-input">
        <Form.Control
          id={id}
          name={name}
          placeholder={placeholder}
          value={selectedDate ? formatDate(selectedDate) : ''}
          readOnly
          isInvalid={isInvalid}
        />
        
        <InputGroup.Text className="date-picker-icon">
          <FontAwesomeIcon icon={faCalendarAlt} />
        </InputGroup.Text>
        
        {selectedDate && (
          <Button 
            variant="outline-secondary" 
            className="date-picker-clear-btn"
            onClick={handleClear}
          >
            ×
          </Button>
        )}
      </InputGroup>
      
      {isInvalid && invalidMessage && (
        <div className="invalid-feedback d-block">
          {invalidMessage}
        </div>
      )}
      
      {/* Render Calendar container with fixed position relative to viewport */}
      {showCalendar && (
        <div 
          ref={calendarRef} 
          id="date-picker-calendar-container" 
          className="date-picker-popover" // Use popover styling class
          style={{ 
            position: 'fixed', 
            zIndex: 9999, 
            top: `${calendarPosition.top}px`, 
            left: `${calendarPosition.left}px`,
            width: `${calendarPosition.width}px`
          }} 
        >
          <Calendar
            onDateSelect={handleDateSelect}
            initialDate={selectedDate}
            initialViewDate={initialViewDate || selectedDate}
            minDate={minDate}
          />
        </div>
      )}
      
    </div>
  );
};

export default DatePicker; 