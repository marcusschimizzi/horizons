import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { tasks } from '@/db/schema';

export async function GET() {
  try {
    const allTasks = await db.select().from(tasks).where(eq(tasks.status, 'active'));
    return Response.json(allTasks);
  } catch {
    return Response.json(
      { error: 'Failed to fetch tasks', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (
      !body.title ||
      typeof body.title !== 'string' ||
      !body.title.trim() ||
      !body.rawInput ||
      typeof body.rawInput !== 'string' ||
      !body.rawInput.trim()
    ) {
      return Response.json(
        { error: 'title and rawInput are required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(tasks)
      .values({
        title: body.title.trim(),
        rawInput: body.rawInput.trim(),
        targetDateEarliest: body.targetDateEarliest ? new Date(body.targetDateEarliest) : null,
        targetDateLatest: body.targetDateLatest ? new Date(body.targetDateLatest) : null,
        needsRefinement: body.needsRefinement ?? false,
        tags: body.tags ?? null,
        status: body.status ?? 'active',
      })
      .returning();
    return Response.json(created, { status: 201 });
  } catch {
    return Response.json(
      { error: 'Failed to create task', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
