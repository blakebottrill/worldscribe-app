import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import TimelineItem from './TimelineItem';
import './HorizontalTimelineView.css';
import { dateToDayNumber, yearToStartDayNumber, monthToStartDayNumber, addMonthsToDate, addDaysToDate, dayNumberToDate } from '../../utils/calendarUtils'; // Corrected path again

// Define transition duration (in ms) - sync with CSS
const EXIT_TRANSITION_DURATION = 300; 

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

  // --- NEW STATE for rendered items (including exiting ones) ---
  const [renderedLayouts, setRenderedLayouts] = useState([]);
  const exitingTimeoutsRef = useRef({}); // Store timeouts for cleanup

  // Calculate Full Range (Memoized)
  const { absoluteMinDayNumber, absoluteMaxDayNumber } = useMemo(() => {
     const eventRanges = (events || []).map(e => {
        const startDay = dateToDayNumber(e.startDate, calendarSettings, getDaysInMonth);
        // Use start date if end date is missing/invalid
        const effectiveEndDate = e.endDate || e.startDate; 
        let endDay = dateToDayNumber(effectiveEndDate, calendarSettings, getDaysInMonth);
        
        // Ensure end is not before start if both are valid
        if (startDay !== null && endDay !== null && endDay < startDay) {
            endDay = startDay;
        }
        // If start is invalid, treat the range as invalid for min/max calc
        if (startDay === null) return null; 
        // If end is invalid, use start day for max calculation
        return { start: startDay, end: endDay !== null ? endDay : startDay }; 
     }).filter(range => range !== null && Number.isFinite(range.start) && Number.isFinite(range.end)); // Filter invalid ranges
     
     if (eventRanges.length === 0) return { absoluteMinDayNumber: 1, absoluteMaxDayNumber: 2 }; 
     
     // Find the earliest start and latest end across all valid event ranges
     const minStart = Math.min(...eventRanges.map(r => r.start));
     const maxEnd = Math.max(...eventRanges.map(r => r.end));
     
     return { absoluteMinDayNumber: minStart, absoluteMaxDayNumber: maxEnd > minStart ? maxEnd : minStart + 1 };
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

  // --- Calculate Layouts for Currently Visible Items ---
  // Renamed original 'eventLayouts' to 'visibleEventLayouts'
  const { visibleEventLayouts, totalLanes } = useMemo(() => {
    console.time("Timeline Lane Calculation (Visible)");
    if (processedEvents.length === 0) { 
        console.timeEnd("Timeline Lane Calculation (Visible)");
        return { visibleEventLayouts: [], totalLanes: 1 }; 
    }
    const lanes = []; 
    const paddingPercent = 3; 
    const effectiveWidthPercent = 100 - (2 * paddingPercent);
    const minVisualSeparationPercent = 4;
    const sortedEvents = [...processedEvents].sort((a, b) => a.startDayNumber - b.startDayNumber);
    
    const layouts = sortedEvents.map((event) => {
        const startDay = event.startDayNumber;
        const endDay = event.endDayNumber;
        const overlaps = !(endDay < visibleRange.startDay || startDay > visibleRange.endDay);
        if (!overlaps) {
            return null; 
        }
        
        const startOffsetDays = startDay - visibleRange.startDay;
        const eventDurationDays = endDay - startDay + 1;
        const minVisualDuration = Math.max(1, visibleDaySpan * 0.001);
        const displayDurationDays = Math.max(eventDurationDays, minVisualDuration);
        const extendsLeft = startDay < visibleRange.startDay;
        const extendsRight = endDay > visibleRange.endDay;
        
        const calculateOffsetPercent = (offset, total) => 
            paddingPercent + ((total > 0) ? (offset / total) * effectiveWidthPercent : 0); // Prevent div by zero
        const calculateWidthPercent = (duration, total) => 
            (total > 0) ? (duration / total) * effectiveWidthPercent : (paddingPercent * 0.5); // Prevent div by zero

        let leftPercent, widthPercent;
        
        if (extendsLeft) {
            leftPercent = paddingPercent;
            const visibleDays = endDay - visibleRange.startDay + 1;
            const visibleWidth = calculateWidthPercent(Math.max(0, visibleDays), visibleDaySpan); // Ensure non-negative days
            widthPercent = Math.min(visibleWidth, 100 - (2 * paddingPercent));
        } else {
            leftPercent = calculateOffsetPercent(startOffsetDays, visibleDaySpan);
            if (extendsRight) {
                const visibleDays = visibleRange.endDay - startDay + 1;
                widthPercent = calculateWidthPercent(Math.max(0, visibleDays), visibleDaySpan); // Ensure non-negative days
            } else {
                widthPercent = calculateWidthPercent(displayDurationDays, visibleDaySpan);
            }
        }
        widthPercent = Math.min(widthPercent, 100 - leftPercent - paddingPercent);
        const minWidth = 5; 
        if (widthPercent < minWidth) {
            widthPercent = minWidth;
            if (leftPercent + widthPercent > 100 - paddingPercent) {
                leftPercent = 100 - paddingPercent - widthPercent;
            }
        }
        
        const rightPercent = leftPercent + widthPercent;
        
        let assignedLane = -1;
        for (let i = 0; i < lanes.length; i++) {
            const laneEndPercent = lanes[i];
            if (leftPercent > laneEndPercent + minVisualSeparationPercent) {
                lanes[i] = rightPercent; 
                assignedLane = i;
                break;
            }
        }
        if (assignedLane === -1) {
            lanes.push(rightPercent);
            assignedLane = lanes.length - 1;
        }

        const style = {
            left: `${leftPercent}%`,
            width: `${widthPercent}%`, 
             '--lane-index': assignedLane, 
        };

        return { 
            id: event._id || `event-${event.startDayNumber}-${event.endDayNumber}`, // Ensure unique ID for tracking
            originalEvent: event, 
            style,
            extendsLeft,
            extendsRight
        }; 
    }).filter(layout => layout !== null); 
    
    console.timeEnd("Timeline Lane Calculation (Visible)");
    return { visibleEventLayouts: layouts, totalLanes: lanes.length || 1 }; 
    // Depends on processedEvents and the visible range
  }, [processedEvents, visibleRange.startDay, visibleRange.endDay, visibleDaySpan]); 

  // --- Effect to update renderedLayouts with transitions ---
  useEffect(() => {
      setRenderedLayouts(prevRenderedLayouts => {
          const nextLayoutsMap = new Map(visibleEventLayouts.map(item => [item.id, item]));
          const prevLayoutsMap = new Map(prevRenderedLayouts.map(item => [item.id, item]));
          const nextRenderedLayouts = [];

          // 1. Handle existing items (staying or exiting)
          prevRenderedLayouts.forEach(prevLayout => {
              const nextLayout = nextLayoutsMap.get(prevLayout.id);
              if (nextLayout) {
                  // Item is staying: Update its data, ensure isExiting is false
                  nextRenderedLayouts.push({ ...nextLayout, isExiting: false });
              } else if (!prevLayout.isExiting) {
                   // Item is now exiting: Mark it, determine direction
                   const exitingDirection = prevLayout.originalEvent.startDayNumber >= visibleRange.endDay ? 'right' : 'left';
                   console.log(`Item ${prevLayout.id} exiting ${exitingDirection}`);
                   nextRenderedLayouts.push({ ...prevLayout, isExiting: true, exitingDirection: exitingDirection });
                   
                   // Set timeout to remove after transition
                   if (exitingTimeoutsRef.current[prevLayout.id]) {
                       clearTimeout(exitingTimeoutsRef.current[prevLayout.id]); // Clear existing timeout if any
                   }
                   exitingTimeoutsRef.current[prevLayout.id] = setTimeout(() => {
                       console.log(`Removing ${prevLayout.id} after transition`);
                       setRenderedLayouts(current => current.filter(item => item.id !== prevLayout.id));
                       delete exitingTimeoutsRef.current[prevLayout.id]; // Clean up ref
                   }, EXIT_TRANSITION_DURATION);
              } else {
                   // Item was already exiting, keep it until its timeout finishes
                   nextRenderedLayouts.push(prevLayout);
              }
          });

          // 2. Handle new items (entering)
          visibleEventLayouts.forEach(nextLayout => {
              if (!prevLayoutsMap.has(nextLayout.id)) {
                  // New item entering
                  console.log(`Item ${nextLayout.id} entering`);
                  nextRenderedLayouts.push({ ...nextLayout, isExiting: false }); 
              }
          });

          return nextRenderedLayouts;
      });

      // Cleanup timeouts on unmount or when dependencies change significantly (e.g., events)
      return () => {
          Object.values(exitingTimeoutsRef.current).forEach(clearTimeout);
          exitingTimeoutsRef.current = {};
      };
    // Dependency: visibleEventLayouts determines which items *should* be visible
  }, [visibleEventLayouts, visibleRange.startDay, visibleRange.endDay]); 

  // Marker Calculation (Memoized) - Updated for dynamic intervals
  const markers = useMemo(() => {
    console.time("Timeline Marker Calculation");
    if (processedEvents.length === 0 || !calendarSettings || !getDaysInMonth) {
        console.timeEnd("Timeline Marker Calculation");
        return [];
    }
    
    const calculatedMarkers = [];
    const numMonthsInYear = calendarSettings.monthNames.length;
    const approxDaysPerMonth = 30.5; // Still potentially useful for interval decisions

    // --- Determine Interval Based on visibleDaySpan ---
    let intervalType = 'year'; // 'year', 'month', or 'day'
    let intervalStep = 1;      
    const targetMarkers = 15;  

    // Keep existing logic for year/month intervals
    // Example threshold (adjust as needed): If view is less than ~3 months wide
    const dailyThreshold = targetMarkers * 7; // ~105 days
    const monthlyThreshold = targetMarkers * approxDaysPerMonth * 1.5; // ~686 days
    const multiYearThreshold = monthlyThreshold * 4; // ~2745 days

    if (visibleDaySpan > multiYearThreshold) { // Very wide view: Multi-year interval
        const yearSpan = visibleDaySpan / (numMonthsInYear * approxDaysPerMonth); // Estimate years
        const roughInterval = yearSpan / targetMarkers;
        const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
        if (roughInterval / magnitude >= 5) intervalStep = magnitude * 5;
        else if (roughInterval / magnitude >= 2) intervalStep = magnitude * 2;
        else intervalStep = magnitude;
        intervalStep = Math.max(1, Math.round(intervalStep));
        intervalType = 'year';
    } else if (visibleDaySpan > monthlyThreshold) { // Medium view: Year interval
        intervalStep = 1;
        intervalType = 'year';
    } else if (visibleDaySpan > dailyThreshold) { // Zoomed in: Month interval
        intervalType = 'month';
         if (visibleDaySpan > monthlyThreshold * 0.66) { // ~450 days+ : Every 6 months
             intervalStep = 6; 
         } else if (visibleDaySpan > monthlyThreshold * 0.33) { // ~225 days+ : Every 3 months
            intervalStep = 3; 
         } else { // < ~225 days : Every month
            intervalStep = 1;
         }
    } else { // Very zoomed in: Daily interval
        intervalType = 'day';
        if (visibleDaySpan <= targetMarkers) { // ~15 days or less: Every day
             intervalStep = 1;
        } else if (visibleDaySpan <= targetMarkers * 3) { // ~45 days or less: Every 2 days
             intervalStep = 2;
        } else if (visibleDaySpan <= targetMarkers * 7) { // ~105 days or less: Weekly
             intervalStep = 7; 
        } else { // Should not happen based on threshold logic, but fallback
            intervalStep = 7;
        }
    }
    console.log(`Marker Interval: Type=${intervalType}, Step=${intervalStep}, Span=${visibleDaySpan}`);

    // --- Find the first and last event details --- (Keep as is)
    let earliestStartingEvent = processedEvents[0]; 
    let latestEndingEvent = processedEvents[0];   
     for(let i = 1; i < processedEvents.length; i++) {
        if (processedEvents[i].startDayNumber < earliestStartingEvent.startDayNumber) {
            earliestStartingEvent = processedEvents[i];
        }
        if (processedEvents[i].endDayNumber > latestEndingEvent.endDayNumber) {
            latestEndingEvent = processedEvents[i];
        }
    }
    const firstEventDayNum = earliestStartingEvent.startDayNumber;
    const lastEventEndDayNum = latestEndingEvent.endDayNumber;
    const firstEventDate = earliestStartingEvent.startDate; // Needed if dayNumberToDate fails
    const lastEventDate = latestEndingEvent.endDate || latestEndingEvent.startDate;

    // --- Generate Markers Based on Calculated Interval ---
    const paddingPercent = 3;
    const effectiveWidthPercent = 100 - (2 * paddingPercent);
    let startMarkerAdded = false;
    let endMarkerAdded = false;

    // --- Find Starting Point for Marker Loop ---
    // Use dayNumberToDate for a precise start, fall back to approx if needed
    let currentMarkerDate = dayNumberToDate(visibleRange.startDay, calendarSettings, getDaysInMonth);
    let startLoopDayNum; 

    if (!currentMarkerDate) {
        console.warn("dayNumberToDate failed for visibleRange.startDay, using approximation.");
        // Fallback to old approximation (less accurate)
        currentMarkerDate = { year: firstEventDate.year, month: 0, day: 1 }; 
        if (intervalType === 'month') {
             currentMarkerDate.month = firstEventDate.month; 
        } else if (intervalType === 'day') {
             currentMarkerDate.month = firstEventDate.month;
             currentMarkerDate.day = firstEventDate.day;
        }
        // Note: This fallback loop might still be needed if dayNumberToDate fails, 
        // but ideally dayNumberToDate should work reliably.
        startLoopDayNum = dateToDayNumber(currentMarkerDate, calendarSettings, getDaysInMonth);

    } else {
         // Successfully got date for startDay. Now align it to the *previous* interval start.
         startLoopDayNum = visibleRange.startDay; // The day number we started from
         
         // Adjust date backward to find the *first* marker position <= startLoopDayNum
         // This ensures markers appear consistently regardless of where the view starts
         let tempDate = { ...currentMarkerDate };
         let tempDayNum = startLoopDayNum;
         let prevTempDayNum = tempDayNum;
         let iterations = 0;

         // Try stepping back one interval unit at a time
         while (iterations < 5) { // Safety break
             iterations++;
             let dateBefore;
             if (intervalType === 'year') {
                 dateBefore = addMonthsToDate(tempDate, -intervalStep * numMonthsInYear, calendarSettings);
             } else if (intervalType === 'month') {
                 dateBefore = addMonthsToDate(tempDate, -intervalStep, calendarSettings);
             } else { // 'day'
                 dateBefore = addDaysToDate(tempDate, -intervalStep, calendarSettings, getDaysInMonth);
             }
             
             // Calculate the day number for the date *before* the current one
             let dayNumBefore = dateToDayNumber(dateBefore, calendarSettings, getDaysInMonth);

             if (dayNumBefore === null || dayNumBefore >= tempDayNum) {
                 // Stepping back failed or didn't change day num (e.g., year 0 issues?), stop.
                 break; 
             }
             
             // If the day number *before* is still >= visible start, keep going back
             if (dayNumBefore >= visibleRange.startDay - (visibleDaySpan * 0.1)) { // Add buffer
                 tempDate = dateBefore;
                 tempDayNum = dayNumBefore;
             } else {
                 // We went too far back, the *previous* position (tempDate) is our starting marker date
                 break; 
             }
         }
         currentMarkerDate = tempDate; // This is the first marker date at or before view start
         startLoopDayNum = dateToDayNumber(currentMarkerDate, calendarSettings, getDaysInMonth); // Re-calculate its day number
         if (startLoopDayNum === null) {
             console.error("Failed to get day number for calculated start marker date");
             // Severe fallback: start from first event date?
             currentMarkerDate = firstEventDate; 
             startLoopDayNum = firstEventDayNum;
         }
    }

    // --- Main marker generation loop ---
    let iterations = 0; 
    const maxIterations = 1000; // Increase max iterations for potentially many daily markers
    
    while (currentMarkerDate && iterations < maxIterations) {
        iterations++;

        // Calculate the day number for the current marker date
        const markerDayNum = dateToDayNumber(currentMarkerDate, calendarSettings, getDaysInMonth);

        if (markerDayNum === null) {
            console.warn("Skipping marker - invalid date number:", currentMarkerDate);
            // Try to advance to the next interval anyway
            if (intervalType === 'year') {
                 currentMarkerDate = addMonthsToDate(currentMarkerDate, intervalStep * numMonthsInYear, calendarSettings);
            } else if (intervalType === 'month') {
                currentMarkerDate = addMonthsToDate(currentMarkerDate, intervalStep, calendarSettings);
            } else { // 'day'
                currentMarkerDate = addDaysToDate(currentMarkerDate, intervalStep, calendarSettings, getDaysInMonth);
            }
            continue;
        }

        // Stop if marker is significantly past the visible range end
        if (markerDayNum > visibleRange.endDay + visibleDaySpan * 0.1) { 
            break;
        }

        // Only add marker if it's within the visible range
        if (markerDayNum >= visibleRange.startDay - visibleDaySpan * 0.1) { // Add buffer at start too
            const positionOffset = markerDayNum - visibleRange.startDay;
            const positionPercent = paddingPercent + ((visibleDaySpan > 0) ? (positionOffset / visibleDaySpan) * effectiveWidthPercent : 0);

            // Ensure marker position is visually within the padded area
            if (positionPercent >= paddingPercent && positionPercent <= (100 - paddingPercent)) {
                let markerLabel = '';
                if (intervalType === 'year') {
                    markerLabel = currentMarkerDate.year.toLocaleString();
                } else if (intervalType === 'month') {
                    const monthName = calendarSettings.monthNames[currentMarkerDate.month] || `M${currentMarkerDate.month + 1}`;
                    markerLabel = `${monthName}, ${currentMarkerDate.year.toLocaleString()}`;
                } else { // 'day'
                    // Use formatDate prop if available, otherwise generate a basic label
                    if (formatDate) {
                        // Pass the full date object to formatDate
                        markerLabel = formatDate(currentMarkerDate, 'day'); // Add 'day' context maybe?
                    } else {
                        // Basic fallback format
                         const monthName = calendarSettings.monthNames[currentMarkerDate.month] || `M${currentMarkerDate.month + 1}`;
                         markerLabel = `${monthName} ${currentMarkerDate.day}`; 
                         // Optionally add year if it's ambiguous (e.g., view spans year boundary)
                         // This requires checking previous/next marker or view range. Simpler for now.
                    }
                }

                calculatedMarkers.push({
                    label: markerLabel,
                    position: positionPercent,
                    // Optionally add dayNum for debugging/filtering
                    dayNum: markerDayNum 
                });

                // Check if this interval marker is close to the absolute start/end (keep existing logic)
                const firstEventPosPercent = paddingPercent + ((visibleDaySpan > 0) ? ((firstEventDayNum - visibleRange.startDay) / visibleDaySpan) * effectiveWidthPercent : 0);
                const lastEventPosPercent = paddingPercent + ((visibleDaySpan > 0) ? ((lastEventEndDayNum - visibleRange.startDay) / visibleDaySpan) * effectiveWidthPercent : effectiveWidthPercent);
                const tolerance = 1; // Check if marker is within 1% of the event start/end markers
                if (Math.abs(positionPercent - firstEventPosPercent) < tolerance) startMarkerAdded = true;
                if (Math.abs(positionPercent - lastEventPosPercent) < tolerance) endMarkerAdded = true;
            }
        }
        
        // --- Move to the next marker date ---
        let nextMarkerDate;
         if (intervalType === 'year') {
             nextMarkerDate = addMonthsToDate(currentMarkerDate, intervalStep * numMonthsInYear, calendarSettings);
        } else if (intervalType === 'month') {
            nextMarkerDate = addMonthsToDate(currentMarkerDate, intervalStep, calendarSettings);
        } else { // 'day'
            nextMarkerDate = addDaysToDate(currentMarkerDate, intervalStep, calendarSettings, getDaysInMonth);
        }

        // Safety break: Prevent infinite loop if date doesn't advance
        const nextMarkerDayNum = dateToDayNumber(nextMarkerDate, calendarSettings, getDaysInMonth);
         if (!nextMarkerDate || nextMarkerDayNum === null || nextMarkerDayNum <= markerDayNum) {
             console.warn("Marker date did not advance. Breaking loop.", { current: currentMarkerDate, next: nextMarkerDate, currentNum: markerDayNum, nextNum: nextMarkerDayNum });
             break; 
         }
         currentMarkerDate = nextMarkerDate; // Update for next iteration
         
    } // End while loop

     if (iterations >= maxIterations) {
        console.warn("Marker generation loop hit max iterations.");
    }


    // --- Add Absolute Start/End Markers (if visible and not covered) ---
    // Keep existing logic, maybe refine tolerance or labels if needed
    const firstEventPos = paddingPercent + ((visibleDaySpan > 0) ? ((firstEventDayNum - visibleRange.startDay) / visibleDaySpan) * effectiveWidthPercent : 0);
    const lastEventPos = paddingPercent + ((visibleDaySpan > 0) ? ((lastEventEndDayNum - visibleRange.startDay) / visibleDaySpan) * effectiveWidthPercent : effectiveWidthPercent);
    
    // Use formatDate for consistency if available
    const firstEventLabel = formatDate ? formatDate(firstEventDate, 'event') : firstEventDate.year.toLocaleString();
    const lastEventEndLabel = formatDate ? formatDate(lastEventDate, 'event') : lastEventDate.year.toLocaleString(); 

    // Declare clampedStartPos here so it's accessible in both blocks
    let clampedStartPos = null; 

    // Add start marker if needed
    if (!startMarkerAdded && firstEventDayNum >= visibleRange.startDay && firstEventDayNum <= visibleRange.endDay) {
        // Assign the calculated value here
        clampedStartPos = Math.max(paddingPercent, Math.min(100 - paddingPercent, firstEventPos)); 
        // Avoid adding if too close to an existing marker
        const tooCloseToExisting = calculatedMarkers.some(m => Math.abs(m.position - clampedStartPos) < 0.5);
        if (!tooCloseToExisting) {
             calculatedMarkers.push({ label: firstEventLabel, position: clampedStartPos, isEdge: true });
        }
    }

    // Add end marker if needed
    if (!endMarkerAdded && lastEventEndDayNum >= visibleRange.startDay && lastEventEndDayNum <= visibleRange.endDay) {
        const clampedEndPos = Math.max(paddingPercent, Math.min(100 - paddingPercent, lastEventPos));
        // Ensure distinct from start marker and other markers
        const tooCloseToExisting = calculatedMarkers.some(m => Math.abs(m.position - clampedEndPos) < 0.5);
        // Check safely: Add if no start marker exists OR if there's enough space
        if (!tooCloseToExisting && (clampedStartPos === null || clampedEndPos > clampedStartPos + 1)) { 
            calculatedMarkers.push({ label: lastEventEndLabel, position: clampedEndPos, isEdge: true });
        }
    }

    // Filter out markers too close together? Optional refinement.
    // Sort markers by position
    calculatedMarkers.sort((a, b) => a.position - b.position);

    console.timeEnd("Timeline Marker Calculation");
    return calculatedMarkers;
  }, [processedEvents, visibleRange.startDay, visibleDaySpan, calendarSettings, getDaysInMonth, formatDate]);

  // --- NEW: Calculate Era Layouts (Memoized) ---
  const eraLayouts = useMemo(() => {
      if (!calendarSettings?.eras || calendarSettings.eras.length === 0) {
          return [];
      }
      console.time("Timeline Era Calculation");

      const paddingPercent = 3; // Match marker/event padding
      const effectiveWidthPercent = 100 - (2 * paddingPercent);
      const layouts = [];

      calendarSettings.eras.forEach(era => {
          const startDayNum = dateToDayNumber(era.startDate, calendarSettings, getDaysInMonth);
          const endDayNum = dateToDayNumber(era.endDate, calendarSettings, getDaysInMonth);

          if (startDayNum === null || endDayNum === null || startDayNum > endDayNum) {
              console.warn(`Skipping invalid era: ${era.name}`, era);
              return; // Skip eras with invalid or unordered dates
          }

          // Check if the era overlaps with the visible range at all
          const overlaps = !(endDayNum < visibleRange.startDay || startDayNum > visibleRange.endDay);
          if (!overlaps) {
              return; // Don't include this era if it doesn't overlap
          }

          // Calculate start/end relative to visible range
          const clampedStartDay = Math.max(startDayNum, visibleRange.startDay);
          const clampedEndDay = Math.min(endDayNum, visibleRange.endDay);

          const startOffsetDays = clampedStartDay - visibleRange.startDay;
          const eraVisibleDurationDays = clampedEndDay - clampedStartDay + 1;

          // Calculate position and width as percentages (similar to events)
          const leftPercent = paddingPercent + ((visibleDaySpan > 0) ? (startOffsetDays / visibleDaySpan) * effectiveWidthPercent : 0);
          let widthPercent = (visibleDaySpan > 0) ? (eraVisibleDurationDays / visibleDaySpan) * effectiveWidthPercent : 0;
          
          // Ensure minimum visual width for very short visible durations?
          widthPercent = Math.max(widthPercent, 0.1); // Minimum 0.1% width? Adjust as needed
          widthPercent = Math.min(widthPercent, 100 - leftPercent - paddingPercent); // Clamp to boundaries

          // Determine if the era extends beyond the visible edges
          const extendsLeft = startDayNum < visibleRange.startDay;
          const extendsRight = endDayNum > visibleRange.endDay;

          layouts.push({ 
              id: era.id,
              name: era.name,
              style: {
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
              },
              extendsLeft,
              extendsRight,
          });
      });
      
      // Optional: Sort eras? By start date?
      // layouts.sort((a, b) => /* ... */ ); 

      console.timeEnd("Timeline Era Calculation");
      return layouts;
  }, [calendarSettings?.eras, visibleRange.startDay, visibleRange.endDay, visibleDaySpan, calendarSettings, getDaysInMonth]);

  // Wheel Event Handler
  const handleWheel = (event) => {
      if (!containerRef.current) return;
      event.preventDefault();

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width;
      const { deltaX, deltaY } = event;
      const mouseX = event.clientX - rect.left; // Mouse position within container
      
      // Determine horizontal position as a percentage of container width
      const mousePositionPercent = (mouseX / containerWidth) * 100;
      
      // Find events in the current vertical column (section)
      // Define a column width - how wide to consider for grouping events
      const columnWidthPercent = 5; // 5% of timeline width for column detection
      const columnLayouts = renderedLayouts.filter(layout => {
          if (layout.isExiting) return false; 
          // Parse position values
          const eventLeft = parseFloat(layout.style.left);
          const eventWidth = parseFloat(layout.style.width);
          const eventRight = eventLeft + eventWidth;
          
          // Check if event overlaps with the mouse's vertical column
          return (
              // Either the event starts in this column
              (mousePositionPercent - columnWidthPercent <= eventLeft && 
               eventLeft <= mousePositionPercent + columnWidthPercent) ||
              // Or the event ends in this column
              (mousePositionPercent - columnWidthPercent <= eventRight && 
               eventRight <= mousePositionPercent + columnWidthPercent) ||
              // Or the event spans across this column
              (eventLeft <= mousePositionPercent - columnWidthPercent &&
               eventRight >= mousePositionPercent + columnWidthPercent)
          );
      });
      
      // Find the specific event under the mouse cursor
      const mouseClientY = event.clientY;
      const mouseOverLayout = columnLayouts.find(layout => {
          // Check if mouse is within the rendered event's bounds
          const eventElem = document.querySelector(`.timeline-item[data-event-id="${layout.originalEvent._id || ''}"]`);
          if (!eventElem || layout.isExiting) return false; // Don't interact with exiting items
          
          const eventRect = eventElem.getBoundingClientRect();
          return mouseClientY >= eventRect.top && 
                 mouseClientY <= eventRect.bottom && 
                 event.clientX >= eventRect.left && 
                 event.clientX <= eventRect.right;
      });
      const mouseOverEvent = mouseOverLayout; // Keep variable name consistency if needed elsewhere

      // Determine if horizontal scroll (panning) or vertical scroll (zooming)
      const isHorizontalScroll = Math.abs(deltaX) > Math.abs(deltaY);

      if (isHorizontalScroll) {
          // --- Panning Logic (remain unchanged) --- 
          const panSpeedFactor = 0.5;
          const deltaDays = (deltaX / containerWidth) * visibleDaySpan * panSpeedFactor;
          
          let newStartDay = visibleRange.startDay + deltaDays;
          let newEndDay = visibleRange.endDay + deltaDays;

          // Clamp to absolute range
          const absoluteDaySpan = absoluteMaxDayNumber - absoluteMinDayNumber + 1;
          const currentVisibleSpan = visibleDaySpan;
          
          if (newEndDay > absoluteMaxDayNumber) {
              newEndDay = absoluteMaxDayNumber;
              newStartDay = newEndDay - currentVisibleSpan + 1;
          }
          if (newStartDay < absoluteMinDayNumber) {
              newStartDay = absoluteMinDayNumber;
              newEndDay = newStartDay + currentVisibleSpan - 1;
          }
          
          newEndDay = Math.min(newEndDay, absoluteMaxDayNumber);
          
          newStartDay = Math.round(newStartDay);
          newEndDay = Math.round(newEndDay);

          if (newEndDay < newStartDay) newEndDay = newStartDay + currentVisibleSpan -1;
          
          setVisibleRange({ startDay: newStartDay, endDay: newEndDay });

      } else {
          // --- Zooming Logic --- 
          const proportion = containerWidth > 0 ? mouseX / containerWidth : 0.5;
          
          // Track event under cursor for anchoring
          let anchorEvent = null;
          let anchorDay = null;
          let visualProportionInEvent = 0;
          
          // Check if mouse is directly over an event
          if (mouseOverEvent) {
              anchorEvent = mouseOverEvent;
              const event = mouseOverEvent.originalEvent;
              const eventLeft = parseFloat(mouseOverEvent.style.left);
              const eventWidth = parseFloat(mouseOverEvent.style.width);
              
              // Calculate mouse position as proportion within the event's visual representation
              visualProportionInEvent = (mousePositionPercent - eventLeft) / eventWidth;
              visualProportionInEvent = Math.max(0, Math.min(1, visualProportionInEvent)); // Clamp between 0-1
              
              // Calculate the actual day that corresponds to the cursor position within the event
              if (mouseOverEvent.extendsLeft && mouseOverEvent.extendsRight) {
                  // Event extends beyond both sides - use proportion within visible area
                  const visibleStartDay = Math.max(event.startDayNumber, visibleRange.startDay);
                  const visibleEndDay = Math.min(event.endDayNumber, visibleRange.endDay);
                  anchorDay = visibleStartDay + (visualProportionInEvent * (visibleEndDay - visibleStartDay));
              } else if (mouseOverEvent.extendsLeft) {
                  // Event extends beyond left - map proportion to the visible portion
                  const visibleStartDay = visibleRange.startDay;
                  const visibleEndDay = Math.min(event.endDayNumber, visibleRange.endDay);
                  anchorDay = visibleStartDay + (visualProportionInEvent * (visibleEndDay - visibleStartDay));
              } else if (mouseOverEvent.extendsRight) {
                  // Event extends beyond right - map proportion to the visible portion
                  const visibleStartDay = Math.max(event.startDayNumber, visibleRange.startDay);
                  const visibleEndDay = visibleRange.endDay;
                  anchorDay = visibleStartDay + (visualProportionInEvent * (visibleEndDay - visibleStartDay));
              } else {
                  // Event fully visible - directly map proportion to the actual event days
                  anchorDay = event.startDayNumber + (visualProportionInEvent * (event.endDayNumber - event.startDayNumber));
              }
          }
          
          // Get a weighted importance for events consideration
          const targetEvents = [];
          
          // First priority: direct hover over event
          if (mouseOverEvent) {
              targetEvents.push({
                  event: mouseOverEvent.originalEvent,
                  weight: 1.0, // Highest weight
                  extendsLeft: mouseOverEvent.extendsLeft,
                  extendsRight: mouseOverEvent.extendsRight
              });
          }
          
          // Second priority: events in the same column
          columnLayouts.forEach(layout => {
              // Skip if it's the event directly under mouse (already added)
              if (mouseOverEvent && layout.originalEvent._id === mouseOverEvent.originalEvent._id) {
                  return;
              }
              
              targetEvents.push({
                  event: layout.originalEvent,
                  weight: 0.5, // Medium weight
                  extendsLeft: layout.extendsLeft,
                  extendsRight: layout.extendsRight
              });
          });
          
          // Determine zoom factor based on deltaY
          // Decrease sensitivity by additional 10% (now ~35% less sensitive than original)
          const zoomFactor = deltaY < 0 ? 0.865 : 1.135; // Changed from 0.85/1.15 to further reduce sensitivity
          const isZoomingIn = deltaY < 0;

          // Calculate new span
          let newVisibleSpan = visibleDaySpan * zoomFactor;
          
          // --- Constraints ---
          newVisibleSpan = Math.max(10, newVisibleSpan); // Minimum span
          const absoluteDaySpan = absoluteMaxDayNumber - absoluteMinDayNumber + 1;
          newVisibleSpan = Math.min(newVisibleSpan, absoluteDaySpan); // Maximum span
          
          // Determine anchor day for zooming
          let dayUnderCursor;
          let adjustedProportion = proportion;
          
          if (anchorEvent && anchorDay !== null) {
              // Use the precise day within the event as our anchor point
              dayUnderCursor = anchorDay;
              
              // Keep this exact proportion for our calculations to maintain anchor position
              adjustedProportion = proportion;
          } else {
              // Standard calculation - start with this as our base
              dayUnderCursor = visibleRange.startDay + proportion * (visibleDaySpan - 1);
              
              // Adjust for event awareness if zooming in
              if (isZoomingIn && targetEvents.length > 0) {
                  // The starting point will be influenced by events we need to keep visible
                  const highestWeightEvent = targetEvents.reduce((prev, current) => 
                      (prev.weight > current.weight) ? prev : current);
                  
                  // Apply weighted averaging between cursor and event position
                  if (highestWeightEvent.extendsLeft) {
                      const eventEnd = highestWeightEvent.event.endDayNumber;
                      const eventStart = highestWeightEvent.event.startDayNumber;
                      
                      const middleOfVisiblePart = Math.max(
                          eventStart, 
                          visibleRange.startDay + ((eventEnd - visibleRange.startDay) / 2)
                      );
                      
                      dayUnderCursor = (dayUnderCursor * 0.4) + (middleOfVisiblePart * 0.6);
                  } else if (highestWeightEvent.extendsRight) {
                      const eventStart = highestWeightEvent.event.startDayNumber;
                      const eventEnd = highestWeightEvent.event.endDayNumber;
                      
                      const middleOfVisiblePart = Math.min(
                          eventEnd, 
                          visibleRange.endDay - ((visibleRange.endDay - eventStart) / 2)
                      );
                      
                      dayUnderCursor = (dayUnderCursor * 0.4) + (middleOfVisiblePart * 0.6);
                  }
              }
              
              // When zooming in with events in the column/under cursor, adjust proportion
              if (isZoomingIn && targetEvents.length > 0) {
                  // Move proportion more toward center for better event preservation
                  if (proportion < 0.3) {
                      // If near left edge, move a bit right to keep events in view
                      adjustedProportion = Math.min(0.3, proportion + 0.1);
                  } else if (proportion > 0.7) {
                      // If near right edge, move a bit left to keep events in view
                      adjustedProportion = Math.max(0.7, proportion - 0.1);
                  }
              }
          }
          
          // Calculate new range based on all our adjustments
          let newStartDay = dayUnderCursor - adjustedProportion * (newVisibleSpan - 1);
          let newEndDay = newStartDay + newVisibleSpan - 1;

          // --- Clamping to Absolute Range --- 
          if (newStartDay < absoluteMinDayNumber) {
              newStartDay = absoluteMinDayNumber;
              newEndDay = newStartDay + newVisibleSpan - 1; 
          }
          if (newEndDay > absoluteMaxDayNumber) {
              newEndDay = absoluteMaxDayNumber;
              newStartDay = newEndDay - newVisibleSpan + 1; 
              newStartDay = Math.max(absoluteMinDayNumber, newStartDay);
          }
          newEndDay = Math.min(newEndDay, absoluteMaxDayNumber); 
          
          // Ensure start/end are integers
          newStartDay = Math.round(newStartDay);
          newEndDay = Math.round(newEndDay);
          
          // Prevent invalid range (final check)
          if (newEndDay <= newStartDay) {
              newStartDay = absoluteMinDayNumber;
              newEndDay = absoluteMaxDayNumber;
          }
          
          // Final event preservation check when zooming in
          if (isZoomingIn && targetEvents.length > 0) {
              let needsAdjustment = false;
              let idealStartDay = newStartDay;
              let idealEndDay = newEndDay;
              
              // Examine each target event to ensure important ones remain visible
              targetEvents.forEach(({ event, weight, extendsLeft, extendsRight }) => {
                  const eventStart = event.startDayNumber;
                  const eventEnd = event.endDayNumber;
                  
                  // Calculate how much of the event should be visible based on weight
                  // Higher weight = more of the event should remain visible
                  const visibilityFactor = weight * 0.5; // 0.5 for column events, 1.0 for direct hover
                  const eventDuration = eventEnd - eventStart + 1;
                  const minVisibleDays = Math.min(30, Math.ceil(eventDuration * visibilityFactor));
                  
                  if (extendsLeft && eventEnd >= newStartDay) {
                      // Event extends left beyond view but ends in view
                      // Ensure at least minVisibleDays are visible
                      const currentVisibleDays = Math.min(eventEnd, newEndDay) - newStartDay + 1;
                      
                      if (currentVisibleDays < minVisibleDays) {
                          // Need to shift view left to show more of this event
                          const requiredStartDay = Math.max(absoluteMinDayNumber, eventEnd - minVisibleDays + 1);
                          if (requiredStartDay < idealStartDay) {
                              idealStartDay = requiredStartDay;
                              needsAdjustment = true;
                          }
                      }
                  } else if (extendsRight && eventStart <= newEndDay) {
                      // Event extends right beyond view but starts in view
                      // Ensure at least minVisibleDays are visible
                      const currentVisibleDays = newEndDay - Math.max(eventStart, newStartDay) + 1;
                      
                      if (currentVisibleDays < minVisibleDays) {
                          // Need to shift view right to show more of this event
                          const requiredEndDay = Math.min(absoluteMaxDayNumber, eventStart + minVisibleDays - 1);
                          if (requiredEndDay > idealEndDay) {
                              idealEndDay = requiredEndDay;
                              needsAdjustment = true;
                          }
                      }
                  } else if (eventStart < newStartDay && eventEnd > newEndDay) {
                      // Event completely spans the view - center on important part of event
                      const eventCenter = eventStart + (eventDuration / 2);
                      const viewCenter = newStartDay + (newVisibleSpan / 2);
                      
                      // If centers are significantly different, recenter the view
                      if (Math.abs(eventCenter - viewCenter) > newVisibleSpan * 0.2) {
                          const adjustedCenter = (eventCenter * weight) + (viewCenter * (1 - weight));
                          idealStartDay = Math.max(absoluteMinDayNumber, adjustedCenter - (newVisibleSpan / 2));
                          idealEndDay = Math.min(absoluteMaxDayNumber, idealStartDay + newVisibleSpan - 1);
                          needsAdjustment = true;
                      }
                  }
              });
              
              // Apply adjustments if needed
              if (needsAdjustment) {
                  // Recalculate view range while maintaining the span
                  const adjustedSpan = idealEndDay - idealStartDay + 1;
                  
                  if (adjustedSpan <= newVisibleSpan * 1.1) { // Allow slight increase for better visibility
                      newStartDay = idealStartDay;
                      newEndDay = idealEndDay;
                  } else {
                      // If adjustment causes too much span increase, try to maintain original span
                      // but shift the view to include as much important content as possible
                      const midPoint = (idealStartDay + idealEndDay) / 2;
                      newStartDay = Math.round(midPoint - (newVisibleSpan / 2));
                      newEndDay = newStartDay + newVisibleSpan - 1;
                      
                      // Final bounds check
                      if (newStartDay < absoluteMinDayNumber) {
                          newStartDay = absoluteMinDayNumber;
                          newEndDay = newStartDay + newVisibleSpan - 1;
                      }
                      if (newEndDay > absoluteMaxDayNumber) {
                          newEndDay = absoluteMaxDayNumber;
                          newStartDay = Math.max(absoluteMinDayNumber, newEndDay - newVisibleSpan + 1);
                      }
                  }
              }
          }

          setVisibleRange({ startDay: newStartDay, endDay: newEndDay });
      }
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
    // Update dependencies to include absoluteMin/MaxDayNumber and visibleRange used inside handleWheel
  }, [handleWheel, absoluteMinDayNumber, absoluteMaxDayNumber, visibleRange.startDay, visibleRange.endDay]); 

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

  // --- Keyboard Panning Handler ---
  const handleKeyDown = useCallback((event) => {
    // Check if the timeline container or a child has focus?
    // For simplicity, let's make it always active for now, but consider focus management later.
    let panAmountDays = 0;
    const panPercent = 0.05; // Pan 5% of the visible span per key press

    if (event.key === 'ArrowLeft') {
        panAmountDays = -(visibleDaySpan * panPercent);
    } else if (event.key === 'ArrowRight') {
        panAmountDays = visibleDaySpan * panPercent;
    } else {
        return; // Ignore other keys
    }
    
    event.preventDefault(); // Prevent default browser scroll behavior for arrow keys

    // Calculate new range
    let newStartDay = visibleRange.startDay + panAmountDays;
    let newEndDay = visibleRange.endDay + panAmountDays;
    const currentVisibleSpan = visibleDaySpan; // Keep span constant

    // Clamp to absolute range
    if (newEndDay > absoluteMaxDayNumber) {
        newEndDay = absoluteMaxDayNumber;
        newStartDay = newEndDay - currentVisibleSpan + 1;
    }
    if (newStartDay < absoluteMinDayNumber) {
        newStartDay = absoluteMinDayNumber;
        newEndDay = newStartDay + currentVisibleSpan - 1;
    }
    newEndDay = Math.min(newEndDay, absoluteMaxDayNumber);

    // Ensure integers and valid range
    newStartDay = Math.round(newStartDay);
    newEndDay = Math.round(newEndDay);
     if (newEndDay < newStartDay) newEndDay = newStartDay + currentVisibleSpan -1;

    setVisibleRange({ startDay: newStartDay, endDay: newEndDay });

  }, [visibleRange, visibleDaySpan, absoluteMinDayNumber, absoluteMaxDayNumber, setVisibleRange]); // Dependencies for the handler

  // Attach/Detach Keyboard Listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]); // Dependency is the memoized handler itself

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
      {/* --- NEW: Render Eras Area --- */}
      <div className="timeline-eras-area">
          {eraLayouts.map(era => (
              <div 
                  key={era.id} 
                  className={`timeline-era 
                      ${era.extendsLeft ? 'era-extends-left' : ''}
                      ${era.extendsRight ? 'era-extends-right' : ''}
                  `}
                  style={era.style}
                  title={`${era.name} (Era)`} // Simple title
              >
                  <span className="timeline-era-label">{era.name}</span>
              </div>
          ))}
      </div>

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
        
        {/* Render Event Items from renderedLayouts state */}
        {renderedLayouts.map(({ id, originalEvent, style, extendsLeft, extendsRight, isExiting, exitingDirection }, index) => (
          <TimelineItem 
            key={id} // Use the stable ID generated earlier
            event={originalEvent}
            style={style}
            onClick={!isExiting ? onEventClick : undefined} // Disable click on exiting items
            formatDate={formatDate}
            extendsLeft={extendsLeft}
            extendsRight={extendsRight}
            // --- Pass transition props ---
            isExiting={isExiting} 
            exitingDirection={exitingDirection}
          />
        ))}
      </div>
      
    </div>
  );
};

export default HorizontalTimelineView; 