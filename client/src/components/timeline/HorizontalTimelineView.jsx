import React from 'react';
import TimelineItem from './TimelineItem';
import './HorizontalTimelineView.css';

// Helper function to calculate the day number since Year 1, Month 0, Day 1
// Assumes month is 0-indexed, day is 1-indexed
const dateToDayNumber = (dateObj, settings, getDaysInMonthFunc) => {
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
    return null; // Indicate invalid input
  }

  let totalDays = 0;
  const targetYear = dateObj.year;
  const targetMonth = dateObj.month;
  const targetDay = dateObj.day;

  // Basic handling for negative/zero years - treat as invalid for now
  if (targetYear < 1) {
    console.warn(
      `Timeline does not support years before Year 1 (received ${targetYear}). Event will be ignored.`
    );
    return null;
  }

  // Add days for full years prior to the target year
  for (let y = 1; y < targetYear; y++) {
    let daysInYearY = 0;
    for (let m = 0; m < settings.monthNames.length; m++) {
      daysInYearY += getDaysInMonthFunc(m, y);
    }
    // Handle potential infinite loops or extremely large numbers if calculation is flawed
    if (!Number.isFinite(daysInYearY)) {
        console.error(`Calculation error: Non-finite days in year ${y}`);
        return null;
    }
    totalDays += daysInYearY;
     // Safety break for extremely large numbers to prevent browser freezing
     if (totalDays > Number.MAX_SAFE_INTEGER / 2) {
        console.warn(`Timeline calculation reached extreme values for year ${y}, clamping.`);
        totalDays = Number.MAX_SAFE_INTEGER / 2; // Clamp to avoid overflow issues later
        break; // Stop calculating further years
     }
  }

  // Add days for full months prior to the target month in the target year
  for (let m = 0; m < targetMonth; m++) {
    const daysInMonthM = getDaysInMonthFunc(m, targetYear);
     if (!Number.isFinite(daysInMonthM)) {
        console.error(`Calculation error: Non-finite days in month ${m}, year ${targetYear}`);
        return null;
    }
    totalDays += daysInMonthM;
  }

  // Add the day in the target month
  // Ensure targetDay does not exceed days in the month
  const daysInTargetMonth = getDaysInMonthFunc(targetMonth, targetYear);
  if (targetDay > daysInTargetMonth) {
      console.warn(`Day ${targetDay} exceeds days in month ${targetMonth} of year ${targetYear}. Clamping day.`);
      totalDays += daysInTargetMonth;
  } else {
       totalDays += targetDay;
  }


  if (!Number.isFinite(totalDays)) {
      console.error("Calculation error: Final totalDays is not finite.");
      return null;
  }

  // Return 1 for the very first day (Year 1, Month 0, Day 1)
  return totalDays > 0 ? totalDays : 1;
};


