import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { format, parse } from 'date-fns';

const SG_TIMEZONE = 'Asia/Singapore';

export function getSigningTimeZone(): string {
  return SG_TIMEZONE;
}

export function getCurrentTime(): Date {
  return new Date();
}

export function toSGTime(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(d, SG_TIMEZONE);
}

export function formatSGTime(
  date: Date | string,
  formatStr: string = 'yyyy-MM-dd HH:mm:ss'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, SG_TIMEZONE, formatStr);
}

export function formatSGDate(date: Date | string): string {
  return formatSGTime(date, 'yyyy-MM-dd');
}

export function formatSGTimeShort(date: Date | string): string {
  return formatSGTime(date, 'HH:mm');
}

export function parseSGDate(dateStr: string): Date {
  const d = parse(dateStr, 'yyyy-MM-dd', new Date());
  return toZonedTime(d, SG_TIMEZONE);
}

export function isSGToday(date: Date | string): boolean {
  const d = toSGTime(typeof date === 'string' ? new Date(date) : date);
  const today = toSGTime(new Date());
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export function isSGPast(date: Date | string): boolean {
  const d = toSGTime(typeof date === 'string' ? new Date(date) : date);
  const now = toSGTime(new Date());
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dDate < nowDate;
}

export function addMinutesToSGDate(date: Date | string, minutes: number): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.getTime() + minutes * 60 * 1000);
}

export function addDaysToSGDate(date: Date | string, days: number): Date {
  const d = toSGTime(typeof date === 'string' ? new Date(date) : date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getRelativeDueLabel(
  dueDate: string
): { label: string; colorClass: string } {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMs < 0) {
    const absMins = Math.abs(diffMins);
    const absHours = Math.abs(diffHours);
    const absDays = Math.abs(diffDays);

    if (absMins < 60) {
      return {
        label: `${absMins} minutes overdue`,
        colorClass: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
      };
    }
    if (absHours < 24) {
      return {
        label: `${absDays} ${absDays === 1 ? 'day' : 'days'} overdue`,
        colorClass: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
      };
    }
    return {
      label: `${absDays} ${absDays === 1 ? 'day' : 'days'} overdue`,
      colorClass: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
    };
  }

  if (diffMins < 60) {
    return {
      label: `Due in ${diffMins} minutes`,
      colorClass: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
    };
  }

  if (diffHours < 24) {
    const mins = diffMins % 60;
    const timeStr = `${diffHours}h ${mins}m`;
    return {
      label: `Due in ${timeStr}`,
      colorClass: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30',
    };
  }

  if (diffDays < 7) {
    const dateStr = formatSGTime(due, 'MMM d');
    return {
      label: `Due in ${diffDays} ${diffDays === 1 ? 'day' : 'days'} (${dateStr})`,
      colorClass: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30',
    };
  }

  return {
    label: formatSGTime(due, 'yyyy-MM-dd HH:mm'),
    colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
  };
}
