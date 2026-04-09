import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryAll, execute, queryOne } from '@/lib/db';
import { TodoCreateSchema } from '@/lib/validation';
import { formatSGTime } from '@/lib/timezone';

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

interface TagWithName {
  id: number;
  name: string;
  color: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const todos = queryAll<TodoRow>(
      `SELECT * FROM todos WHERE user_id = ? ORDER BY
       CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
       due_date, created_at`,
      [session.userId]
    );

    return NextResponse.json(todos.map(transformTodo));
  } catch (error) {
    console.error('Get todos error:', error);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = TodoCreateSchema.parse(body);

    const now = formatSGTime(new Date());

    const result = execute(
      `INSERT INTO todos (user_id, title, description, priority, due_date, is_recurring, recurrence_pattern, reminder_minutes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.userId,
        data.title,
        data.description || null,
        data.priority,
        data.due_date || null,
        data.is_recurring ? 1 : 0,
        data.recurrence_pattern || null,
        data.reminder_minutes || null,
        now,
        now,
      ]
    );

    const newTodo = queryOne<TodoRow>('SELECT * FROM todos WHERE id = ?', [
      result.lastInsertRowid,
    ]);

    if (!newTodo) {
      throw new Error('Failed to retrieve created todo');
    }

    return NextResponse.json(transformTodo(newTodo), { status: 201 });
  } catch (error) {
    console.error('Create todo error:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}

function transformTodo(row: TodoRow) {
  const tags = queryAll<TagWithName>(
    `SELECT t.id, t.name, t.color FROM tags t
     INNER JOIN todo_tags tt ON t.id = tt.tag_id
     WHERE tt.todo_id = ?`,
    [row.id]
  );

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    due_date: row.due_date,
    completed: row.completed === 1,
    is_recurring: row.is_recurring === 1,
    recurrence_pattern: row.recurrence_pattern,
    reminder_minutes: row.reminder_minutes,
    last_notification_sent: row.last_notification_sent,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tags,
  };
}