const HorizontalTimelineView = ({
  events,
  onEventClick,
  formatDate, // Keep for display in TimelineItem
  calendarSettings,
  getDaysInMonth,
}) => {
  if (!events || events.length === 0) {
    return <div className="timeline-view-empty">No timeline events yet.</div>;
  }
  if (!calendarSettings || !getDaysInMonth) {
      return <div className="timeline-view-empty">Calendar settings not available.</div>;
  }

  // --- Process Events: Calculate Day Numbers ---
  const processedEvents = events
    .map((event) => {
      const startDayNum = dateToDayNumber(
        event.startDate,
        calendarSettings,
        getDaysInMonth
      );
      // Use startDate if endDate is missing or invalid
      const endDateObj = event.endDate || event.startDate;
      let endDayNum = dateToDayNumber(
          endDateObj,
          calendarSettings,
          getDaysInMonth
      );

      // Ensure endDayNum is valid and not before startDayNum
      if (endDayNum === null || (startDayNum !== null && endDayNum < startDayNum)) {
        endDayNum = startDayNum;
      }

      return {
        ...event, // Keep original event data
        startDayNumber: startDayNum,
        endDayNumber: endDayNum, // Use start if end is invalid/before start
      };
    })
    // Filter out events where startDayNumber couldn't be calculated
    .filter((event) => event.startDayNumber !== null);

  // Rely on sorting from TimelinePage, but could re-sort here by dayNumber if needed

  if (processedEvents.length === 0) {
    return (
      <div className="timeline-view-empty">
        No events with valid dates found within the supported calendar range.
      </div>
    );
  }

  // --- Calculate Date Range (in Days) ---
  const dayNumbers = processedEvents.flatMap((e) => [
    e.startDayNumber,
    e.endDayNumber,
  ]);
  const minDayNumber = Math.min(...dayNumbers);
  const maxDayNumber = Math.max(...dayNumbers);
  // Add 1 because span includes the start and end day
  const totalDaySpan = maxDayNumber > minDayNumber ? (maxDayNumber - minDayNumber + 1) : 1;


  // --- Lane Calculation (using Day Numbers) ---
  const lanes = []; // Stores the end day number of the last event in each lane
  const eventLayouts = processedEvents.map((event) => {
    const startDay = event.startDayNumber;
    const endDay = event.endDayNumber;

    // Calculate start offset and duration in days
    const startOffsetDays = startDay - minDayNumber;
    // Duration includes start and end day, add 1
    const eventDurationDays = endDay - startDay + 1;

    // Ensure a minimum visual duration (e.g., 0.1% of total span or at least 1 day)
    const minVisualDuration = Math.max(1, totalDaySpan * 0.001);
    const displayDurationDays = Math.max(eventDurationDays, minVisualDuration);

    let assignedLane = -1;
    // Find the first lane where this event fits (non-overlapping day numbers)
    for (let i = 0; i < lanes.length; i++) {
      // Event starts after the last event in this lane ends
       if (startDay > lanes[i]) {
         lanes[i] = endDay; // Update lane's end day
         assignedLane = i;
         break;
       }
    }

    // If no suitable lane found, create a new one
    if (assignedLane === -1) {
      lanes.push(endDay);
      assignedLane = lanes.length - 1;
    }

    // Calculate style percentages based on day numbers
    const calculatePercentage = (value, total) => (total > 1 ? (value / total) * 100 : 0);

    const leftPercent = calculatePercentage(startOffsetDays, totalDaySpan);
    // Ensure width doesn't exceed 100% if duration calculation has issues
    const widthPercent = calculatePercentage(displayDurationDays, totalDaySpan);

    const style = {
      left: `${leftPercent}%`,
      width: `${Math.min(widthPercent, 100 - leftPercent)}%`, // Prevent overflow
      '--lane-index': assignedLane,
    };

    return { originalEvent: event, style }; // Pass the original event object
  });

  const totalLanes = lanes.length;

  // --- Marker Calculation (Approximation for very large ranges) ---
  const markers = [];
  // Basic markers at start/end for context, formatting needs original date
   if (processedEvents.length > 0) {
       const firstEvent = processedEvents[0];
       const lastEvent = processedEvents[processedEvents.length - 1];
        markers.push({
            label: formatDate(firstEvent.startDate), // Use original date obj and formatter
            position: 0,
        });

        // Add end marker only if different from start and timeline has span
        if (totalDaySpan > 1 && lastEvent.startDayNumber > firstEvent.startDayNumber) {
             markers.push({
                label: formatDate(lastEvent.startDate), // Use original date obj
                position: 100,
             });
        }
   }

  // TODO: Add intermediate markers. This is complex for large/custom calendars.
  // Calculating intermediate year/century markers requires converting
  // a specific year (e.g., 10000) back to a day number relative to the
  // minDayNumber and totalDaySpan, using the dateToDayNumber logic.
  // This is omitted for now to focus on core functionality.


  return (
    <div className="timeline-container" style={{ '--total-lanes': totalLanes }}>
      <div className="timeline-track">
        {/* Render Event Items */}
        {eventLayouts.map(({ originalEvent, style }, index) => (
          <TimelineItem
            key={originalEvent._id || `event-${index}`}
            event={originalEvent}
            style={style}
            onClick={onEventClick}
            formatDate={formatDate} // Use the passed formatter
          />
        ))}
      </div>

      {/* Render Year Markers (Simplified) */} 
      <div className="timeline-markers">
        {markers.map((marker, index) => (
          <div
            key={`marker-${index}`}
            className="timeline-marker" // Removed century class for now
            style={{ left: `${marker.position}%` }}
          >
            {/* Adjust positioning based on percentage */} 
            <span className="marker-label" style={{ transform: marker.position > 95 ? 'translateX(-100%)' : (marker.position < 5 ? 'translateX(0)' : 'translateX(-50%)')}}>
                 {marker.label}
             </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HorizontalTimelineView; 