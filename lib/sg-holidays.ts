import { queryAll } from './db';

export interface Holiday {
  id: number;
  date: string;
  name: string;
  is_sg_public: number;
}

export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`;

  return queryAll<Holiday>(
    'SELECT * FROM holidays WHERE date >= ? AND date <= ? ORDER BY date',
    [monthStart, monthEnd]
  );
}

export function isHoliday(dateStr: string): boolean {
  const holiday = queryAll<Holiday>('SELECT * FROM holidays WHERE date = ?', [dateStr]);
  return holiday.length > 0;
}

export function getHolidayName(dateStr: string): string | null {
  const holiday = queryAll<Holiday>('SELECT * FROM holidays WHERE date = ?', [dateStr]);
  return holiday.length > 0 ? holiday[0].name : null;
}
