import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, tagDB, subtaskDB, Priority, RecurrencePattern } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const todos = todoDB.findAll(session.userId);
  return NextResponse.json(todos);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { title, due_date, priority, is_recurring, recurrence_pattern, reminder_minutes, tag_ids } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  if (due_date) {
    const dueTime = new Date(due_date).getTime();
    if (isNaN(dueTime) || dueTime < Date.now() + 60000) {
      return NextResponse.json({ error: 'Due date must be at least 1 minute in the future' }, { status: 400 });
    }
  }

  const validPriorities: Priority[] = ['high', 'medium', 'low'];
  const validPatterns: RecurrencePattern[] = ['daily', 'weekly', 'monthly', 'yearly'];

  const todo = todoDB.create({
    user_id: session.userId,
    title: title.trim(),
    due_date: due_date || null,
    priority: validPriorities.includes(priority) ? priority : 'medium',
    is_recurring: is_recurring ? 1 : 0,
    recurrence_pattern: is_recurring && validPatterns.includes(recurrence_pattern) ? recurrence_pattern : null,
    reminder_minutes: reminder_minutes ?? null,
  });

  if (Array.isArray(tag_ids) && tag_ids.length > 0) {
    tagDB.setTodoTags(todo.id, tag_ids);
  }

  const fullTodo = todoDB.findById(todo.id);
  return NextResponse.json(fullTodo, { status: 201 });
}
