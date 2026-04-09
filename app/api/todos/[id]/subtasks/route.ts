import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, subtaskDB } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.findById(parseInt(id));
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const subtasks = subtaskDB.findByTodoId(todo.id);
  return NextResponse.json(subtasks);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const todo = todoDB.findById(parseInt(id));
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { title } = await request.json();
  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const subtask = subtaskDB.create({ todo_id: todo.id, title: title.trim() });
  return NextResponse.json(subtask, { status: 201 });
}
