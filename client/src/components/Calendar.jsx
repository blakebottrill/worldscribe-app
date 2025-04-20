import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Button, Row, Col, Dropdown, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useCalendar } from '../contexts/CalendarContext';
import './Calendar.css';

// --- Copied Helper Function (Ideally move to utils) ---
const dateToDayNumber = (dateObj, settings, getDaysInMonthFunc) => {
    // ... (Full implementation of dateToDayNumber as used in HorizontalTimelineView)
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
    return null; 
  }
  let totalDays = 0;
  const targetYear = dateObj.year;
  const targetMonth = dateObj.month;
  const targetDay = dateObj.day;
  if (targetYear < 1) {
    return null;
  }
  for (let y = 1; y < targetYear; y++) {
    let daysInYearY = 0;
    for (let m = 0; m < settings.monthNames.length; m++) {
      daysInYearY += getDaysInMonthFunc(m, y);
    }
    if (!Number.isFinite(daysInYearY)) {
        return null;
    }
    totalDays += daysInYearY;
     if (totalDays > Number.MAX_SAFE_INTEGER / 2) {
        totalDays = Number.MAX_SAFE_INTEGER / 2;
        break;
     }
  }
  for (let m = 0; m < targetMonth; m++) {
    const daysInMonthM = getDaysInMonthFunc(m, targetYear);
     if (!Number.isFinite(daysInMonthM)) {
        return null;
    }
    totalDays += daysInMonthM;
  }
  const daysInTargetMonth = getDaysInMonthFunc(targetMonth, targetYear);
  if (targetDay > daysInTargetMonth) {
      totalDays += daysInTargetMonth;
  } else {
       totalDays += targetDay;
  }
  if (!Number.isFinite(totalDays)) {
      return null;
  }
  return totalDays > 0 ? totalDays : 1;
};
// --- End Helper Function ---

