import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isBefore,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';

export const DATE_FORMAT = 'yyyy-MM-dd';
/**
 * Finds the nth occurrence of a weekday in a given date
 */
export const getWeekdayOccurrence = (date: Date): number => {
  const dayOfWeek = getDay(date);
  const start = startOfMonth(date);
  let count = 0;

  for (const day of eachDayOfInterval({ start, end: date })) {
    if (getDay(day) === dayOfWeek) {
      count++;
    }
  }

  return count; // 1-based index
};

/**
 * Gets the nth occurrence of a weekday in a target month.
 * If that occurrence doesn't exist, fallback to the one in the previous week.
 */
export const getNthWeekdayOfMonth = (
  targetMonth: Date,
  weekday: number,
  nth: number,
): Date => {
  const days = eachDayOfInterval({
    start: startOfMonth(targetMonth),
    end: endOfMonth(targetMonth),
  });

  const matchingDays = days.filter((d) => getDay(d) === weekday);
  if (nth <= matchingDays.length) {
    return matchingDays[nth - 1];
  } else {
    // Fallback to previous week
    return matchingDays[matchingDays.length - 1];
  }
};

/**
 * Checks if the order date is frozen based on the freeze time in days , i.e
 * number of days before the next order date when no changes can be made.
 */
export const isOrderDateFrozen = (
  orderDate: string,
  freezeTimeInDays: number,
): boolean => {
  const _orderDate = strToDate(orderDate);
  const freezeDate = subDays(_orderDate, freezeTimeInDays);
  return !isBefore(today(), freezeDate);
};

/**
 * Calculates the next scheduled date based on a starting date and a schedule string.
 *
 * The schedule string must be in the format "{number}{unit}", where:
 * - {number} is a positive integer.
 * - {unit} is either 'W' for weeks or 'M' for months.
 *
 * For weekly schedules (e.g., "2W"), the function adds the specified number of weeks to the starting date.
 *
 * For monthly schedules (e.g., "1M"), the function determines the next date by finding the same weekday
 * and "occurrence" in the future month. For example, if the starting date is the 3rd Tuesday of the month,
 * the next scheduled date will be the 3rd Tuesday of the following month (or N months later).
 * If the calculated occurrence does not exist in the target month (e.g., a 5th Friday in a month with only four),
 * the function falls back to the last occurrence of that weekday in the target month (e.g., the 4th Friday).
 *
 * The function normalizes the input date to the start of the day to ensure consistent calculations.
 *
 * @param {Date} date - The starting date from which to calculate the next scheduled date.
 * @param {string} schedule - The schedule string, such as "1W" (every week) or "2M" (every 2 months).
 * @returns {Date} The calculated next scheduled date.
 * @throws {Error} If the schedule format is invalid.
 */
export const getNextScheduledDate = (date: Date, schedule: string): Date => {
  const _date = startOfDay(date); // Normalize to start of day

  const match = schedule.match(/^(\d+)([MW])$/);
  if (!match) {
    throw new Error('Invalid schedule format');
  }

  const [, numStr, type] = match;
  const num = parseInt(numStr);

  if (type === 'W') {
    return addWeeks(date, num);
  } else {
    const weekday = getDay(date);
    const nth = getWeekdayOccurrence(date);
    const targetMonth = addMonths(_date, num);
    return getNthWeekdayOfMonth(targetMonth, weekday, nth);
  }
};

/**
 * Finds the previous scheduled date given a starting date and a schedule string.
 *
 * The schedule string should be in the format "{number}{unit}", where unit is "W" for weeks or "M" for months
 * (e.g., "2W" for every 2 weeks, "1M" for every month).
 *
 * For weekly schedules, this function subtracts the specified number of weeks from the given date.
 * For monthly schedules, it finds the same weekday and occurrence (e.g., 2nd Tuesday) in the previous month(s).
 * If the nth occurrence does not exist in the target month, it falls back to the last matching weekday of that month.
 *
 * @param {Date} date - The starting date.
 * @param {string} schedule - The schedule string (e.g., "2W", "1M").
 * @returns {Date} The previous scheduled date according to the schedule.
 * @throws {Error} If the schedule format is invalid.
 */
export const getPreviousScheduledDate = (
  date: Date,
  schedule: string,
): Date => {
  const _date = startOfDay(date); // Normalize

  const match = schedule.match(/^(\d+)([MW])$/);
  if (!match) {
    throw new Error('Invalid schedule format');
  }

  const [, numStr, type] = match;
  const num = parseInt(numStr);

  if (type === 'W') {
    return subWeeks(_date, num);
  } else {
    const weekday = getDay(_date);
    const nth = getWeekdayOccurrence(_date);
    const targetMonth = subMonths(_date, num);
    return getNthWeekdayOfMonth(targetMonth, weekday, nth);
  }
};

/**
 * Finds the earliest next scheduled date among multiple subscription schedules.
 *
 * Given a starting date and multiple schedule strings, this function calculates the next
 * scheduled date for each schedule and returns the earliest (soonest) one.
 * If no schedules are provided, it returns the input date unchanged.
 *
 * This is useful when determining the optimal order date for a new subscription that needs
 * to align with existing delivery schedules—it picks the most frequent upcoming delivery.
 *
 * @param {Date} date - The reference date from which to calculate next scheduled dates.
 * @param {...string[]} schedules - Variable number of schedule strings in the format "{number}{unit}",
 *                                   where unit is "W" for weeks or "M" for months (e.g., "2W", "1M").
 * @returns {Date} The earliest next scheduled date among all provided schedules, or the input date if no schedules are provided.
 * @throws {Error} If any schedule string has an invalid format.
 *
 * @example
 * // Given today is February 20, 2026:
 * const refDate = new Date('2026-02-20');
 * const earliest = getEarliestOrderDate(refDate, '2W', '1M', '3W');
 * // Returns the next date of the soonest schedule (likely '2W' = Feb 27, 2026)
 */
export const getEarliestNextOrderDate = (
  date: Date,
  ...schedules: string[]
): Date => {
  return schedules.length === 0
    ? date
    : schedules
        .map((schedule) => getNextScheduledDate(date, schedule))
        .reduce((earliest, current) =>
          current < earliest ? current : earliest,
        );
};

export const hasExactSchedule = (
  subscriptions: { schedule: string }[],
  schedule: string,
): boolean => {
  return subscriptions.some((sub) => sub.schedule === schedule);
};

export const hasSameUnitSchedule = (
  subscriptions: { schedule: string }[],
  schedule: string,
): boolean => {
  const unit = schedule[schedule.length - 1];
  return subscriptions.some((sub) => sub.schedule.endsWith(unit));
};

export const getNextFormattedSubscriptionScheduledDate = (
  date: string,
  schedule: string,
): string => {
  if (!date || !schedule) {
    throw new Error('Subscription must have orderDate and schedule defined');
  }
  return dateToStr(getNextScheduledDate(strToDate(date), schedule));
};

export const strToDate = (date: string): Date => {
  return startOfDay(parseISO(date));
};

export const dateToStr = (date: Date): string => {
  return format(date, DATE_FORMAT);
};

export const today = (): Date => {
  return startOfDay(new Date());
};
