import React, { useMemo, useState, useEffect, useRef } from 'react';
import TimelineItem from './TimelineItem';
import './HorizontalTimelineView.css';

// Helper function to calculate the day number since Year 1, Month 0, Day 1
// Assumes month is 0-indexed, day is 1-indexed
const dateToDayNumber = (dateObj, settings, getDaysInMonthFunc) => {
  // --- LOG INPUT ---
  console.log(`[dateToDayNumber] Input:`, dateObj);

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
    console.log(`[dateToDayNumber] Returning null due to initial invalid input.`); // <-- Log here
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
    console.log(`[dateToDayNumber] Returning null due to targetYear < 1.`); // <-- Log here
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
        console.log(`[dateToDayNumber] Returning null due to non-finite daysInYearY for year ${y}.`); // <-- Log here
        return null;
    }
    totalDays += daysInYearY;
     // Safety break for extremely large numbers to prevent browser freezing
     if (totalDays > Number.MAX_SAFE_INTEGER / 2) {
        console.warn(`[dateToDayNumber] Clamping totalDays at year ${y}. Current total: ${totalDays}`); // <-- Log clamping
        totalDays = Number.MAX_SAFE_INTEGER / 2; // Clamp to avoid overflow issues later
        break; // Stop calculating further years
     }
  }

  // Add days for full months prior to the target month in the target year
  for (let m = 0; m < targetMonth; m++) {
    const daysInMonthM = getDaysInMonthFunc(m, targetYear);
     if (!Number.isFinite(daysInMonthM)) {
        console.error(`Calculation error: Non-finite days in month ${m}, year ${targetYear}`);
        console.log(`[dateToDayNumber] Returning null due to non-finite daysInMonthM for month ${m}, year ${targetYear}.`); // <-- Log here
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
      console.log(`[dateToDayNumber] Returning null due to final totalDays being non-finite.`); // <-- Log here
      return null;
  }

  // --- LOG OUTPUT ---
  const resultDayNum = totalDays > 0 ? totalDays : 1;
  console.log(`[dateToDayNumber] Output for ${dateObj?.year}: ${resultDayNum}`);
  return resultDayNum;
};

// --- NEW HELPER --- 
// Calculate approximate day number for the start of a given year (Year Y, Month 0, Day 1)
const yearToStartDayNumber = (targetYear, settings, getDaysInMonthFunc) => {
  if (
    targetYear === undefined ||
    !settings ||
    !getDaysInMonthFunc
  ) {
    return null; 
  }

  // Simulate a date object for Jan 1st
  const dateObj = { year: targetYear, month: 0, day: 1 };

  // Reuse the main function, ensuring day 1 is valid for month 0
  const daysInMonth0 = getDaysInMonthFunc(0, targetYear);
  if (daysInMonth0 < 1) {
      console.warn(`Calendar definition issue: Month 0 of year ${targetYear} has ${daysInMonth0} days.`);
      // Cannot reliably calculate start day, return null or approximate?
      // Approximation: try using the previous year's end day + 1?
      // For simplicity, return null for now.
      return null; 
  }

  return dateToDayNumber(dateObj, settings, getDaysInMonthFunc);
};

