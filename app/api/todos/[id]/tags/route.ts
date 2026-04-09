import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryOne, execute, queryAll } from '@/lib/db';
import { z } from 'zod';

const postBodySchema = z.object({
  tag_id: z.number().optional(),
  tag_ids: z.array(z.number()).optional(),
});

const deleteBodySchema = z.object({
  tag_ids: z.array(z.number()),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const todo = queryOne('SELECT * FROM todos WHERE id = ? AND user_id = ?', [
      id,
      session.userId,
    ]);

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    const tags = queryAll(
      'SELECT t.* FROM tags t JOIN todo_tags tt ON t.id = tt.tag_id WHERE tt.todo_id = ?',
      [id]
    );

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Get todo tags error:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const { tag_id, tag_ids } = postBodySchema.parse(body);

    const todo = queryOne('SELECT * FROM todos WHERE id = ? AND user_id = ?', [
      id,
      session.userId,
    ]);

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    const tagsToAdd = tag_ids || (tag_id ? [tag_id] : []);

    for (const tid of tagsToAdd) {
      const tag = queryOne('SELECT * FROM tags WHERE id = ? AND user_id = ?', [
        tid,
        session.userId,
      ]);

      if (tag) {
        execute('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)', [id, tid]);
      }
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Add tag to todo error:', error);
    return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const todo = queryOne('SELECT * FROM todos WHERE id = ? AND user_id = ?', [
      id,
      session.userId,
    ]);

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    const body = await request.json();
    const { tag_ids } = deleteBodySchema.parse(body);

    for (const tag_id of tag_ids) {
      execute('DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?', [id, tag_id]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove tag from todo error:', error);
    return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 });
  }
}
