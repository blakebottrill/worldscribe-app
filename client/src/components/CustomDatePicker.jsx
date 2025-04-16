import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useCalendar } from '../contexts/CalendarContext';
import './CustomDatePicker.css';

/**
 * A custom date picker component that displays dates according to the user's custom calendar settings
 */
const CustomDatePicker = ({
  selected,
  onChange,
  placeholderText = "Select a date",
  isClearable = true,
  dateFormat = "MM/dd/yyyy",
  showMonthDropdown = true,
  showYearDropdown = true,
  dropdownMode = "select",
  ...props
}) => {
  const { 
    calendarSettings, 
    getDayName, 
    getMonthName, 
    getDaysInMonth 
  } = useCalendar();

  // Custom header for the date picker
  const CustomHeader = ({
    date,
    changeYear,
    changeMonth,
    decreaseMonth,
    increaseMonth,
    prevMonthButtonDisabled,
    nextMonthButtonDisabled,
  }) => {
    const years = Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - 50 + i);
    const months = calendarSettings.useCustomCalendar 
      ? calendarSettings.monthNames 
      : [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];

    return (
      <div className="custom-datepicker-header">
        <button
          onClick={decreaseMonth}
          disabled={prevMonthButtonDisabled}
          className="month-nav-button"
        >
          {"<"}
        </button>
        <select
          value={date.getMonth()}
          onChange={({ target: { value } }) => changeMonth(value)}
          className="month-select"
        >
          {months.map((month, i) => (
            <option key={month} value={i}>
              {month}
            </option>
          ))}
        </select>
        <select
          value={date.getFullYear()}
          onChange={({ target: { value } }) => changeYear(value)}
          className="year-select"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <button
          onClick={increaseMonth}
          disabled={nextMonthButtonDisabled}
          className="month-nav-button"
        >
          {">"}
        </button>
      </div>
    );
  };

  // Custom day rendering
  const renderDayContents = (day, date) => {
    if (!date) return day;
    return <span>{date.getDate()}</span>;
  };

  // Custom day names formatting
  const formatWeekday = (locale, date) => {
    const day = date.getDay();
    return calendarSettings.useCustomCalendar 
      ? calendarSettings.dayNames[day % calendarSettings.daysPerWeek].substring(0, 3)
      : getDayName(day).substring(0, 3);
  };

  // Format day for display in the input field
  const formatDay = (date, dateFormat, locale) => {
    if (!date) return "";
    if (calendarSettings.useCustomCalendar) {
      const day = date.getDate();
      const month = date.getMonth();
      const year = date.getFullYear();
      return `${day} ${getMonthName(month)}, ${year}`;
    }
    // Use default date formatter for standard calendar
    return date.toLocaleDateString();
  };

  // Custom input to handle both standard and custom formatting
  const CustomInput = forwardRef(({ value, onClick, onChange, placeholder }, ref) => (
    <input
      className="custom-datepicker-input"
      onClick={onClick}
      onChange={onChange}
      placeholder={placeholder}
      value={value}
      ref={ref}
    />
  ));

  return (
    <div className="custom-datepicker-container">
      <DatePicker
        selected={selected}
        onChange={onChange}
        placeholderText={placeholderText}
        isClearable={isClearable}
        dateFormat={dateFormat}
        showMonthDropdown={showMonthDropdown}
        showYearDropdown={showYearDropdown}
        dropdownMode={dropdownMode}
        renderCustomHeader={CustomHeader}
        renderDayContents={renderDayContents}
        formatWeekDay={formatWeekday}
        customInput={<CustomInput />}
        {...props}
      />
    </div>
  );
};

export default CustomDatePicker; 