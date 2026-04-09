import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const tag = tagDB.findById(parseInt(id));
  if (!tag || tag.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, string> = {};
  if (body.name !== undefined) updateData.name = body.name.trim();
  if (body.color !== undefined) updateData.color = body.color;

  try {
    const updated = tagDB.update(parseInt(id), updateData);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Tag name already exists' }, { status: 409 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const tag = tagDB.findById(parseInt(id));
  if (!tag || tag.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  tagDB.delete(parseInt(id));
  return NextResponse.json({ success: true });
}
