import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const template = templateDB.findById(parseInt(id));
  if (!template || template.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const updated = templateDB.update(parseInt(id), body);
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const template = templateDB.findById(parseInt(id));
  if (!template || template.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  templateDB.delete(parseInt(id));
  return NextResponse.json({ success: true });
}
