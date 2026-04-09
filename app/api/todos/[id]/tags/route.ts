import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, tagDB } from '@/lib/db';

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

  const { tag_ids } = await request.json();
  if (!Array.isArray(tag_ids)) {
    return NextResponse.json({ error: 'tag_ids must be an array' }, { status: 400 });
  }

  tagDB.setTodoTags(todo.id, tag_ids);
  const tags = tagDB.findByTodoId(todo.id);
  return NextResponse.json(tags);
}

export async function DELETE(
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

  const url = new URL(request.url);
  const tagId = url.searchParams.get('tagId');
  if (tagId) {
    tagDB.unlinkFromTodo(todo.id, parseInt(tagId));
  }

  const tags = tagDB.findByTodoId(todo.id);
  return NextResponse.json(tags);
}
