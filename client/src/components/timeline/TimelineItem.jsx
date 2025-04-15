import React from 'react';
import * as FaIcons from 'react-icons/fa';
import './TimelineItem.css';

// Function to render the appropriate icon component
const renderIcon = (iconName, size = '1.5em', color = 'currentColor') => {
  if (!iconName) return null;
  const IconComponent = FaIcons[iconName];
  return IconComponent ? <IconComponent size={size} color={color} /> : null;
};

const TimelineItem = ({ event, style, onClick }) => {
  const { title, startDate, endDate, icon, color, linkedArticle } = event;
  
  // Basic date formatting (can be enhanced)
  const formatDateRange = () => {
    let start = startDate || event.dateString;
    let end = endDate;
    if (!start) return '';
    if (!end || end === start) return start;
    return `${start} - ${end}`;
  };

  // Construct style for background color and glow
  const itemStyle = {
    ...style, // Apply calculated left/width
    // Set CSS variables instead of direct styles
    '--item-bg-color': color || '#3b82f6',
    '--item-shadow-color': color || '#3b82f6',
  };

  // Handle click - potentially navigate or open details
  const handleClick = () => {
    if (onClick) {
        onClick(event); // Pass the event object up
    }
    // Or handle navigation directly if needed:
    // if (linkedArticle) {
    //   navigate(...);
    // }
  };

  return (
    <div 
      className="timeline-item" 
      style={itemStyle} 
      onClick={handleClick}
      title={`${title} (${formatDateRange()})`} // Tooltip for full info
    >
      <div className="timeline-item-icon">
        {renderIcon(icon || 'FaCalendarAlt', '1.2em')} {/* Default icon */}
      </div>
      <div className="timeline-item-content">
        <div className="timeline-item-title">{title || 'Untitled Event'}</div>
        <div className="timeline-item-dates">{formatDateRange()}</div>
      </div>
      {/* Optional: Add indicators for start/end or interactivity */}
      {/* <div className="timeline-item-handle left">‹</div> */}
      {/* <div className="timeline-item-handle right">›</div> */}
    </div>
  );
};

export default TimelineItem; 