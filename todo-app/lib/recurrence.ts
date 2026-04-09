import { toZonedTime } from 'date-fns-tz';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { formatSGTime } from './timezone';

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function calculateNextDueDate(
  currentDueDate: string,
  pattern: RecurrencePattern
): string {
  const date = toZonedTime(new Date(currentDueDate), 'Asia/Singapore');

  let nextDate: Date;
  switch (pattern) {
    case 'daily':
      nextDate = addDays(date, 1);
      break;
    case 'weekly':
      nextDate = addWeeks(date, 1);
      break;
    case 'monthly':
      nextDate = addMonths(date, 1);
      break;
    case 'yearly':
      nextDate = addYears(date, 1);
      break;
    default:
      throw new Error(`Unknown recurrence pattern: ${pattern}`);
  }

  return formatSGTime(nextDate, 'yyyy-MM-dd HH:mm:ss');
}
