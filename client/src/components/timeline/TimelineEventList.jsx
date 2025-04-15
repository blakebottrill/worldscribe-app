import React from 'react';
import './TimelineEventList.css'; // Import the CSS file

// Basic list view of events
const TimelineEventList = ({ events, onNavigateToArticle, onEdit, onDelete, isDisabled }) => {
  if (!events || events.length === 0) {
    return <p className="no-events-message">No timeline events yet.</p>; // Use class for message
  }

  return (
    <ul className="timeline-event-list"> {/* Use class for list */}
      {events.map(event => (
        <li key={event._id} className="timeline-event-item"> {/* Use class for item */}
          <h3>{event.eventName}</h3>
          <p><strong>Date:</strong> {event.dateString}</p>
          {event.description && <p>{event.description}</p>}
          {event.article && (
            <p className="related-article"> {/* Use class for related article */} 
              <em>Related Article: 
                <span 
                  data-mention-id={event.article._id}
                  data-mention-label={event.article.title}
                  onClick={() => onNavigateToArticle(event.article._id)}
                  // The span will inherit mention styles from index.css
                >
                  {event.article.title}
                </span>
              </em>
            </p>
          )}
          <div className="event-actions"> {/* Use class for actions div */}
            <button onClick={() => onEdit(event)} disabled={isDisabled}>Edit</button>
            <button 
              onClick={() => onDelete(event._id)} 
              className="delete-button" // Add class for delete button
              disabled={isDisabled}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default TimelineEventList; 