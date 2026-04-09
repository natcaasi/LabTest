import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { subtaskDB, todoDB } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subtaskId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { subtaskId } = await params;
  const subtask = subtaskDB.findById(parseInt(subtaskId));
  if (!subtask) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const todo = todoDB.findById(subtask.todo_id);
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.completed !== undefined) updateData.completed = body.completed;
  if (body.position !== undefined) updateData.position = body.position;

  const updated = subtaskDB.update(parseInt(subtaskId), updateData);
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ subtaskId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { subtaskId } = await params;
  const subtask = subtaskDB.findById(parseInt(subtaskId));
  if (!subtask) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const todo = todoDB.findById(subtask.todo_id);
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  subtaskDB.delete(parseInt(subtaskId));
  return NextResponse.json({ success: true });
}
