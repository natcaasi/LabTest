import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryOne, execute, queryAll, transaction } from '@/lib/db';
import { TodoUpdateSchema } from '@/lib/validation';
import { formatSGTime } from '@/lib/timezone';
import { calculateNextDueDate } from '@/lib/recurrence';

interface TodoRow {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  priority: string;
  due_date?: string;
  completed: number;
  is_recurring: number;
  recurrence_pattern?: string;
  reminder_minutes?: number;
  last_notification_sent?: string;
  created_at: string;
  updated_at: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const todo = queryOne<TodoRow>(
      'SELECT * FROM todos WHERE id = ? AND user_id = ?',
      [id, session.userId]
    );

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json(todo);
  } catch (error) {
    console.error('Get todo error:', error);
    return NextResponse.json({ error: 'Failed to fetch todo' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const data = TodoUpdateSchema.parse(body);

    const todo = queryOne<TodoRow>('SELECT * FROM todos WHERE id = ? AND user_id = ?', [
      id,
      session.userId,
    ]);

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.priority !== undefined) {
      updates.push('priority = ?');
      values.push(data.priority);
    }
    if (data.due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(data.due_date);
    }
    if (data.completed !== undefined) {
      updates.push('completed = ?');
      values.push(data.completed ? 1 : 0);
    }
    if (data.is_recurring !== undefined) {
      updates.push('is_recurring = ?');
      values.push(data.is_recurring ? 1 : 0);
    }
    if (data.recurrence_pattern !== undefined) {
      updates.push('recurrence_pattern = ?');
      values.push(data.recurrence_pattern);
    }
    if (data.reminder_minutes !== undefined) {
      updates.push('reminder_minutes = ?');
      values.push(data.reminder_minutes);
    }

    updates.push('updated_at = ?');
    values.push(formatSGTime(new Date()));
    values.push(id);
    values.push(session.userId);

    const sql = `UPDATE todos SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
    execute(sql, values);

    const updated = queryOne('SELECT * FROM todos WHERE id = ?', [id]);

    // Handle recurring todo: if marking as completed and it's recurring, create next instance
    if (
      data.completed === true &&
      todo.is_recurring &&
      todo.recurrence_pattern &&
      todo.due_date
    ) {
      transaction(() => {
        const nextDueDate = calculateNextDueDate(todo.due_date, todo.recurrence_pattern as 'daily' | 'weekly' | 'monthly' | 'yearly');

        // Get tags for this todo
        const tags = queryAll(
          'SELECT tag_id FROM todo_tags WHERE todo_id = ?',
          [todo.id]
        ) as Array<{ tag_id: number }>;

        // Create new recurring instance
        const now = formatSGTime(new Date());
        const result = execute(
          `INSERT INTO todos (user_id, title, description, priority, due_date, is_recurring, recurrence_pattern, reminder_minutes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            session.userId,
            todo.title,
            todo.description || null,
            todo.priority,
            nextDueDate,
            1,
            todo.recurrence_pattern,
            todo.reminder_minutes || null,
            now,
            now,
          ]
        );

        const newTodoId = result.lastInsertRowid;

        // Copy tags
        for (const tag of tags) {
          execute('INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)', [
            newTodoId,
            tag.tag_id,
          ]);
        }
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update todo error:', error);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const todo = queryOne<TodoRow>('SELECT * FROM todos WHERE id = ? AND user_id = ?', [
      id,
      session.userId,
    ]);

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    execute('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, session.userId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete todo error:', error);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}
