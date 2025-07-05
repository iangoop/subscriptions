import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfDay,
  startOfMonth,
  subMonths,
  subWeeks,
} from 'date-fns';
import { DATE_FORMAT } from '../db/subscriptions';

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
 * Finds the next scheduled date given a starting date and schedule string.
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
 * Finds the previous scheduled date given a starting date and schedule string.
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

export const strToDate = (date: string): Date => {
  return startOfDay(parseISO(date));
};

export const dateToStr = (date: Date): string => {
  return format(date, DATE_FORMAT);
};
