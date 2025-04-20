/**
 * Calculates the number of days in a given month and year,
 * respecting calendar settings (leap years, days per month).
 * NOTE: This assumes getDaysInMonthFunc is passed correctly.
 *       It might be better to pass the full calendarSettings
 *       if getDaysInMonth relies on more rules within settings.
 */
const getDaysInMonthInternal = (month, year, settings, getDaysInMonthFunc) => {
     if (!settings || !getDaysInMonthFunc) return 30; // Default fallback
     return getDaysInMonthFunc(month, year); // Use the passed function
}


/**
 * Calculates a cumulative day number relative to the start of Year 1.
 * Day 1 corresponds to { year: 1, month: 0, day: 1 }.
 * Handles years <= 0 by calculating backwards.
 * Assumes a Year 0 exists between Year 1 and Year -1.
 *
 * @param {object} dateObj - The date { year, month, day } (month 0-indexed, day 1-indexed)
 * @param {object} settings - Calendar settings (monthNames length needed)
 * @param {function} getDaysInMonthFunc - Function(month, year) to get days in month
 * @returns {number|null} Cumulative day number or null if invalid.
 */
export const dateToDayNumber = (dateObj, settings, getDaysInMonthFunc) => {
  // --- Input Validation ---
  if (
    !dateObj ||
    dateObj.year === undefined || // Allow year 0 and negative
    dateObj.month === undefined ||
    dateObj.day === undefined ||
    !settings ||
    !getDaysInMonthFunc ||
    dateObj.month < 0 ||
    dateObj.month >= settings.monthNames.length ||
    dateObj.day < 1
  ) {
    console.warn("[dateToDayNumber] Invalid input:", { dateObj, settings: !!settings, getDaysInMonthFunc: !!getDaysInMonthFunc });
    return null;
  }

  const targetYear = dateObj.year;
  const targetMonth = dateObj.month;
  const targetDay = dateObj.day;

  // --- Calculation ---
  let totalDays = 0;

  if (targetYear >= 1) {
    // --- Forward Calculation (Years >= 1) ---
    // Days from Year 1 up to targetYear
    for (let y = 1; y < targetYear; y++) {
      let daysInYearY = 0;
      for (let m = 0; m < settings.monthNames.length; m++) {
        daysInYearY += getDaysInMonthInternal(m, y, settings, getDaysInMonthFunc);
      }
      if (!Number.isFinite(daysInYearY)) return null;
      totalDays += daysInYearY;
      if (totalDays > Number.MAX_SAFE_INTEGER / 2) { /* Clamp */ totalDays = Number.MAX_SAFE_INTEGER / 2; break; }
    }

    // Days from start of targetYear up to targetMonth
    for (let m = 0; m < targetMonth; m++) {
      const daysInMonthM = getDaysInMonthInternal(m, targetYear, settings, getDaysInMonthFunc);
      if (!Number.isFinite(daysInMonthM)) return null;
      totalDays += daysInMonthM;
    }

    // Add days in targetMonth (clamped)
    const daysInTargetMonth = getDaysInMonthInternal(targetMonth, targetYear, settings, getDaysInMonthFunc);
    totalDays += Math.min(targetDay, daysInTargetMonth);

  } else {
    // --- Backward Calculation (Years <= 0) ---
    // Start from Day 1 of Year 1 (which is day number 1) and subtract days for Year 0, -1, etc.
    // Day number 0 is the day *before* Day 1 of Year 1.
    totalDays = 1; // Start point

    for (let y = 0; y >= targetYear; y--) { // Loop from Year 0 down to targetYear
        let daysInYearY = 0;
        for (let m = 0; m < settings.monthNames.length; m++) {
            daysInYearY += getDaysInMonthInternal(m, y, settings, getDaysInMonthFunc);
        }
         if (!Number.isFinite(daysInYearY)) return null;
         totalDays -= daysInYearY; // Subtract days in this past year
         // Safety break
         if (totalDays < Number.MIN_SAFE_INTEGER / 2) { /* Clamp */ totalDays = Number.MIN_SAFE_INTEGER / 2; break; }
    }

    // Now, add days from the start of targetYear up to the target date
    // (effectively reducing the subtraction)
     for (let m = 0; m < targetMonth; m++) {
        const daysInMonthM = getDaysInMonthInternal(m, targetYear, settings, getDaysInMonthFunc);
        if (!Number.isFinite(daysInMonthM)) return null;
        totalDays += daysInMonthM;
     }
     const daysInTargetMonth = getDaysInMonthInternal(targetMonth, targetYear, settings, getDaysInMonthFunc);
     totalDays += Math.min(targetDay, daysInTargetMonth);

  }


  if (!Number.isFinite(totalDays)) {
    return null;
  }

  return totalDays;
};