const HorizontalTimelineView = ({
  events,
  onEventClick,
  formatDate, // Keep for display in TimelineItem
  calendarSettings,
  getDaysInMonth,
}) => {
  // --- Hooks First! ---
  const containerRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStartInfo, setPanStartInfo] = useState({ x: 0, startDay: 0 });

  // Calculate Full Range (Memoized)
  const { absoluteMinDayNumber, absoluteMaxDayNumber } = useMemo(() => {
     // Recalculate even if events is empty initially
     const dayNumbers = (events || []).flatMap(e => [
        dateToDayNumber(e.startDate, calendarSettings, getDaysInMonth),
        dateToDayNumber(e.endDate, calendarSettings, getDaysInMonth)
     ]).filter(num => num !== null && Number.isFinite(num));
     
     if (dayNumbers.length === 0) return { absoluteMinDayNumber: 1, absoluteMaxDayNumber: 2 }; // Default range for empty
     
     const min = Math.min(...dayNumbers);
     const max = Math.max(...dayNumbers);
     return { absoluteMinDayNumber: min, absoluteMaxDayNumber: max > min ? max : min + 1 };
  }, [events, calendarSettings, getDaysInMonth]);

  // Visible Range State - Initialized based on full range
  const [visibleRange, setVisibleRange] = useState({ 
    startDay: absoluteMinDayNumber,
    endDay: absoluteMaxDayNumber 
  });
  // Derived visible span
  const visibleDaySpan = visibleRange.endDay - visibleRange.startDay + 1;

  // Effect to reset visible range when absolute range changes
  useEffect(() => {
      setVisibleRange({ startDay: absoluteMinDayNumber, endDay: absoluteMaxDayNumber });
  }, [absoluteMinDayNumber, absoluteMaxDayNumber]);

  // Event Processing (Memoized)
  const processedEvents = useMemo(() => {
    console.time("Timeline Event Processing");
    if (!events || !calendarSettings || !getDaysInMonth) return []; // Return empty if deps missing
    // ... map/filter logic ... 
    const calculatedEvents = (events || []) // Handle null/undefined events array
      .map((event) => {
        const startDayNum = dateToDayNumber(event.startDate, calendarSettings, getDaysInMonth);
        const endDateObj = event.endDate || event.startDate;
        let endDayNum = dateToDayNumber(endDateObj, calendarSettings, getDaysInMonth);
        if (endDayNum === null || (startDayNum !== null && endDayNum < startDayNum)) {
            endDayNum = startDayNum;
        }
        return {
            ...event,
            startDayNumber: startDayNum,
            endDayNumber: endDayNum,
        };
      })
      .filter((event) => event.startDayNumber !== null);
      
    console.log("Processed Events for Timeline:", calculatedEvents);
    console.timeEnd("Timeline Event Processing");
    return calculatedEvents;
  }, [events, calendarSettings, getDaysInMonth]);

  // Lane Calculation (Memoized)
  const { eventLayouts, totalLanes } = useMemo(() => {
    console.time("Timeline Lane Calculation");
    if (processedEvents.length === 0) { // Handle empty processed events
        console.timeEnd("Timeline Lane Calculation");
        return { eventLayouts: [], totalLanes: 1 }; 
    }
    const lanes = []; 
    const layouts = processedEvents.map((event) => {
        const startDay = event.startDayNumber;
        const endDay = event.endDayNumber;
        const startOffsetDays = startDay - visibleRange.startDay;
        const eventDurationDays = endDay - startDay + 1;
        const minVisualDuration = Math.max(1, visibleDaySpan * 0.001);
        const displayDurationDays = Math.max(eventDurationDays, minVisualDuration);
    let assignedLane = -1;
    for (let i = 0; i < lanes.length; i++) {
           if (startDay > lanes[i]) {
             lanes[i] = endDay;
        assignedLane = i;
        break;
      }
    }
    if (assignedLane === -1) {
          lanes.push(endDay);
      assignedLane = lanes.length - 1;
    }
        const calculatePercentage = (value, total) => (total > 1 ? (value / total) * 100 : 0);
        const leftPercent = calculatePercentage(startOffsetDays, visibleDaySpan);
        const widthPercent = calculatePercentage(displayDurationDays, visibleDaySpan);
    const style = {
          left: `${leftPercent}%`,
          width: `${Math.min(widthPercent, 100 - leftPercent)}%`,
      '--lane-index': assignedLane, 
    };
    return { originalEvent: event, style }; 
  });
    console.timeEnd("Timeline Lane Calculation");
    return { eventLayouts: layouts, totalLanes: lanes.length || 1 }; // Ensure totalLanes is at least 1
  }, [processedEvents, visibleRange.startDay, visibleDaySpan]);

  // Marker Calculation (Memoized)
  const markers = useMemo(() => {
    console.time("Timeline Marker Calculation");
    if (processedEvents.length === 0) { // Handle empty processed events
        console.timeEnd("Timeline Marker Calculation");
        return [];
    }
    const calculatedMarkers = [];
    if (processedEvents.length > 0 && visibleDaySpan >= 1) {
      const firstEventYear = processedEvents[0].startDate.year;
      const lastEventYear = processedEvents[processedEvents.length - 1].startDate.year;
      const yearSpan = lastEventYear - firstEventYear;
      let yearInterval = 1;
      if (yearSpan > 0) {
        const targetMarkers = 15;
        const roughInterval = yearSpan / targetMarkers;
        const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
        if (roughInterval / magnitude >= 5) yearInterval = magnitude * 5;
        else if (roughInterval / magnitude >= 2) yearInterval = magnitude * 2;
        else yearInterval = magnitude;
        yearInterval = Math.max(1, Math.round(yearInterval));
      }
      const startMarkerYear = Math.ceil(firstEventYear / yearInterval) * yearInterval;
      const endMarkerYear = lastEventYear;
      for (let markerYear = startMarkerYear; markerYear <= endMarkerYear; markerYear += yearInterval) {
        const markerDayNum = yearToStartDayNumber(markerYear, calendarSettings, getDaysInMonth);

        if (markerDayNum !== null && markerDayNum >= visibleRange.startDay && markerDayNum <= visibleRange.endDay) {
          const positionOffset = markerDayNum - visibleRange.startDay;
          const positionPercent = visibleDaySpan > 1 ? (positionOffset / visibleDaySpan) * 100 : 0;
          
          // --- DEBUG LOGGING START ---
          console.log(`Marker Year: ${markerYear}, DayNum: ${markerDayNum}, Offset: ${positionOffset}, TotalSpan: ${visibleDaySpan}, Percent: ${positionPercent}`);
          // --- DEBUG LOGGING END ---

          // Prevent markers clustering at the very edges if span is small
          if (positionPercent >= 0 && positionPercent <= 100) {
             calculatedMarkers.push({
                label: markerYear.toLocaleString(), // Format large numbers nicely
                position: positionPercent,
             });
          }
        } else if (markerDayNum !== null) {
            // Log markers calculated but falling outside the min/max day range
            console.log(`Marker Year: ${markerYear}, DayNum: ${markerDayNum} (Outside Range [${visibleRange.startDay} - ${visibleRange.endDay}])`);
        }
      }
      const firstEventDayNum = processedEvents[0].startDayNumber;
      const firstEventPos = visibleDaySpan > 1 ? ((firstEventDayNum - visibleRange.startDay) / visibleDaySpan) * 100 : 0;
      if (!calculatedMarkers.some(m => Math.abs(m.position - firstEventPos) < 0.1)) {
        calculatedMarkers.push({ label: firstEventYear.toLocaleString(), position: firstEventPos });
      }
      const lastEventDayNum = processedEvents[processedEvents.length - 1].startDayNumber;
      const lastEventPos = visibleDaySpan > 1 ? ((lastEventDayNum - visibleRange.startDay) / visibleDaySpan) * 100 : 100;
      if (lastEventPos > firstEventPos + 0.1 && !calculatedMarkers.some(m => Math.abs(m.position - lastEventPos) < 0.1)) {
        calculatedMarkers.push({ label: lastEventYear.toLocaleString(), position: lastEventPos });
      }
      calculatedMarkers.sort((a, b) => a.position - b.position);
    }
    console.timeEnd("Timeline Marker Calculation");
    return calculatedMarkers;
  }, [processedEvents, visibleRange.startDay, visibleDaySpan, calendarSettings, getDaysInMonth, formatDate]); // Include formatDate if used in labels

  // Wheel Event Handler
  const handleWheel = (event) => {
      if (!containerRef.current) return;
      event.preventDefault();

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const mouseX = event.clientX - rect.left; // Mouse position within container
      const containerWidth = rect.width;

      // Calculate the day number under the cursor in the current view
      const proportion = mouseX / containerWidth;
      const dayUnderCursor = visibleRange.startDay + proportion * (visibleDaySpan -1); // -1 because span includes start/end

      // Determine zoom factor
      const zoomFactor = event.deltaY < 0 ? 0.8 : 1.2; 

      // Calculate new span
      let newVisibleSpan = visibleDaySpan * zoomFactor;
      
      // --- Constraints ---
      // Minimum span (e.g., 10 days)
      newVisibleSpan = Math.max(10, newVisibleSpan);
      
      // Maximum span: Prevent zooming out beyond the absolute range of events
      const absoluteDaySpan = absoluteMaxDayNumber - absoluteMinDayNumber + 1;
      newVisibleSpan = Math.min(newVisibleSpan, absoluteDaySpan);
      // --- End Constraints ---

      // Calculate new start/end days, keeping dayUnderCursor at the same proportion
      let newStartDay = dayUnderCursor - proportion * (newVisibleSpan - 1);
      let newEndDay = newStartDay + newVisibleSpan - 1;

      // --- Clamping to Absolute Range ---
      // Prevent panning/zooming beyond the absolute min/max day numbers
      if (newStartDay < absoluteMinDayNumber) {
          newStartDay = absoluteMinDayNumber;
          newEndDay = newStartDay + newVisibleSpan - 1; // Recalculate end based on clamped start
      }
      if (newEndDay > absoluteMaxDayNumber) {
          newEndDay = absoluteMaxDayNumber;
          newStartDay = newEndDay - newVisibleSpan + 1; // Recalculate start based on clamped end
          // Ensure start doesn't go below min again after clamping end
          newStartDay = Math.max(absoluteMinDayNumber, newStartDay);
      }
      // --- End Clamping ---
      
      // Ensure start/end are integers
      newStartDay = Math.round(newStartDay);
      newEndDay = Math.round(newEndDay);
      
      // Prevent invalid range (double check after clamping)
      if (newEndDay <= newStartDay) {
          // If clamping resulted in invalid range, reset to absolute range? Or min span?
          // Resetting to absolute seems safest if clamping failed.
          newStartDay = absoluteMinDayNumber;
          newEndDay = absoluteMaxDayNumber;
          // Or enforce min span: 
          // newEndDay = newStartDay + 10;
      }

      setVisibleRange({ startDay: newStartDay, endDay: newEndDay });
  };

  // Attach wheel listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [handleWheel]); // Re-attach if handleWheel changes (due to dependencies changing)

  // --- Mouse Event Handlers for Panning ---
  const handleMouseDown = (event) => {
    // Only pan with left mouse button
    if (event.button !== 0) return;
    event.preventDefault(); // Prevent text selection during drag
    setIsPanning(true);
    setPanStartInfo({ 
        x: event.clientX, 
        startDay: visibleRange.startDay 
    });
    // Add grabbing cursor style via class or direct style manipulation if needed
    // document.body.style.cursor = 'grabbing'; 
  };

  const handleMouseMove = (event) => {
    if (!isPanning || !containerRef.current) return;
    event.preventDefault();

    const deltaX = event.clientX - panStartInfo.x;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    
    // Calculate how many days the drag corresponds to
    // If visibleDaySpan is 1, avoid division by zero or huge deltaDays
    const deltaDays = (visibleDaySpan > 1 && containerWidth > 0) 
                      ? (deltaX / containerWidth) * (visibleDaySpan - 1) 
                      : 0;

    // Calculate new start day based on where the pan started
    let newStartDay = panStartInfo.startDay - deltaDays;
    
    // Clamp to absolute range
    const absoluteDaySpan = absoluteMaxDayNumber - absoluteMinDayNumber + 1;
    const currentVisibleSpan = visibleDaySpan; // Use span at the time of move start for consistency?
    
    newStartDay = Math.max(absoluteMinDayNumber, newStartDay);
    newStartDay = Math.min(newStartDay, absoluteMaxDayNumber - currentVisibleSpan + 1);
    
    let newEndDay = newStartDay + currentVisibleSpan - 1;

    // Ensure start/end are integers
    newStartDay = Math.round(newStartDay);
    newEndDay = Math.round(newEndDay);

    // Prevent invalid range after clamping/rounding
    if (newEndDay < newStartDay) newEndDay = newStartDay; // Should not happen if span is correct
    if (newEndDay > absoluteMaxDayNumber) newEndDay = absoluteMaxDayNumber;
    if (newStartDay < absoluteMinDayNumber) newStartDay = absoluteMinDayNumber;
    
    setVisibleRange({ startDay: newStartDay, endDay: newEndDay });
  };

  const handleMouseUp = (event) => {
    if (isPanning) {
        setIsPanning(false);
        // Reset cursor style if changed
        // document.body.style.cursor = 'default';
    }
  };

  // Attach/Detach Mouse Move/Up listeners to window
  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, handleMouseMove, handleMouseUp]); // Dependencies include handlers

  // --- Conditional Returns AFTER Hooks ---
  if (!calendarSettings || !getDaysInMonth) {
      // Logged as error because this shouldn't happen if Provider is set up
      console.error("Timeline Error: Calendar settings or getDaysInMonth not available.");
      return <div className="timeline-view-empty">Error: Calendar data unavailable.</div>;
  }
  
  // Display empty state if events array is explicitly empty *after* initial processing attempt
  // (processedEvents might be empty even if initial events array wasn't, due to filtering)
  if (events && events.length > 0 && processedEvents.length === 0) {
     return (
       <div className="timeline-view-empty">
         No events with valid dates found within the supported calendar range.
       </div>
     );
  }
  // Only show "No events yet" if the initial events array was truly empty
  if (!events || events.length === 0) {
    return <div className="timeline-view-empty">No timeline events yet.</div>;
  }

  // --- Render Logic ---
  return (
    <div 
      ref={containerRef} 
      className={`timeline-view-container ${isPanning ? 'is-panning' : ''}`} 
      style={{ '--total-lanes': totalLanes }}
      onMouseDown={handleMouseDown}
    >
      {/* Render Refactored Markers (Labels Only) */} 
      <div className="timeline-markers-area">
        {markers.map((marker, index) => (
          <div
            key={`marker-label-${index}`}
            className="timeline-year-marker"
            style={{ left: `${marker.position}%` }}
          >
            <span className="marker-label" style={{ transform: marker.position > 95 ? 'translateX(-100%)' : (marker.position < 5 ? 'translateX(0)' : 'translateX(-50%)')}}>
                 {marker.label}
             </span>
          </div>
        ))}
      </div>
      
      {/* Render Track Area with Events and Vertical Lines */}
      <div className="timeline-track-area">
        {/* Render Vertical Marker Lines */}
        {markers.map((marker, index) => (
            // Render line only if not exactly at 0% or 100% to avoid edge duplication/thickening
            marker.position > 0.1 && marker.position < 99.9 && (
                <div
                    key={`marker-line-${index}`}
            className="timeline-century-line"
                    style={{ left: `${marker.position}%` }}
          ></div>
            )
        ))}
        
        {/* Render Event Items */}
        {eventLayouts.map(({ originalEvent, style }, index) => (
          <TimelineItem 
            key={originalEvent._id || `event-${index}`}
            event={originalEvent}
            style={style}
            onClick={onEventClick}
            formatDate={formatDate} 
          />
        ))}
      </div>
      
    </div>
  );
};

export default HorizontalTimelineView; 