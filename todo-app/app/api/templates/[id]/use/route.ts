import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryOne, execute, transaction } from '@/lib/db';
import { addDaysToSGDate, formatSGTime } from '@/lib/timezone';

interface Template {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  category?: string;
  title: string;
  priority: string;
  due_date_offset_days: number;
  subtasks_json?: string;
  tag_ids?: string;
  created_at: string;
  updated_at: string;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const template = queryOne<Template>('SELECT * FROM templates WHERE id = ? AND user_id = ?', [
      id,
      session.userId,
    ]);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const now = formatSGTime(new Date());
    const dueDate = template.due_date_offset_days > 0
      ? formatSGTime(addDaysToSGDate(new Date(), template.due_date_offset_days))
      : null;

    let newTodo;

    transaction(() => {
      const result = execute(
        `INSERT INTO todos (user_id, title, description, priority, due_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [session.userId, template.title, template.description || '', template.priority, dueDate, now, now]
      );

      const newTodoId = result.lastInsertRowid;

      // Create subtasks from serialized JSON
      if (template.subtasks_json) {
        try {
          const subtasks = JSON.parse(template.subtasks_json);
          for (const subtask of subtasks) {
            execute(
              'INSERT INTO subtasks (todo_id, title, completed, position) VALUES (?, ?, ?, ?)',
              [newTodoId, subtask.title, subtask.completed || 0, subtask.position || 0]
            );
          }
        } catch (parseError) {
          console.error('Failed to parse subtasks JSON:', parseError);
        }
      }

      // Copy tags from template
      if (template.tag_ids) {
        try {
          const tagIds = JSON.parse(template.tag_ids);
          for (const tagId of tagIds) {
            execute('INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)', [newTodoId, tagId]);
          }
        } catch (parseError) {
          console.error('Failed to parse tag IDs:', parseError);
        }
      }

      newTodo = queryOne('SELECT * FROM todos WHERE id = ?', [newTodoId]);
    });

    return NextResponse.json(newTodo, { status: 201 });
  } catch (error) {
    console.error('Use template error:', error);
    return NextResponse.json({ error: 'Failed to use template' }, { status: 500 });
  }
}
