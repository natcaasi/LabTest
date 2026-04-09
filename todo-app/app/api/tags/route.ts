import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryAll, execute, queryOne } from '@/lib/db';
import { TagSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const tags = queryAll('SELECT * FROM tags WHERE user_id = ? ORDER BY name', [
      session.userId,
    ]);

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = TagSchema.parse(body);

    const existing = queryOne('SELECT * FROM tags WHERE user_id = ? AND name = ?', [
      session.userId,
      data.name,
    ]);

    if (existing) {
      return NextResponse.json({ error: 'Tag already exists' }, { status: 400 });
    }

    const result = execute('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)', [
      session.userId,
      data.name,
      data.color,
    ]);

    const tag = queryOne('SELECT * FROM tags WHERE id = ?', [result.lastInsertRowid]);

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Create tag error:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
