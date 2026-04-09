import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, subtaskDB, tagDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'json';

  const todos = todoDB.findAll(session.userId);

  if (format === 'csv') {
    const header = 'ID,Title,Completed,Due Date,Priority,Recurring,Pattern,Reminder';
    const rows = todos.map(t =>
      [
        t.id,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        t.completed ? 'true' : 'false',
        t.due_date || '',
        t.priority,
        t.is_recurring ? 'true' : 'false',
        t.recurrence_pattern || '',
        t.reminder_minutes ?? '',
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="todos-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  // JSON export with nested data, version field, and all tags
  const allTags = tagDB.findAll(session.userId);
  const enrichedTodos = todos.map(todo => ({
    ...todo,
    subtasks: subtaskDB.findByTodoId(todo.id),
    tags: tagDB.findByTodoId(todo.id),
  }));

  const exportData = {
    version: 1,
    exported_at: new Date().toISOString(),
    tags: allTags,
    todos: enrichedTodos,
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="todos-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}