/**
 * Calculates approximate day number for the start of a given year (Year Y, Month 0, Day 1).
 * Uses dateToDayNumber internally.
 */
export const yearToStartDayNumber = (targetYear, settings, getDaysInMonthFunc) => {
  if (
    targetYear === undefined ||
    !settings ||
    !getDaysInMonthFunc
  ) {
    return null;
  }
  const dateObj = { year: targetYear, month: 0, day: 1 };
  // Ensure day 1 is valid for month 0
   const daysInMonth0 = getDaysInMonthInternal(0, targetYear, settings, getDaysInMonthFunc);
   if (daysInMonth0 < 1) {
       return null;
   }
  return dateToDayNumber(dateObj, settings, getDaysInMonthFunc);
};

/**
 * Calculates the approximate day number for the start of a given month 
 * (Year Y, Month M, Day 1).
 * Uses dateToDayNumber internally.
 */
export const monthToStartDayNumber = (targetYear, targetMonth, settings, getDaysInMonthFunc) => {
    if (
        targetYear === undefined ||
        targetMonth === undefined ||
        targetMonth < 0 ||
        targetMonth >= settings.monthNames.length ||
        !settings ||
        !getDaysInMonthFunc
    ) {
        console.warn("[monthToStartDayNumber] Invalid input", { targetYear, targetMonth, settings: !!settings });
        return null;
    }
    const dateObj = { year: targetYear, month: targetMonth, day: 1 };
    // Ensure day 1 is valid for this month
    const daysInTargetMonth = getDaysInMonthInternal(targetMonth, targetYear, settings, getDaysInMonthFunc);
    if (daysInTargetMonth < 1) {
        console.warn("[monthToStartDayNumber] Month has less than 1 day?", { targetYear, targetMonth, daysInTargetMonth });
        return null; // Or handle appropriately - maybe means the month doesn't exist?
    }
    return dateToDayNumber(dateObj, settings, getDaysInMonthFunc);
};

/**
 * Adds a specified number of months to a given date object.
 * Handles year rollovers based on the number of months in the calendar.
 *
 * @param {object} dateObj - The starting date { year, month, day }
 * @param {number} monthsToAdd - The number of months to add (can be negative)
 * @param {object} settings - Calendar settings (monthNames length needed)
 * @returns {object} The new date object { year, month, day }
 */
export const addMonthsToDate = (dateObj, monthsToAdd, settings) => {
    if (!dateObj || !settings || !settings.monthNames || settings.monthNames.length === 0) {
        console.error("[addMonthsToDate] Invalid input", { dateObj, monthsToAdd, settings });
        // Return original date or throw error? Returning original for now.
        return dateObj; 
    }

    const numMonthsInYear = settings.monthNames.length;
    let currentMonthAbsolute = dateObj.year * numMonthsInYear + dateObj.month;
    let newMonthAbsolute = currentMonthAbsolute + monthsToAdd;

    let newYear = Math.floor(newMonthAbsolute / numMonthsInYear);
    let newMonth = newMonthAbsolute % numMonthsInYear;

    // Handle negative absolute months resulting in negative month index
    if (newMonth < 0) {
        newMonth += numMonthsInYear;
        // newYear adjustment already handled by floor, but double-check logic for year 0 cases if needed
    }

    // Day is kept the same, assuming the intention is to land on the same day number
    // in the new month. We are not handling clamping if the day exceeds the new month's length here,
    // as this function is primarily for finding *start* points for markers.
    // If needed later, add clamping: 
    // const daysInNewMonth = getDaysInMonthInternal(newMonth, newYear, settings, getDaysInMonth); // Need getDaysInMonth here
    // const newDay = Math.min(dateObj.day, daysInNewMonth);

    return { year: newYear, month: newMonth, day: dateObj.day }; 
};


// Ensure this file ends with a newline if it didn't before 