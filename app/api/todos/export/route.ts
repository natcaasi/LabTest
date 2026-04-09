import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryAll } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const todos = queryAll('SELECT * FROM todos WHERE user_id = ?', [session.userId]);
    const subtasks = queryAll(
      'SELECT s.* FROM subtasks s JOIN todos t ON s.todo_id = t.id WHERE t.user_id = ?',
      [session.userId]
    );
    const tags = queryAll('SELECT * FROM tags WHERE user_id = ?', [session.userId]);
    const todo_tags = queryAll(
      'SELECT tt.* FROM todo_tags tt JOIN todos t ON tt.todo_id = t.id WHERE t.user_id = ?',
      [session.userId]
    );

    const data = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      todos,
      subtasks,
      tags,
      todo_tags,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
