import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryAll } from '@/lib/db';

export async function GET() {
  try {
    const session = await requireAuth();

    const todos = queryAll(
      `SELECT t.*, GROUP_CONCAT(tg.name, ',') as tag_names
       FROM todos t
       LEFT JOIN todo_tags tt ON t.id = tt.todo_id
       LEFT JOIN tags tg ON tt.tag_id = tg.id
       WHERE t.user_id = ?
       GROUP BY t.id`,
      [session.userId]
    );

    const csvHeader = 'ID,Title,Completed,Due Date,Priority,Recurring,Pattern,Reminder,Tags\n';
    const csvRows = todos
      .map((todo: Record<string, any>) => {
        const escaped = (str: string | null | undefined) => {
          if (!str) return '';
          const s = String(str);
          if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        };

        return [
          todo.id,
          escaped(todo.title),
          todo.completed ? '1' : '0',
          escaped(todo.due_date || ''),
          todo.priority,
          todo.is_recurring ? '1' : '0',
          escaped(todo.recurrence_pattern || ''),
          todo.reminder_minutes || '',
          escaped(todo.tag_names || ''),
        ]
          .join(',');
      })
      .join('\n');

    const csv = csvHeader + csvRows;
    const date = new Date().toISOString().split('T')[0];

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="todos-${date}.csv"`,
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}
