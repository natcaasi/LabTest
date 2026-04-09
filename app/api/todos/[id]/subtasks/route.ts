import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryOne, execute, queryAll } from '@/lib/db';
import { SubtaskCreateSchema } from '@/lib/validation';

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

    const subtasks = queryAll('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position', [id]);

    return NextResponse.json(subtasks);
  } catch (error) {
    console.error('Get subtasks error:', error);
    return NextResponse.json({ error: 'Failed to fetch subtasks' }, { status: 500 });
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
    const data = SubtaskCreateSchema.parse(body);

    const todo = queryOne('SELECT * FROM todos WHERE id = ? AND user_id = ?', [
      id,
      session.userId,
    ]);

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    const maxPosition = queryOne<{ max_pos: number }>(
      'SELECT MAX(position) as max_pos FROM subtasks WHERE todo_id = ?',
      [id]
    );

    const position = (maxPosition?.max_pos ?? -1) + 1;

    const result = execute(
      'INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)',
      [id, data.title, position]
    );

    const subtask = queryOne('SELECT * FROM subtasks WHERE id = ?', [result.lastInsertRowid]);

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    console.error('Create subtask error:', error);
    return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 });
  }
}
