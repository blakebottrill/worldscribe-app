import React from 'react';

// Basic list view of events
const TimelineEventList = ({ events, onNavigateToArticle, onEdit, onDelete }) => {
  const listStyle = {
    listStyle: 'none',
    padding: 0,
  };
  const itemStyle = {
    border: '1px solid #ccc',
    padding: '10px',
    marginBottom: '10px',
    borderRadius: '4px',
  };

  if (events.length === 0) {
    return <p>No timeline events yet.</p>;
  }

  return (
    <ul style={listStyle}>
      {events.map(event => (
        <li key={event._id} style={itemStyle}>
          <h3>{event.eventName}</h3>
          <p><strong>Date:</strong> {event.dateString}</p>
          {event.description && <p>{event.description}</p>}
          {event.article && (
            <p><em>Related Article: 
              <span 
                data-mention-id={event.article._id}
                data-mention-label={event.article.title}
                onClick={() => onNavigateToArticle(event.article._id)}
              >
                {event.article.title}
              </span>
            </em></p>
          )}
          {/* Add Edit/Delete buttons */}
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <button onClick={() => onEdit(event)}>Edit</button>
            <button onClick={() => onDelete(event._id)} style={{ backgroundColor: '#dc3545', color: 'white' }}>Delete</button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default TimelineEventList; 