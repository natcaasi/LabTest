import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryAll, execute, queryOne } from '@/lib/db';
import { TemplateSchema } from '@/lib/validation';
import { formatSGTime } from '@/lib/timezone';

interface TodoRow {
  id: number;
  title: string;
  description?: string;
  priority: string;
}

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

export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth();

    const templates = queryAll<Template>('SELECT * FROM templates WHERE user_id = ? ORDER BY name', [
      session.userId,
    ]);

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = TemplateSchema.parse(body);

    // Extract the todo id and fetch full todo data if creating from existing
    const todoId = body.todo_id;
    let subtasksJson: string | null = null;
    let tagIds: string | null = null;
    let todoData = {
      title: body.title || 'Template Todo',
      description: body.description || '',
      priority: body.priority || 'medium',
    };

    if (todoId) {
      const todo = queryOne<TodoRow>('SELECT * FROM todos WHERE id = ? AND user_id = ?', [
        todoId,
        session.userId,
      ]);

      if (todo) {
        todoData = {
          title: todo.title,
          description: todo.description || '',
          priority: todo.priority,
        };

        // Fetch and serialize subtasks
        const subtasks = queryAll('SELECT id, title, completed, position FROM subtasks WHERE todo_id = ?', [
          todoId,
        ]) as Array<{
          id: number;
          title: string;
          completed: number;
          position: number;
        }>;

        if (subtasks.length > 0) {
          subtasksJson = JSON.stringify(subtasks);
        }

        // Fetch tag ids
        const tags = queryAll(
          'SELECT tag_id FROM todo_tags WHERE todo_id = ?',
          [todoId]
        ) as Array<{ tag_id: number }>;

        if (tags.length > 0) {
          tagIds = JSON.stringify(tags.map((t) => t.tag_id));
        }
      }
    }

    const now = formatSGTime(new Date());

    const result = execute(
      `INSERT INTO templates (user_id, name, description, category, title, priority, due_date_offset_days, subtasks_json, tag_ids, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.userId,
        data.name,
        data.description || null,
        data.category || null,
        todoData.title,
        todoData.priority,
        data.due_date_offset_days,
        subtasksJson,
        tagIds,
        now,
        now,
      ]
    );

    const template = queryOne<Template>('SELECT * FROM templates WHERE id = ?', [result.lastInsertRowid]);

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
