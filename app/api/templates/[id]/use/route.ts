import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB, todoDB, subtaskDB } from '@/lib/db';

export async function POST(
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

  const body = await request.json().catch(() => ({}));
  const dueDate = body.due_date || null;

  const todo = todoDB.create({
    user_id: session.userId,
    title: template.title_template,
    due_date: dueDate,
    priority: template.priority,
    is_recurring: template.is_recurring,
    recurrence_pattern: template.recurrence_pattern,
    reminder_minutes: template.reminder_minutes,
  });

  // Create subtasks from template JSON
  if (template.subtasks_json) {
    try {
      const subtasks = JSON.parse(template.subtasks_json) as Array<{ title: string; position: number }>;
      for (const sub of subtasks) {
        subtaskDB.create({
          todo_id: todo.id,
          title: sub.title,
          position: sub.position ?? 0,
        });
      }
    } catch {
      // invalid JSON, skip subtasks
    }
  }

  const fullTodo = todoDB.findById(todo.id);
  return NextResponse.json(fullTodo, { status: 201 });
}