const Calendar = ({ onDateSelect, initialDate, minDate = null }) => {
  const { 
    calendarSettings, 
    loading,
    getDaysInMonth,
    formatMonth,
  } = useCalendar();
  
  const [currentYear, setCurrentYear] = useState(initialDate?.year || 1);
  const [currentMonth, setCurrentMonth] = useState(initialDate?.month || 0);
  const [selectedDate, setSelectedDate] = useState(initialDate || null);
  
  const [calendarDays, setCalendarDays] = useState([]);
  
  const [yearInputValue, setYearInputValue] = useState(String(currentYear));
  const yearInputRef = useRef(null);

  // Convert minDate to day number
  const minDayNumber = useMemo(() => {
      if (!minDate) return null;
      return dateToDayNumber(minDate, calendarSettings, getDaysInMonth);
  }, [minDate, calendarSettings, getDaysInMonth]);

  useEffect(() => {
    if (!calendarSettings || loading) return;
    generateCalendarDays();
  }, [calendarSettings, currentMonth, currentYear, loading]);
  
  useEffect(() => {
    if (yearInputValue !== String(currentYear)) {
        setYearInputValue(String(currentYear));
    }
  }, [currentYear]);
  
  const generateCalendarDays = () => {
    if (!calendarSettings) return;
    
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDayOfWeek = calendarSettings.firstDayOfWeek || 0;
    let firstDayWeekday = 0; 
    try {
      const firstOfMonthDate = new Date(currentYear, currentMonth, 1);
      firstDayWeekday = firstOfMonthDate.getDay();
      firstDayWeekday = (firstDayWeekday - firstDayOfWeek + 7) % 7; 
    } catch (e) {
      console.error("Error calculating first weekday:", e);
      firstDayWeekday = 0;
    }

    const days = [];
    const daysPerWeek = calendarSettings.dayNames.length;
    const totalCells = (Math.ceil((daysInMonth + firstDayWeekday) / daysPerWeek) * daysPerWeek) || daysPerWeek;
    
    const prevMonth = currentMonth === 0 ? calendarSettings.monthNames.length - 1 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevMonthYear);

    for (let i = 0; i < firstDayWeekday; i++) {
      days.push({ 
        day: daysInPrevMonth - firstDayWeekday + 1 + i, 
        month: prevMonth,
        year: prevMonthYear,
        isCurrentMonth: false
      });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ 
        day, 
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true
      });
    }
    
    const nextMonth = (currentMonth + 1) % calendarSettings.monthNames.length;
    const nextMonthYear = currentMonth === calendarSettings.monthNames.length - 1 ? currentYear + 1 : currentYear;
    let dayCounter = 1;
    while (days.length < totalCells) {
       days.push({ 
        day: dayCounter++, 
        month: nextMonth,
        year: nextMonthYear,
        isCurrentMonth: false
      });
    }
    
    setCalendarDays(days);
  };
  
  const handlePrevMonth = () => {
    const newMonth = currentMonth === 0 ? calendarSettings.monthNames.length - 1 : currentMonth - 1;
    const newYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    setCurrentMonth(newMonth);
    if (newYear !== currentYear) {
        setCurrentYear(newYear);
    }
  };
  
  const handleNextMonth = () => {
    const newMonth = (currentMonth + 1) % calendarSettings.monthNames.length;
    const newYear = currentMonth === calendarSettings.monthNames.length - 1 ? currentYear + 1 : currentYear;
    setCurrentMonth(newMonth);
    if (newYear !== currentYear) {
       setCurrentYear(newYear); 
    }
  };
  
  const handleDateClick = (day) => {
    const clickedDayNumber = dateToDayNumber(day, calendarSettings, getDaysInMonth);
    
    if (minDayNumber !== null && clickedDayNumber !== null && clickedDayNumber < minDayNumber) {
        console.warn("Selected date is before the minimum allowed date.");
        return; 
    }

    const date = {
      day: day.day,
      month: day.month,
      year: day.year
    };
    setSelectedDate(date);
    if (onDateSelect) {
      onDateSelect(date);
    }
  };
  
  const isSelectedDate = (day) => {
    return selectedDate && 
           selectedDate.day === day.day && 
           selectedDate.month === day.month && 
           selectedDate.year === day.year;
  };
  
  const renderWeekdaysHeader = () => {
    if (!calendarSettings || !calendarSettings.dayNames || calendarSettings.dayNames.length === 0) {
      return null;
    }
    
    const daysPerWeek = calendarSettings.dayNames.length;
    const firstDayOfWeek = calendarSettings.firstDayOfWeek || 0;
    const headers = [];

    for (let i = 0; i < daysPerWeek; i++) {
      const dayIndex = (firstDayOfWeek + i) % daysPerWeek;
      const dayName = calendarSettings.dayNames[dayIndex];
      headers.push(
        <th key={i} className="calendar-weekday-header">
          {dayName ? dayName.charAt(0) : ''} 
        </th>
      );
    }
    return <tr>{headers}</tr>;
  };
  
  const renderCalendarDays = () => {
    if (!calendarSettings || !calendarDays.length) return null;
    
    const rows = [];
    const daysPerWeek = calendarSettings.dayNames.length;
    
    for (let i = 0; i < calendarDays.length; i += daysPerWeek) {
      const weekDays = calendarDays.slice(i, i + daysPerWeek);
      rows.push(
        <tr key={i}>
          {weekDays.map((day, index) => {
            let isDisabled = false;
            if (day.day && minDayNumber !== null) { 
              const currentDayNumber = dateToDayNumber(day, calendarSettings, getDaysInMonth);
              if (currentDayNumber !== null && currentDayNumber < minDayNumber) {
                isDisabled = true;
              }
            }
            
            return (
              <td 
                key={index} 
                className={`text-center calendar-day 
                  ${day.isCurrentMonth ? '' : 'other-month'} 
                  ${isSelectedDate(day) ? 'selected' : ''}
                  ${isDisabled ? 'disabled' : ''} 
                `}
                onClick={() => !isDisabled && day.day && handleDateClick(day)}
              >
                {day.day}
              </td>
            );
          })}
        </tr>
      );
    }
    return rows;
  };
  
  const handleYearInputChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^-?\d*$/.test(value)) {
        setYearInputValue(value);
    }
  };
  
  const finalizeYearChange = () => {
    const yearNum = parseInt(yearInputValue);
    const newYear = !isNaN(yearNum) && yearNum >= 1 ? yearNum : 1; 
    
    if (newYear !== currentYear) {
        setCurrentYear(newYear); 
    } else {
        setYearInputValue(String(currentYear)); 
    }
  };
  
  const handleYearInputKeyDown = (e) => {
      if (e.key === 'Enter') {
          finalizeYearChange();
          e.preventDefault();
      }
  };

  const handleYearInputFocus = (e) => {
    // Prevent the default behavior that might cause focus to be lost
    e.preventDefault();
    // Stop the event from bubbling up to parent elements
    e.stopPropagation(); 
    // Select all text for easy replacement
    e.target.select();
  };

  const handleYearInputClick = (e) => {
    // Prevent default to maintain focus
    e.preventDefault();
    // Stop the event from bubbling up to parent elements
    e.stopPropagation(); 
    // Select all text for easy replacement
    e.target.select();
  };
  
  const handleYearInputMouseDown = (e) => {
    // Stop the mousedown event from propagating to parent listeners
    // which might be trying to close the popover
    e.stopPropagation();
  };
  
  const renderMonthOptions = () => {
    if (!calendarSettings) return null;
    return calendarSettings.monthNames.map((month, index) => (
      <Dropdown.Item 
        key={index} 
        active={index === currentMonth}
        onClick={() => setCurrentMonth(index)}
      >
        {formatMonth(index)}
      </Dropdown.Item>
    ));
  };
  
  if (loading || !calendarSettings) {
    return <Card className="calendar-card"><Card.Body>Loading calendar...</Card.Body></Card>;
  }
  
  return (
    <Card className="calendar-card">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <Button 
            variant="light" 
            className="calendar-nav-btn me-2"
            onClick={handlePrevMonth}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </Button>
          
          <div className="calendar-header d-flex align-items-center">
            <Dropdown className="d-inline-block me-2">
              <Dropdown.Toggle variant="light" id="dropdown-month">
                {formatMonth(currentMonth)}
              </Dropdown.Toggle>
              <Dropdown.Menu className="dropdown-menu-calendar">
                {renderMonthOptions()}
              </Dropdown.Menu>
            </Dropdown>
            
            <Form.Control
              type="number" 
              value={yearInputValue} 
              onChange={handleYearInputChange}
              onBlur={finalizeYearChange}
              onKeyDown={handleYearInputKeyDown}
              onFocus={handleYearInputFocus}
              onClick={handleYearInputClick}
              onMouseDown={handleYearInputMouseDown}
              className="calendar-year-input"
              min="1"
              step="1"
              ref={yearInputRef}
            />
          </div>
          
          <Button 
            variant="light" 
            className="calendar-nav-btn ms-2"
            onClick={handleNextMonth}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </Button>
        </div>
      </Card.Header>
      
      <Card.Body className="p-0">
        <table className="calendar-table">
          <thead> 
            {renderWeekdaysHeader()}
          </thead>
          <tbody>
            {renderCalendarDays()}
          </tbody>
        </table>
      </Card.Body>
    </Card>
  );
};

export default Calendar; 