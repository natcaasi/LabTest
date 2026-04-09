import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { holidayDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const url = new URL(request.url);
  const year = url.searchParams.get('year');
  const month = url.searchParams.get('month');

  if (year && month) {
    const holidays = holidayDB.findByMonth(parseInt(year), parseInt(month));
    return NextResponse.json(holidays);
  }

  const holidays = holidayDB.findAll();
  return NextResponse.json(holidays);
}
