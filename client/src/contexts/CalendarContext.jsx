import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import calendarService from '../services/calendarService';

const defaultCalendar = {
  dayNames: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  monthNames: [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  daysPerMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  leapYearRule: 'standard', // 'standard', 'none', 'custom'
  leapYearOffset: 4, // For custom leap year rules
  firstDayOfWeek: 0, // 0 = Sunday, 1 = Monday, etc.
};

const CalendarContext = createContext();

export function CalendarProvider({ children }) {
  const { worldId } = useParams();
  const [calendarSettings, setCalendarSettings] = useState(defaultCalendar);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (worldId) {
      fetchCalendarSettings();
    } else {
      setCalendarSettings(defaultCalendar);
      setLoading(false);
    }
  }, [worldId]);

  const fetchCalendarSettings = async () => {
    try {
      setLoading(true);
      const data = await calendarService.getCalendarSettings(worldId);
      if (data) {
        setCalendarSettings(data);
      } else {
        setCalendarSettings(defaultCalendar);
      }
    } catch (error) {
      console.error('Error fetching calendar settings:', error);
      setCalendarSettings(defaultCalendar);
      toast.error('Failed to load calendar settings');
    } finally {
      setLoading(false);
    }
  };

  const saveCalendarSettings = async (settings) => {
    try {
      setLoading(true);
      await calendarService.saveCalendarSettings(worldId, settings);
      setCalendarSettings(settings);
      toast.success('Calendar settings saved');
    } catch (error) {
      console.error('Error saving calendar settings:', error);
      toast.error('Failed to save calendar settings');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    
    const month = date.month !== undefined ? date.month : 0;
    const day = date.day !== undefined ? date.day : 1;
    const year = date.year !== undefined ? date.year : 1;
    
    return `${day} ${calendarSettings.monthNames[month]} ${year}`;
  };

  const formatDay = (day, month, year) => {
    if (day === null || day === undefined) return '';
    return day.toString();
  };

  const formatMonth = (month) => {
    if (month === null || month === undefined) return '';
    
    return calendarSettings.monthNames[month];
  };

  const formatWeekday = (dayIndex) => {
    if (dayIndex === null || dayIndex === undefined) return '';
    
    // Calculate the day name based on first day of week
    return calendarSettings.dayNames[dayIndex];
  };

  const getDaysInMonth = (month, year) => {
    if (month === null || month === undefined || month < 0 || month >= calendarSettings.monthNames.length) {
      return 30; // Default value
    }
    
    if (month === 1) { // February
      if (calendarSettings.leapYearRule === 'standard') {
        // Standard leap year rules
        return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) 
          ? 29 : calendarSettings.daysPerMonth[month];
      } else if (calendarSettings.leapYearRule === 'custom') {
        // Custom leap year rules
        return (year % calendarSettings.leapYearOffset === 0) 
          ? 29 : calendarSettings.daysPerMonth[month];
      } else {
        // No leap years
        return calendarSettings.daysPerMonth[month];
      }
    }
    
    return calendarSettings.daysPerMonth[month];
  };

  return (
    <CalendarContext.Provider
      value={{
        calendarSettings,
        setCalendarSettings,
        saveCalendarSettings,
        loading,
        formatDate,
        formatDay,
        formatMonth,
        formatWeekday,
        getDaysInMonth,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}

export default CalendarContext; 