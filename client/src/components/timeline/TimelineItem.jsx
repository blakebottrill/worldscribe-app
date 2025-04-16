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
const TimelineItem = ({ event, style, onClick, formatDate }) => {
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

  return (
    <div 
      // Check article presence directly
      className={`timeline-item ${article?._id ? 'has-link' : ''} clickable`} 
      style={itemStyle} 
      onClick={handleItemClick} // Use the simple handler
      // Use title field here
      title={`${title || 'Untitled Event'} (${formatDateRange()})`} 
    >
      <div className="timeline-item-icon">
        {/* Default icon is now FaStream or similar? Let's use FaCalendarAlt for now */}
        {renderIcon(icon || 'FaCalendarAlt', '1.2em')}
      </div>
      <div className="timeline-item-content">
        {/* Use title field here */}
        <div className="timeline-item-title">{title || 'Untitled Event'}</div>
        {/* Display the formatted date range */}
        <div className="timeline-item-dates">{formatDateRange()}</div> 
      </div>
    </div>
  );
};

export default TimelineItem; 