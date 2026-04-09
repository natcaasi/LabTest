import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryAll, execute } from '@/lib/db';
import { toSGTime, formatSGTime, addMinutesToSGDate } from '@/lib/timezone';

interface TodoRow {
  id: number;
  title: string;
  due_date: string;
  reminder_minutes: number;
  last_notification_sent?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const now = toSGTime(new Date());

    const todos = queryAll<TodoRow>(
      `SELECT id, title, due_date, reminder_minutes, last_notification_sent
       FROM todos
       WHERE user_id = ? AND reminder_minutes IS NOT NULL AND due_date IS NOT NULL AND completed = 0`,
      [session.userId]
    );

    const todosToNotify: TodoRow[] = [];

    for (const todo of todos) {
      const dueDate = toSGTime(todo.due_date);
      const reminderTime = addMinutesToSGDate(dueDate, -todo.reminder_minutes);

      const lastNotifStr = todo.last_notification_sent;
      const lastNotif = lastNotifStr ? toSGTime(lastNotifStr) : null;

      if (now >= reminderTime && (!lastNotif || lastNotif < reminderTime)) {
        todosToNotify.push(todo);
        execute('UPDATE todos SET last_notification_sent = ? WHERE id = ?', [
          formatSGTime(now),
          todo.id,
        ]);
      }
    }

    return NextResponse.json(todosToNotify);
  } catch (error) {
    console.error('Check notifications error:', error);
    return NextResponse.json({ error: 'Failed to check notifications' }, { status: 500 });
  }
}
