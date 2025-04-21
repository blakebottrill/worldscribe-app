/**
 * Calculates the number of days in a given month and year,
 * respecting calendar settings (leap years, days per month).
 * NOTE: This assumes getDaysInMonthFunc is passed correctly.
 *       It might be better to pass the full calendarSettings
 *       if getDaysInMonth relies on more rules within settings.
 */
const getDaysInMonthInternal = (month, year, settings, getDaysInMonthFunc) => {
     if (!settings || !getDaysInMonthFunc) return 30; // Default fallback
     // Ensure month is within bounds for getDaysInMonthFunc if it expects valid indices
     if (month < 0 || month >= settings.monthNames.length) {
         console.warn(`[getDaysInMonthInternal] Invalid month index: ${month}`);
         return 0; // Or handle as error
     }
     try {
        return getDaysInMonthFunc(month, year); // Use the passed function
     } catch (e) {
        console.error(`[getDaysInMonthInternal] Error calling getDaysInMonthFunc(${month}, ${year}):`, e);
        return 30; // Fallback on error
     }
}

// --- Helper to get average days per year (cached) ---
const averageDaysCache = new Map();

const getAverageDaysInYear = (settings, getDaysInMonthFunc) => {
    const cacheKey = JSON.stringify({ rule: settings.leapYearRule, offset: settings.leapYearOffset, days: settings.daysPerMonth });
    if (averageDaysCache.has(cacheKey)) {
        return averageDaysCache.get(cacheKey);
    }

    if (!settings || !settings.monthNames || settings.monthNames.length === 0 || !getDaysInMonthFunc) {
        return 365.25; // Default fallback average
    }

    let totalDaysInSample = 0;
    const sampleYears = 400; // Use a large cycle (like Gregorian) to average leap years well
    const startYear = 1; // Use a positive starting year for simplicity

    for (let y = startYear; y < startYear + sampleYears; y++) {
        let daysInYearY = 0;
        for (let m = 0; m < settings.monthNames.length; m++) {
            daysInYearY += getDaysInMonthInternal(m, y, settings, getDaysInMonthFunc);
        }
         if (!Number.isFinite(daysInYearY)) {
             console.warn(`[getAverageDaysInYear] Non-finite days calculated for year ${y}. Using fallback average.`);
             averageDaysCache.set(cacheKey, 365.25);
             return 365.25;
         }
        totalDaysInSample += daysInYearY;
    }

    const average = totalDaysInSample / sampleYears;
    averageDaysCache.set(cacheKey, average);
    return average;
};


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
    !settings.monthNames || // Added check
    settings.monthNames.length === 0 || // Added check
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
  const numMonths = settings.monthNames.length;

  // Use the calculation logic based on year 1 = day 1
  if (targetYear >= 1) {
      // Calculate days for full years before targetYear
      if (targetYear > 1) {
          // More optimized calculation for full years:
          // Instead of looping year by year, calculate directly if possible,
          // especially if leap year rules are simple.
          // For complex rules, might still need iteration or a better formula.
          // Let's keep the year loop for now but acknowledge it's the bottleneck.
          // TODO: Optimize this loop further based on leap year rule predictability
          for (let y = 1; y < targetYear; y++) {
              let daysInYearY = 0;
              for (let m = 0; m < numMonths; m++) {
                  daysInYearY += getDaysInMonthInternal(m, y, settings, getDaysInMonthFunc);
              }
              if (!Number.isFinite(daysInYearY)) return null;
              totalDays += daysInYearY;
              // Add clamping or overflow check if necessary for extremely large years
              if (!Number.isFinite(totalDays) || Math.abs(totalDays) > Number.MAX_SAFE_INTEGER / 2 ) {
                   console.warn(`[dateToDayNumber] Potential overflow calculating year ${y}`);
                   return (totalDays > 0 ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER) / 2;
              }
          }
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

  } else { // targetYear <= 0
      // Calculation for year 0 and negative years
      // Start from day 1 (start of year 1) and subtract days backwards
      totalDays = 1;
      // TODO: Optimize this loop similar to the forward calculation
      for (let y = 0; y >= targetYear; y--) {
          let daysInYearY = 0;
          for (let m = 0; m < numMonths; m++) {
              daysInYearY += getDaysInMonthInternal(m, y, settings, getDaysInMonthFunc);
          }
          if (!Number.isFinite(daysInYearY)) return null;
          totalDays -= daysInYearY; // Subtract days for this past year
           // Add clamping or overflow check
           if (!Number.isFinite(totalDays) || Math.abs(totalDays) > Number.MAX_SAFE_INTEGER / 2 ) {
               console.warn(`[dateToDayNumber] Potential overflow calculating year ${y}`);
               return (totalDays > 0 ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER) / 2;
           }
      }
      // Add back days from the start of targetYear up to the target date
      for (let m = 0; m < targetMonth; m++) {
          const daysInMonthM = getDaysInMonthInternal(m, targetYear, settings, getDaysInMonthFunc);
          if (!Number.isFinite(daysInMonthM)) return null;
          totalDays += daysInMonthM;
      }
      const daysInTargetMonth = getDaysInMonthInternal(targetMonth, targetYear, settings, getDaysInMonthFunc);
      totalDays += Math.min(targetDay, daysInTargetMonth);
  }

  if (!Number.isFinite(totalDays)) {
      console.warn("[dateToDayNumber] Result is not finite:", totalDays);
      return null;
  }
  // Clamp final result
  return Math.max(Number.MIN_SAFE_INTEGER, Math.min(Number.MAX_SAFE_INTEGER, totalDays));
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

/**
 * Adds a specified number of days to a given date object.
 * Handles month and year rollovers based on calendar settings.
 *
 * @param {object} dateObj - The starting date { year, month, day }
 * @param {number} daysToAdd - The number of days to add (can be negative)
 * @param {object} settings - Calendar settings (monthNames length needed)
 * @param {function} getDaysInMonthFunc - Function(month, year) to get days in month
 * @returns {object} The new date object { year, month, day }
 */
export const addDaysToDate = (dateObj, daysToAdd, settings, getDaysInMonthFunc) => {
    if (!dateObj || !settings || !settings.monthNames || settings.monthNames.length === 0 || !getDaysInMonthFunc) {
        console.error("[addDaysToDate] Invalid input", { dateObj, daysToAdd, settings: !!settings, getDaysInMonthFunc: !!getDaysInMonthFunc });
        return dateObj;
    }

    // Convert start date to day number
    const startDayNum = dateToDayNumber(dateObj, settings, getDaysInMonthFunc);
    if (startDayNum === null) {
        console.error("[addDaysToDate] Could not convert start date to day number", { dateObj });
        return dateObj; // Bail if start date is invalid
    }

    // Calculate the target day number
    const targetDayNum = startDayNum + daysToAdd;

    // Convert the target day number back to a date object
    const newDate = dayNumberToDate(targetDayNum, settings, getDaysInMonthFunc);
    if (newDate === null) {
        console.error("[addDaysToDate] Could not convert target day number back to date", { targetDayNum });
        // Fallback: return original date, or potentially clamp to min/max representable date?
        return dateObj; 
    }
    
    return newDate;
};

/**
 * Converts a cumulative day number back to a date object { year, month, day }.
 * This is the inverse of dateToDayNumber.
 * Handles years <= 0.
 *
 * @param {number} dayNumber - The cumulative day number (1 = Year 1, Month 0, Day 1)
 * @param {object} settings - Calendar settings (monthNames length needed)
 * @param {function} getDaysInMonthFunc - Function(month, year) to get days in month
 * @returns {object|null} Date object { year, month, day } or null if input is invalid/unrepresentable.
 */
export const dayNumberToDate = (dayNumber, settings, getDaysInMonthFunc) => {
    // --- Input Validation ---
    if (
        dayNumber === undefined || dayNumber === null || !Number.isFinite(dayNumber) ||
        !settings || !settings.monthNames || settings.monthNames.length === 0 ||
        !getDaysInMonthFunc
    ) {
        console.warn("[dayNumberToDate] Invalid input:", { dayNumber, settings: !!settings, getDaysInMonthFunc: !!getDaysInMonthFunc });
        return null;
    }

    // Clamp input day number for safety
    dayNumber = Math.max(Number.MIN_SAFE_INTEGER, Math.min(Number.MAX_SAFE_INTEGER, dayNumber));

    const numMonths = settings.monthNames.length;
    const avgDays = getAverageDaysInYear(settings, getDaysInMonthFunc);
    if (avgDays <= 0) { // Avoid division by zero or infinite loops
         console.error("[dayNumberToDate] Average days per year is non-positive. Cannot proceed.", avgDays);
         return null;
    }

    // --- Estimate Year ---
    // Adjust dayNumber relative to the start of year 1 (which is day 1)
    const adjustedDayNumber = dayNumber - 1;
    let estimatedYear = 1 + Math.floor(adjustedDayNumber / avgDays);

    // --- Refine Year ---
    // Find the day number for the start of the estimated year
    let currentYear = estimatedYear;
    let startDayOfCurrentYear = dateToDayNumber({ year: currentYear, month: 0, day: 1 }, settings, getDaysInMonthFunc);

    // Check if dateToDayNumber failed
    if (startDayOfCurrentYear === null) {
        console.error(`[dayNumberToDate] Failed to calculate start day for estimated year ${currentYear}`);
        // Attempt a safe fallback or return null
        // Fallback: try year 1 if dayNumber is positive, year 0 otherwise
        currentYear = dayNumber > 0 ? 1 : 0;
        startDayOfCurrentYear = dateToDayNumber({ year: currentYear, month: 0, day: 1 }, settings, getDaysInMonthFunc);
        if (startDayOfCurrentYear === null) return null; // Give up if even fallback fails
    }

    // Iterate forwards or backwards from the estimate to find the correct year
    // Safety limits to prevent infinite loops in case of logic errors
    const maxYearIteration = 10; // Usually 1 or 2 iterations should be enough
    let iterations = 0;

    if (dayNumber >= startDayOfCurrentYear) {
        // Target day is in or after estimated year, iterate forward
        while (iterations < maxYearIteration) {
             let daysInCurrentYear = 0;
             for (let m = 0; m < numMonths; m++) {
                 daysInCurrentYear += getDaysInMonthInternal(m, currentYear, settings, getDaysInMonthFunc);
             }
             if (!Number.isFinite(daysInCurrentYear) || daysInCurrentYear <= 0) {
                 console.error(`[dayNumberToDate] Invalid days calculated for year ${currentYear}`);
                 return null; // Cannot proceed if year length is invalid
             }

             const startDayOfNextYear = startDayOfCurrentYear + daysInCurrentYear;
             if (dayNumber < startDayOfNextYear) {
                 break; // Found the correct year
             }
             startDayOfCurrentYear = startDayOfNextYear;
             currentYear++;
             iterations++;
        }
    } else {
        // Target day is before estimated year, iterate backward
        while (iterations < maxYearIteration) {
             let daysInPreviousYear = 0;
             const previousYear = currentYear - 1;
             for (let m = 0; m < numMonths; m++) {
                 daysInPreviousYear += getDaysInMonthInternal(m, previousYear, settings, getDaysInMonthFunc);
             }
              if (!Number.isFinite(daysInPreviousYear) || daysInPreviousYear <= 0) {
                 console.error(`[dayNumberToDate] Invalid days calculated for year ${previousYear}`);
                 return null; // Cannot proceed if year length is invalid
              }

             const startDayOfPreviousYear = startDayOfCurrentYear - daysInPreviousYear;
             if (dayNumber >= startDayOfPreviousYear) {
                 // Found the correct year (which is previousYear)
                 currentYear = previousYear;
                 startDayOfCurrentYear = startDayOfPreviousYear;
                 break;
             }
             startDayOfCurrentYear = startDayOfPreviousYear;
             currentYear--; // Should be previousYear, decrementing for next loop check
             iterations++;
        }
    }

     if (iterations >= maxYearIteration) {
         console.warn(`[dayNumberToDate] Exceeded max iterations (${maxYearIteration}) refining year for dayNumber ${dayNumber}. Result might be inaccurate.`);
         // Continue with the last calculated year, but log warning
     }

    // --- Calculate Month and Day ---
    let remainingDays = dayNumber - startDayOfCurrentYear; // Days *within* the currentYear (0-indexed)
    let currentMonth = 0;

    for (let m = 0; m < numMonths; m++) {
        const daysInMonthM = getDaysInMonthInternal(m, currentYear, settings, getDaysInMonthFunc);
         if (!Number.isFinite(daysInMonthM) || daysInMonthM < 0) {
             console.error(`[dayNumberToDate] Invalid days (${daysInMonthM}) for month ${m}, year ${currentYear}`);
             return null; // Cannot proceed
         }
        if (remainingDays < daysInMonthM) {
            currentMonth = m;
            break;
        }
        remainingDays -= daysInMonthM;
        // Handle case where dayNumber lands exactly on the last day of the last month
        if (m === numMonths - 1 && remainingDays === 0) {
             currentMonth = m;
             break;
        }
    }

    // Day is 1-indexed
    const currentDay = remainingDays + 1;

    // Final validation on the day
    const finalDaysInMonth = getDaysInMonthInternal(currentMonth, currentYear, settings, getDaysInMonthFunc);
    if(currentDay < 1 || currentDay > finalDaysInMonth) {
         console.error(`[dayNumberToDate] Calculated day ${currentDay} is out of bounds (1-${finalDaysInMonth}) for month ${currentMonth}, year ${currentYear}. Input dayNumber: ${dayNumber}`);
         // Attempt to clamp or return null
         return { year: currentYear, month: currentMonth, day: Math.max(1, Math.min(currentDay, finalDaysInMonth)) }; // Clamp as fallback
    }

    return { year: currentYear, month: currentMonth, day: currentDay };
};


// Ensure this file ends with a newline if it didn't before 