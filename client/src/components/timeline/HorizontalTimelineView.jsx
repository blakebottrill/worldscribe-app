import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import TimelineItem from './TimelineItem';
import './HorizontalTimelineView.css';
import { dateToDayNumber, yearToStartDayNumber, monthToStartDayNumber, addMonthsToDate } from '../../utils/calendarUtils'; // Corrected path again

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

  // Lane Calculation (Memoized)
  const { eventLayouts, totalLanes } = useMemo(() => {
    console.time("Timeline Lane Calculation");
    if (processedEvents.length === 0) { // Handle empty processed events
        console.timeEnd("Timeline Lane Calculation");
        return { eventLayouts: [], totalLanes: 1 }; 
    }
    const lanes = []; 
    const paddingPercent = 3; // Use 3% padding on each side
    const effectiveWidthPercent = 100 - (2 * paddingPercent);

    const layouts = processedEvents.map((event) => {
        const startDay = event.startDayNumber;
        const endDay = event.endDayNumber;
        const startOffsetDays = startDay - visibleRange.startDay;
        const eventDurationDays = endDay - startDay + 1;
        const minVisualDuration = Math.max(1, visibleDaySpan * 0.001);
        const displayDurationDays = Math.max(eventDurationDays, minVisualDuration);
        
        // Calculate if event extends beyond visible range
        const extendsLeft = startDay < visibleRange.startDay;
        const extendsRight = endDay > visibleRange.endDay;
        
        // Lane assignment logic
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
        
        // Position calculation
        const calculateOffsetPercent = (offset, total) => 
            paddingPercent + ((total > 1) ? (offset / total) * effectiveWidthPercent : 0);
        const calculateWidthPercent = (duration, total) => 
            (total > 1) ? (duration / total) * effectiveWidthPercent : (paddingPercent * 0.5);

        // Adjust position and width based on visibility
        let leftPercent, widthPercent;
        
        if (extendsLeft) {
            // If extends left, clamp to left edge plus padding
            leftPercent = paddingPercent;
            
            // Calculate visible portion width
            const visibleDays = endDay - visibleRange.startDay + 1;
            const visibleWidth = calculateWidthPercent(
                Math.min(visibleDays, visibleDaySpan), 
                visibleDaySpan
            );
            widthPercent = Math.min(visibleWidth, 100 - (2 * paddingPercent));
        } else {
            // Normal left position calculation
            leftPercent = calculateOffsetPercent(startOffsetDays, visibleDaySpan);
            
            // Determine width based on whether it extends right
            if (extendsRight) {
                // If extends right, calculate width to right edge minus padding
                const visibleDays = visibleRange.endDay - startDay + 1;
                widthPercent = calculateWidthPercent(visibleDays, visibleDaySpan);
            } else {
                // Normal width calculation
                widthPercent = calculateWidthPercent(displayDurationDays, visibleDaySpan);
            }
        }
        
        // Ensure width is clamped to container bounds
        widthPercent = Math.min(widthPercent, 100 - leftPercent - paddingPercent);
        
        // Ensure minimum width for very short/point events
        const minWidth = 5; // Minimum width as percentage
        if (widthPercent < minWidth) {
            widthPercent = minWidth;
            // Re-adjust left position if needed to keep within padding bounds
            if (leftPercent + widthPercent > 100 - paddingPercent) {
                leftPercent = 100 - paddingPercent - widthPercent;
            }
        }

    const style = {
            left: `${leftPercent}%`,
            width: `${widthPercent}%`, 
      '--lane-index': assignedLane, 
    };

        return { 
            originalEvent: event, 
            style,
            extendsLeft,
            extendsRight
        }; 
    });
    
    console.timeEnd("Timeline Lane Calculation");
    return { eventLayouts: layouts, totalLanes: lanes.length || 1 }; 
  }, [processedEvents, visibleRange.startDay, visibleRange.endDay, visibleDaySpan]);

  // Marker Calculation (Memoized) - Updated for dynamic intervals
  const markers = useMemo(() => {
    console.time("Timeline Marker Calculation");
    if (processedEvents.length === 0 || !calendarSettings || !getDaysInMonth) {
        console.timeEnd("Timeline Marker Calculation");
        return [];
    }
    
    const calculatedMarkers = [];
    const numMonthsInYear = calendarSettings.monthNames.length;
    const approxDaysPerYear = numMonthsInYear * 30.5; // Rough estimate
    const approxDaysPerMonth = 30.5; // Rough estimate

    // --- Determine Interval Based on visibleDaySpan ---
    let intervalType = 'year'; // 'year' or 'month'
    let intervalStep = 1;      // e.g., 1, 2, 5 for years; 1, 3, 6 for months
    const targetMarkers = 15;  // Desired number of markers on screen

    if (visibleDaySpan > targetMarkers * 2 * approxDaysPerYear) { // Very wide view: Multi-year interval
        const yearSpan = visibleDaySpan / approxDaysPerYear;
        const roughInterval = yearSpan / targetMarkers;
        const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
        if (roughInterval / magnitude >= 5) intervalStep = magnitude * 5;
        else if (roughInterval / magnitude >= 2) intervalStep = magnitude * 2;
        else intervalStep = magnitude;
        intervalStep = Math.max(1, Math.round(intervalStep));
        intervalType = 'year';
    } else if (visibleDaySpan > targetMarkers * approxDaysPerMonth * 1.5) { // Medium view: Year interval
        intervalStep = 1;
        intervalType = 'year';
    } else if (visibleDaySpan > targetMarkers * 10) { // Zoomed in: Month interval
        intervalStep = 1; // Every month
         if (visibleDaySpan > targetMarkers * approxDaysPerMonth * 0.5) {
            intervalStep = 3; // Every 3 months (Quarterly)
         }
         if (visibleDaySpan > targetMarkers * approxDaysPerMonth) {
             intervalStep = 6; // Every 6 months
         }
        intervalType = 'month';
    } else { // Very zoomed in: Maybe still monthly? Or potentially disable interval markers?
        intervalStep = 1;
        intervalType = 'month';
        // Could add logic for daily/weekly if needed, but might get cluttered
    }

    // --- Find the first and last event details (needed for absolute markers) ---
    let earliestStartingEvent = processedEvents[0]; // Assumes sorted or find min start
    let latestEndingEvent = processedEvents[0];   // Find max end
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
    const firstEventDate = earliestStartingEvent.startDate;
    const lastEventDate = latestEndingEvent.endDate || latestEndingEvent.startDate;

    // --- Generate Markers Based on Calculated Interval ---
    const paddingPercent = 3;
    const effectiveWidthPercent = 100 - (2 * paddingPercent);
    let startMarkerAdded = false;
    let endMarkerAdded = false;

    // Find a starting point for the loop just before or at the visible range start
    // TODO: Need a robust way to convert visibleRange.startDay back to a {year, month}
    // For now, approximate using the earliest event date and loop from there.
    // This is inefficient and needs improvement. A dayNumberToDate function would be ideal.
    let currentMarkerDate = { year: firstEventDate.year, month: 0, day: 1 }; // Start loop from year 1
    if (intervalType === 'month') {
        currentMarkerDate.month = firstEventDate.month; // Start nearer for months
    }

    // Find the *first* marker date that is >= visibleRange.startDay
    // This loop finds a starting point. It's inefficient.
    let startLoopDayNum = intervalType === 'year' 
        ? yearToStartDayNumber(currentMarkerDate.year, calendarSettings, getDaysInMonth)
        : monthToStartDayNumber(currentMarkerDate.year, currentMarkerDate.month, calendarSettings, getDaysInMonth);
        
    while (startLoopDayNum !== null && startLoopDayNum < visibleRange.startDay) {
        const monthsToAdd = intervalType === 'year' ? intervalStep * numMonthsInYear : intervalStep;
        currentMarkerDate = addMonthsToDate(currentMarkerDate, monthsToAdd, calendarSettings);
        startLoopDayNum = intervalType === 'year' 
            ? yearToStartDayNumber(currentMarkerDate.year, calendarSettings, getDaysInMonth)
            : monthToStartDayNumber(currentMarkerDate.year, currentMarkerDate.month, calendarSettings, getDaysInMonth);
            // Add safety break for potential infinite loop
            if (currentMarkerDate.year > lastEventDate.year + intervalStep * 5) break; 
    }
    // Potentially step back one interval if we overshot significantly
     const monthsToSubtract = intervalType === 'year' ? intervalStep * numMonthsInYear : intervalStep;
     currentMarkerDate = addMonthsToDate(currentMarkerDate, -monthsToSubtract, calendarSettings);


    // Main marker generation loop
    let iterations = 0; // Safety break
    const maxIterations = 500; 
    while (iterations < maxIterations) {
        iterations++;
        const markerDayNum = intervalType === 'year'
            ? yearToStartDayNumber(currentMarkerDate.year, calendarSettings, getDaysInMonth)
            : monthToStartDayNumber(currentMarkerDate.year, currentMarkerDate.month, calendarSettings, getDaysInMonth);

        if (markerDayNum === null) {
            // Move to the next interval if current is invalid
             const monthsToAdd = intervalType === 'year' ? intervalStep * numMonthsInYear : intervalStep;
            currentMarkerDate = addMonthsToDate(currentMarkerDate, monthsToAdd, calendarSettings);
            continue; 
        }

        // Stop if marker is significantly past the visible range end
        if (markerDayNum > visibleRange.endDay + visibleDaySpan * 0.1) { // Add some buffer
            break;
        }

        if (markerDayNum >= visibleRange.startDay && markerDayNum <= visibleRange.endDay) {
            const positionOffset = markerDayNum - visibleRange.startDay;
            const positionPercent = paddingPercent + ((visibleDaySpan > 1) ? (positionOffset / visibleDaySpan) * effectiveWidthPercent : 0);

            if (positionPercent >= paddingPercent && positionPercent <= (100 - paddingPercent)) {
                let markerLabel = '';
                if (intervalType === 'year') {
                    markerLabel = currentMarkerDate.year.toLocaleString();
                } else { // Month interval
                    const monthName = calendarSettings.monthNames[currentMarkerDate.month] || `M${currentMarkerDate.month + 1}`;
                    // Show year only if it changes or for first/last markers for context? Simpler: always show year.
                    markerLabel = `${monthName}, ${currentMarkerDate.year.toLocaleString()}`;
                }

                calculatedMarkers.push({
                    label: markerLabel,
                    position: positionPercent,
                });

                // Check if this interval marker is close to the absolute start/end
                const firstEventPos = paddingPercent + ((visibleDaySpan > 1) ? ((firstEventDayNum - visibleRange.startDay) / visibleDaySpan) * effectiveWidthPercent : 0);
                const lastEventPos = paddingPercent + ((visibleDaySpan > 1) ? ((lastEventEndDayNum - visibleRange.startDay) / visibleDaySpan) * effectiveWidthPercent : effectiveWidthPercent);
                if (Math.abs(positionPercent - firstEventPos) < 0.1) startMarkerAdded = true;
                if (Math.abs(positionPercent - lastEventPos) < 0.1) endMarkerAdded = true;
            }
        }
        
        // Move to the next marker date
        const monthsToAdd = intervalType === 'year' ? intervalStep * numMonthsInYear : intervalStep;
        currentMarkerDate = addMonthsToDate(currentMarkerDate, monthsToAdd, calendarSettings);
        
        // Safety break: Prevent infinite loop if date doesn't advance
         if (intervalType === 'year' && yearToStartDayNumber(currentMarkerDate.year, calendarSettings, getDaysInMonth) <= markerDayNum) break;
         if (intervalType === 'month' && monthToStartDayNumber(currentMarkerDate.year, currentMarkerDate.month, calendarSettings, getDaysInMonth) <= markerDayNum) break;
    }
     if (iterations >= maxIterations) {
        console.warn("Marker generation loop hit max iterations.");
    }


    // --- Add Absolute Start/End Markers (if visible and not covered) ---
    const firstEventPos = paddingPercent + ((visibleDaySpan > 1) ? ((firstEventDayNum - visibleRange.startDay) / visibleDaySpan) * effectiveWidthPercent : 0);
    const lastEventPos = paddingPercent + ((visibleDaySpan > 1) ? ((lastEventEndDayNum - visibleRange.startDay) / visibleDaySpan) * effectiveWidthPercent : effectiveWidthPercent);
    const firstEventYearLabel = firstEventDate.year.toLocaleString();
    const lastEventEndYearLabel = lastEventDate.year.toLocaleString(); // Use latest ending event's year

    if (!startMarkerAdded && firstEventDayNum >= visibleRange.startDay && firstEventDayNum <= visibleRange.endDay) {
        const clampedStartPos = Math.max(paddingPercent, firstEventPos);
        if (clampedStartPos <= (100 - paddingPercent)) {
            calculatedMarkers.push({ label: firstEventYearLabel, position: clampedStartPos });
        }
    }

    if (!endMarkerAdded && lastEventEndDayNum >= visibleRange.startDay && lastEventEndDayNum <= visibleRange.endDay) {
        const clampedEndPos = Math.min(100 - paddingPercent, lastEventPos);
         // Ensure distinct from start marker if both are added
         const isDistinct = !calculatedMarkers.some(m => m.position === clampedEndPos && m.label === firstEventYearLabel);
        if (isDistinct && clampedEndPos >= paddingPercent && clampedEndPos > firstEventPos + 0.1) { 
            calculatedMarkers.push({ label: lastEventEndYearLabel, position: clampedEndPos });
        }
    }

    calculatedMarkers.sort((a, b) => a.position - b.position);

    console.timeEnd("Timeline Marker Calculation");
    return calculatedMarkers;
  }, [processedEvents, visibleRange.startDay, visibleDaySpan, calendarSettings, getDaysInMonth]); // Removed formatDate, add helpers?

  // Wheel Event Handler
  const handleWheel = (event) => {
      if (!containerRef.current) return;
      event.preventDefault();

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width;
      const { deltaX, deltaY } = event;

      // Determine if horizontal scroll (panning) or vertical scroll (zooming)
      // Prioritize horizontal scroll if its magnitude is greater
      const isHorizontalScroll = Math.abs(deltaX) > Math.abs(deltaY);

      if (isHorizontalScroll) {
          // --- Panning Logic --- 
          // Scale deltaX based on container width and visible span
          const panSpeedFactor = 0.5; // Adjust sensitivity as needed
          const deltaDays = (deltaX / containerWidth) * visibleDaySpan * panSpeedFactor;
          
          let newStartDay = visibleRange.startDay + deltaDays;
          let newEndDay = visibleRange.endDay + deltaDays;

          // Clamp to absolute range
          const absoluteDaySpan = absoluteMaxDayNumber - absoluteMinDayNumber + 1;
          const currentVisibleSpan = visibleDaySpan; // Keep span constant during pan
          
          // Prevent panning beyond the absolute max day number
          if (newEndDay > absoluteMaxDayNumber) {
              newEndDay = absoluteMaxDayNumber;
              newStartDay = newEndDay - currentVisibleSpan + 1;
          }
          // Prevent panning beyond the absolute min day number
          if (newStartDay < absoluteMinDayNumber) {
              newStartDay = absoluteMinDayNumber;
              newEndDay = newStartDay + currentVisibleSpan - 1;
          }
          
          // Ensure end day doesn't exceed max after clamping start (needed if span is close to absolute span)
          newEndDay = Math.min(newEndDay, absoluteMaxDayNumber); 
          
          // Ensure start/end are integers
          newStartDay = Math.round(newStartDay);
          newEndDay = Math.round(newEndDay);

          // Prevent invalid range after clamping/rounding
           if (newEndDay < newStartDay) newEndDay = newStartDay + currentVisibleSpan -1; 
          
          setVisibleRange({ startDay: newStartDay, endDay: newEndDay });

      } else {
          // --- Zooming Logic (existing logic) --- 
          const mouseX = event.clientX - rect.left; // Mouse position within container
          const proportion = containerWidth > 0 ? mouseX / containerWidth : 0.5; // Avoid div by zero
          const dayUnderCursor = visibleRange.startDay + proportion * (visibleDaySpan -1); 

          // Determine zoom factor based on deltaY
          const zoomFactor = deltaY < 0 ? 0.8 : 1.2; 

          // Calculate new span
          let newVisibleSpan = visibleDaySpan * zoomFactor;
          
          // --- Constraints ---
          newVisibleSpan = Math.max(10, newVisibleSpan); // Minimum span
          const absoluteDaySpan = absoluteMaxDayNumber - absoluteMinDayNumber + 1;
          newVisibleSpan = Math.min(newVisibleSpan, absoluteDaySpan); // Maximum span
          
          // --- Calculate new start/end days, keeping dayUnderCursor proportion --- 
          let newStartDay = dayUnderCursor - proportion * (newVisibleSpan - 1);
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
          // Re-clamp end day in case start day clamping changed it
          newEndDay = Math.min(newEndDay, absoluteMaxDayNumber); 
          
          // Ensure start/end are integers
          newStartDay = Math.round(newStartDay);
          newEndDay = Math.round(newEndDay);
          
          // Prevent invalid range (final check)
          if (newEndDay <= newStartDay) {
              // Reset or enforce min span if clamping failed
              newStartDay = absoluteMinDayNumber;
              newEndDay = absoluteMaxDayNumber;
              // Or: newEndDay = newStartDay + Math.max(10, newVisibleSpan - 1)
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
        {eventLayouts.map(({ originalEvent, style, extendsLeft, extendsRight }, index) => (
          <TimelineItem 
            key={originalEvent._id || `event-${index}`}
            event={originalEvent}
            style={style}
            onClick={onEventClick}
            formatDate={formatDate}
            extendsLeft={extendsLeft}
            extendsRight={extendsRight}
          />
        ))}
      </div>
      
    </div>
  );
};

export default HorizontalTimelineView; 