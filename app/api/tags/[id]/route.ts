import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';
import { TagSchema } from '@/lib/validation';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const data = TagSchema.parse(body);

    const tag = queryOne('SELECT * FROM tags WHERE id = ? AND user_id = ?', [
      id,
      session.userId,
    ]);

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    execute('UPDATE tags SET name = ?, color = ? WHERE id = ?', [data.name, data.color, id]);

    const updated = queryOne('SELECT * FROM tags WHERE id = ?', [id]);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update tag error:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const tag = queryOne('SELECT * FROM tags WHERE id = ? AND user_id = ?', [
      id,
      session.userId,
    ]);

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    execute('DELETE FROM tags WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete tag error:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
