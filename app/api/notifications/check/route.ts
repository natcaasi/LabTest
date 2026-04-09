import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const todos = todoDB.findAll(session.userId);
  const now = new Date();

  const dueTodos = todos.filter(todo => {
    if (!todo.due_date || !todo.reminder_minutes || todo.completed) return false;

    const dueDate = new Date(todo.due_date);
    const reminderTime = new Date(dueDate.getTime() - todo.reminder_minutes * 60 * 1000);

    if (now < reminderTime) return false;
    if (now > dueDate) return false;

    if (todo.last_notification_sent) {
      const lastSent = new Date(todo.last_notification_sent);
      const timeSinceNotification = now.getTime() - lastSent.getTime();
      if (timeSinceNotification < 60 * 60 * 1000) return false;
    }

    return true;
  });

  // Mark notifications as sent
  for (const todo of dueTodos) {
    todoDB.update(todo.id, { last_notification_sent: now.toISOString() });
  }

  return NextResponse.json(
    dueTodos.map(t => ({
      id: t.id,
      title: t.title,
      due_date: t.due_date,
      reminder_minutes: t.reminder_minutes,
    }))
  );
}
