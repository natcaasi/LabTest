import { NextRequest, NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const holidays = queryAll('SELECT * FROM holidays ORDER BY date');

    return NextResponse.json(holidays);
  } catch (error) {
    console.error('Get holidays error:', error);
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
  }
}
