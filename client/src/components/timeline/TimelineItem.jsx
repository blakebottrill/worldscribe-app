import React from 'react';
import * as FaIcons from 'react-icons/fa';
import './TimelineItem.css';

// Function to render the appropriate icon component
const renderIcon = (iconName, size = '1.5em', color = 'currentColor') => {
  if (!iconName) return null;
  const IconComponent = FaIcons[iconName];
  return IconComponent ? <IconComponent size={size} color={color} /> : null;
};

// New function to compare if two date objects represent the same day
const areDatesEqual = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.year === date2.year && 
           date1.month === date2.month && 
           date1.day === date2.day;
};

// Updated props: event, style, onClick (instead of onSelectEvent), formatDate
// Added props: extendsLeft and extendsRight flags
// New props: isExiting and exitingDirection
const TimelineItem = ({ 
  event, 
  style, 
  onClick, 
  formatDate, 
  extendsLeft = false, 
  extendsRight = false,
  isExiting = false, 
  exitingDirection = 'left'
}) => {
  // Use title, startDate, endDate from the event object
  const { title, startDate, endDate, icon, color, article } = event; 
  
  // Use the passed formatDate function for display
  const formatDateRange = () => {
    if (!startDate || !formatDate) return '';
    
    const formattedStartDate = formatDate(startDate);
    
    // Check if endDate is different from startDate before formatting
    if (!endDate || areDatesEqual(startDate, endDate)) { 
      return formattedStartDate;
    }
    
    const formattedEndDate = formatDate(endDate);
    return `${formattedStartDate} – ${formattedEndDate}`;
  };

  const itemStyle = {
    ...style,
    '--item-bg-color': color || '#3a87ad', // Use the default from the model
    '--item-shadow-color': color || '#3a87ad',
  };

  // Simple click handler calling the passed onClick prop
  const handleItemClick = () => {
      if (onClick) {
          onClick(event); // Pass the original event object up
      }
  };

  // Determine CSS classes based on state
  const itemClasses = [
    'timeline-item',
    article?._id ? 'has-link' : '',
    onClick ? 'clickable' : '',
    extendsLeft ? 'extends-left' : '',
    extendsRight ? 'extends-right' : '',
    isExiting ? 'is-exiting' : '',
    isExiting ? `exiting-${exitingDirection}` : ''
  ].filter(Boolean).join(' '); // Filter out empty strings and join

  return (
    <div 
      className={itemClasses} // Use the dynamic class string
      style={itemStyle} 
      onClick={handleItemClick} 
      title={`${title || 'Untitled Event'} (${formatDateRange()})`}
      data-event-id={event._id || ''}
      data-event-start={event.startDayNumber}
      data-event-end={event.endDayNumber}
    >
      {/* Left edge indicator if the event extends beyond visible range */}
      {extendsLeft && !isExiting && (
        <div className="timeline-item-edge-indicator left">
          {renderIcon('FaAngleLeft', '1.5em')}
        </div>
      )}
      
      <div className="timeline-item-icon">
        {renderIcon(icon || 'FaCalendarAlt', '1.2em')}
      </div>
      
      <div className="timeline-item-content">
        <div className="timeline-item-title">{title || 'Untitled Event'}</div>
        <div className="timeline-item-dates">{formatDateRange()}</div> 
      </div>
      
      {/* Right edge indicator if the event extends beyond visible range */}
      {extendsRight && !isExiting && (
        <div className="timeline-item-edge-indicator right">
          {renderIcon('FaAngleRight', '1.5em')}
        </div>
      )}
    </div>
  );
};

export default TimelineItem; 