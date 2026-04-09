import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { execute, queryOne, transaction } from '@/lib/db';
import { ExportedDataSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const data = ExportedDataSchema.parse(body);

    const result = transaction(() => {
      const idMap = new Map<number, number>();

      for (const todo of data.todos) {
        const result = execute(
          `INSERT INTO todos (user_id, title, description, priority, due_date, completed, is_recurring, recurrence_pattern, reminder_minutes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            session.userId,
            todo.title,
            todo.description,
            todo.priority,
            todo.due_date,
            todo.completed,
            todo.is_recurring,
            todo.recurrence_pattern,
            todo.reminder_minutes,
            todo.created_at,
            todo.updated_at,
          ]
        );

        idMap.set(todo.id, Number(result.lastInsertRowid));
      }

      const tagIdMap = new Map<number, number>();

      for (const tag of data.tags) {
        const existing = queryOne(
          'SELECT id FROM tags WHERE user_id = ? AND name = ?',
          [session.userId, tag.name]
        );

        if (existing) {
          tagIdMap.set(tag.id, existing.id);
        } else {
          const result = execute('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)', [
            session.userId,
            tag.name,
            tag.color,
          ]);

          tagIdMap.set(tag.id, Number(result.lastInsertRowid));
        }
      }

      for (const subtask of data.subtasks) {
        const newTodoId = idMap.get(subtask.todo_id);
        if (newTodoId) {
          execute(
            'INSERT INTO subtasks (todo_id, title, completed, position) VALUES (?, ?, ?, ?)',
            [newTodoId, subtask.title, subtask.completed, subtask.position]
          );
        }
      }

      for (const todo_tag of data.todo_tags) {
        const newTodoId = idMap.get(todo_tag.todo_id);
        const newTagId = tagIdMap.get(todo_tag.tag_id);

        if (newTodoId && newTagId) {
          execute('INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)', [newTodoId, newTagId]);
        }
      }

      return {
        todos_imported: data.todos.length,
        tags_imported: data.tags.length,
        subtasks_imported: data.subtasks.length,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to import data' }, { status: 500 });
  }
}
