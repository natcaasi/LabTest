import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, tagDB, Priority, RecurrencePattern } from '@/lib/db';

function calculateNextDueDate(currentDueDate: string, pattern: RecurrencePattern): string {
  const date = new Date(currentDueDate);
  switch (pattern) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString().slice(0, 16);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.findById(parseInt(id));
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(todo);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todoId = parseInt(id);
  const existing = todoDB.findById(todoId);
  if (!existing || existing.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const { title, completed, due_date, priority, is_recurring, recurrence_pattern, reminder_minutes, tag_ids } = body;

  const validPriorities: Priority[] = ['high', 'medium', 'low'];
  const validPatterns: RecurrencePattern[] = ['daily', 'weekly', 'monthly', 'yearly'];

  // Handle recurring todo completion
  if (completed === 1 && existing.completed === 0 && existing.is_recurring && existing.recurrence_pattern && existing.due_date) {
    const nextDueDate = calculateNextDueDate(existing.due_date, existing.recurrence_pattern as RecurrencePattern);
    const nextTodo = todoDB.create({
      user_id: session.userId,
      title: existing.title,
      due_date: nextDueDate,
      priority: existing.priority,
      is_recurring: 1,
      recurrence_pattern: existing.recurrence_pattern,
      reminder_minutes: existing.reminder_minutes,
    });

    // Copy tags to next instance
    if (existing.tags && existing.tags.length > 0) {
      tagDB.setTodoTags(nextTodo.id, existing.tags.map(t => t.id));
    }
  }

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = typeof title === 'string' ? title.trim() : title;
  if (completed !== undefined) updateData.completed = completed;
  if (due_date !== undefined) updateData.due_date = due_date || null;
  if (priority !== undefined && validPriorities.includes(priority)) updateData.priority = priority;
  if (is_recurring !== undefined) updateData.is_recurring = is_recurring ? 1 : 0;
  if (recurrence_pattern !== undefined) {
    updateData.recurrence_pattern = validPatterns.includes(recurrence_pattern) ? recurrence_pattern : null;
  }
  if (reminder_minutes !== undefined) updateData.reminder_minutes = reminder_minutes ?? null;

  const updated = todoDB.update(todoId, updateData);

  if (tag_ids !== undefined && Array.isArray(tag_ids)) {
    tagDB.setTodoTags(todoId, tag_ids);
  }

  const fullTodo = todoDB.findById(todoId);
  return NextResponse.json(fullTodo);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todoId = parseInt(id);
  const existing = todoDB.findById(todoId);
  if (!existing || existing.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  todoDB.delete(todoId);
  return NextResponse.json({ success: true });
}
