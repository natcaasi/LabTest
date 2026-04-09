import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';
import { SubtaskUpdateSchema } from '@/lib/validation';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const data = SubtaskUpdateSchema.parse(body);

    const subtask = queryOne('SELECT s.* FROM subtasks s JOIN todos t ON s.todo_id = t.id WHERE s.id = ? AND t.user_id = ?', [
      id,
      session.userId,
    ]);

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.completed !== undefined) {
      updates.push('completed = ?');
      values.push(data.completed ? 1 : 0);
    }
    if (data.position !== undefined) {
      updates.push('position = ?');
      values.push(data.position);
    }

    if (updates.length === 0) {
      return NextResponse.json(subtask);
    }

    values.push(id);

    const sql = `UPDATE subtasks SET ${updates.join(', ')} WHERE id = ?`;
    execute(sql, values);

    const updated = queryOne('SELECT * FROM subtasks WHERE id = ?', [id]);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update subtask error:', error);
    return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const subtask = queryOne('SELECT s.* FROM subtasks s JOIN todos t ON s.todo_id = t.id WHERE s.id = ? AND t.user_id = ?', [
      id,
      session.userId,
    ]);

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    execute('DELETE FROM subtasks WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete subtask error:', error);
    return NextResponse.json({ error: 'Failed to delete subtask' }, { status: 500 });
  }
}
