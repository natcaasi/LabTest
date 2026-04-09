const SG_TIMEZONE = 'Asia/Singapore';

export function getSingaporeNow(): Date {
  const now = new Date();
  const sgString = now.toLocaleString('en-US', { timeZone: SG_TIMEZONE });
  return new Date(sgString);
}

export function formatSingaporeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-SG', {
    timeZone: SG_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function toSingaporeISO(date: Date): string {
  return date.toLocaleString('sv-SE', { timeZone: SG_TIMEZONE }).replace(' ', 'T');
}

export function getSingaporeDateString(date?: Date): string {
  const d = date || new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SG_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}
