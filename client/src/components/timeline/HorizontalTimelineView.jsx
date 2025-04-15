import React from 'react';
import TimelineItem from './TimelineItem';
import './HorizontalTimelineView.css';

// Placeholder data structure for an event
// const sampleEvent = {
//   _id: '1',
//   title: 'Event Title',
//   startDate: '2024-01-01', // Assuming YYYY-MM-DD for now
//   endDate: '2024-01-15',
//   icon: 'FaLandmark', // Example icon name
//   color: '#3b82f6', // Example color
//   linkedArticle: 'articleId123' 
// };

// Helper to safely parse date strings (returns null on invalid)
const safeParseDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  // Check if the date is valid (Date object represents an actual date)
  return isNaN(date.getTime()) ? null : date;
};

const HorizontalTimelineView = ({ events, onEventClick }) => {
  if (!events || events.length === 0) {
    return <div className="timeline-view-empty">No timeline events yet.</div>;
  }

  // Filter out events with invalid or missing start dates for range calculation
  const validEvents = events
    .map(e => ({ ...e, start: safeParseDate(e.startDate || e.dateString) }))
    .filter(e => e.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime()); // Ensure sorted by start date

  if (validEvents.length === 0) {
    return <div className="timeline-view-empty">No events with valid dates found.</div>;
  }

  // --- Calculate Date Range and Positioning --- 
  const timestamps = validEvents.flatMap(e => {
      // Use start date if end date is missing/invalid for range calculation
      const end = safeParseDate(e.endDate) || e.start; 
      return [e.start.getTime(), end.getTime()]; // Already filtered for valid start
  });
  
  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);
  const totalDuration = Math.max(maxTimestamp - minTimestamp, 1); 

  // --- Lane Calculation for Overlaps --- 
  const lanes = []; // Stores the end time of the last event in each lane
  const eventLayouts = validEvents.map(event => {
    const startDate = event.start; // Already parsed and validated
    let endDate = safeParseDate(event.endDate) || startDate; 
    if (endDate.getTime() < startDate.getTime()) endDate = startDate;

    const startOffset = startDate.getTime() - minTimestamp;
    const eventDuration = endDate.getTime() - startDate.getTime();
    const minEventDuration = totalDuration * 0.001; 
    const displayDuration = Math.max(eventDuration, minEventDuration);

    let assignedLane = -1;
    // Find the first lane where this event fits
    console.log(`Processing Event: ${event.title || event._id}, Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);
    for (let i = 0; i < lanes.length; i++) {
      console.log(`  Checking Lane ${i}: Event Start (${startDate.getTime()}) >= Lane End (${lanes[i]}) ?`);
      if (startDate.getTime() >= lanes[i]) { // If event starts after the last event in this lane ends
        console.log(`    YES - Assigning to Lane ${i}. Updating Lane End to ${endDate.getTime()}`);
        lanes[i] = endDate.getTime(); // Place it here, update lane's end time
        assignedLane = i;
        break;
      }
      console.log(`    NO - Event overlaps or starts before lane ${i} ends.`);
    }

    // If no suitable lane found, create a new one
    if (assignedLane === -1) {
      console.log(`  No suitable lane found. Creating New Lane ${lanes.length}. Setting Lane End to ${endDate.getTime()}`);
      lanes.push(endDate.getTime());
      assignedLane = lanes.length - 1;
    }

    const style = {
      left: `${(startOffset / totalDuration) * 100}%`,
      width: `${(displayDuration / totalDuration) * 100}%`,
      '--lane-index': assignedLane, // Pass lane index as CSS variable
    };

    return { event, style }; // Return layout info
  });

  const totalLanes = lanes.length;

  // --- Marker and Line Calculation --- 
  const startYear = new Date(minTimestamp).getFullYear();
  const endYear = new Date(maxTimestamp).getFullYear();
  const yearSpan = endYear - startYear;

  const markers = [];
  const centuryLines = [];

  // Determine marker interval based on total span
  let yearInterval = 1;
  if (yearSpan > 10000) yearInterval = 1000;
  else if (yearSpan > 1000) yearInterval = 100;
  else if (yearSpan > 200) yearInterval = 20;
  else if (yearSpan > 50) yearInterval = 10;
  else if (yearSpan > 10) yearInterval = 5;

  // Function to calculate horizontal percentage
  const getPercentage = (timestamp) => ((timestamp - minTimestamp) / totalDuration) * 100;

  for (let year = Math.ceil(startYear / yearInterval) * yearInterval; year <= endYear; year += yearInterval) {
    // Use start of the year for positioning
    const yearTimestamp = new Date(year, 0, 1).getTime(); 
    if (yearTimestamp >= minTimestamp && yearTimestamp <= maxTimestamp) {
        markers.push({
            year: year,
            style: { left: `${getPercentage(yearTimestamp)}%` }
        });
    }
  }

  // Calculate Century Lines
  const startCentury = Math.floor(startYear / 100) * 100;
  const endCentury = Math.ceil(endYear / 100) * 100;
  for (let year = startCentury; year <= endCentury; year += 100) {
    const centuryTimestamp = new Date(year, 0, 1).getTime();
    // Check if the calculated centuryTimestamp is within the actual event range
    if (centuryTimestamp >= minTimestamp && centuryTimestamp <= maxTimestamp) { 
      centuryLines.push({
        year: year,
        style: { left: `${getPercentage(centuryTimestamp)}%` }
      });
    }
  }

  // --- Rendering ---
  return (
    <div className="timeline-view-container">
      <div className="timeline-markers-area">
        {markers.map(marker => (
          <div key={marker.year} className="timeline-year-marker" style={marker.style}>
            {marker.year}
          </div>
        ))}
      </div>
      <div className="timeline-track-area" style={{ '--total-lanes': totalLanes }}>
        <div className="timeline-base-track"></div>
        {centuryLines.map(line => (
          <div key={line.year} className="timeline-century-line" style={line.style}></div>
        ))}
        {eventLayouts.map(({ event, style }) => (
          <TimelineItem 
            key={event._id}
            event={event} 
            style={style}
            onClick={() => onEventClick(event)}
          />
        ))}
      </div>
    </div>
  );
};

export default HorizontalTimelineView; 