import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, subtaskDB, tagDB, Priority, RecurrencePattern } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let todos: unknown[];
  let importedTags: unknown[] = [];
  try {
    const body = await request.json();
    // Support both formats: plain array (legacy) and { version, todos, tags } object
    if (Array.isArray(body)) {
      todos = body;
    } else if (body && Array.isArray(body.todos)) {
      todos = body.todos;
      if (Array.isArray(body.tags)) importedTags = body.tags;
    } else {
      return NextResponse.json({ error: 'Invalid format: expected array or { version, todos, tags }' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
  }

  const validPriorities: Priority[] = ['high', 'medium', 'low'];
  let importedCount = 0;

  // Build tag ID mapping: old tag id -> new tag id
  // Resolve conflicts by reusing existing tags with the same name
  const existingTags = tagDB.findAll(session.userId);
  const tagIdMap = new Map<number, number>();

  for (const rawTag of importedTags) {
    const tag = rawTag as Record<string, unknown>;
    if (!tag.name || typeof tag.name !== 'string') continue;
    const oldId = tag.id as number;
    const existing = existingTags.find(t => t.name.toLowerCase() === (tag.name as string).toLowerCase());
    if (existing) {
      tagIdMap.set(oldId, existing.id);
    }
    // Skip tags that don't exist (were deleted) — don't recreate them
  }

  for (const item of todos) {
    const todo = item as Record<string, unknown>;
    if (!todo.title || typeof todo.title !== 'string') continue;

    const newTodo = todoDB.create({
      user_id: session.userId,
      title: (todo.title as string).trim(),
      due_date: (todo.due_date as string) || null,
      priority: validPriorities.includes(todo.priority as Priority) ? (todo.priority as Priority) : 'medium',
      is_recurring: todo.is_recurring ? 1 : 0,
      recurrence_pattern: (todo.recurrence_pattern as RecurrencePattern) || null,
      reminder_minutes: (todo.reminder_minutes as number) ?? null,
    });

    // Re-create subtasks if present
    if (Array.isArray(todo.subtasks)) {
      for (const sub of todo.subtasks as Array<Record<string, unknown>>) {
        if (sub.title && typeof sub.title === 'string') {
          subtaskDB.create({
            todo_id: newTodo.id,
            title: sub.title,
            position: (sub.position as number) ?? 0,
          });
        }
      }
    }

    // Re-create tag associations
    if (Array.isArray(todo.tags)) {
      const newTagIds: number[] = [];
      for (const rawTag of todo.tags as Array<Record<string, unknown>>) {
        const oldTagId = rawTag.id as number;
        const mappedId = tagIdMap.get(oldTagId);
        if (mappedId) {
          newTagIds.push(mappedId);
        } else if (rawTag.name && typeof rawTag.name === 'string') {
          // Tag wasn't in top-level tags list — resolve by name, skip if deleted
          const existing = existingTags.find(t => t.name.toLowerCase() === (rawTag.name as string).toLowerCase());
          if (existing) {
            newTagIds.push(existing.id);
          }
        }
      }
      if (newTagIds.length > 0) {
        tagDB.setTodoTags(newTodo.id, newTagIds);
      }
    }

    importedCount++;
  }

  return NextResponse.json({ message: `Successfully imported ${importedCount} todos`, count: importedCount });
}
