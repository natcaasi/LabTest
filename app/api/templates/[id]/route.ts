import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { queryOne, execute } from '@/lib/db';
import { TemplateSchema } from '@/lib/validation';
import { formatSGTime } from '@/lib/timezone';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const data = TemplateSchema.parse(body);

    const template = queryOne('SELECT * FROM templates WHERE id = ? AND user_id = ?', [
      id,
      session.userId,
    ]);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const now = formatSGTime(new Date());

    execute(
      'UPDATE templates SET name = ?, description = ?, category = ?, due_date_offset_days = ?, updated_at = ? WHERE id = ?',
      [data.name, data.description || null, data.category || null, data.due_date_offset_days, now, id]
    );

    const updated = queryOne('SELECT * FROM templates WHERE id = ?', [id]);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const template = queryOne('SELECT * FROM templates WHERE id = ? AND user_id = ?', [
      id,
      session.userId,
    ]);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    execute('DELETE FROM templates WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
