import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { getRequiredUserId } from '@/lib/auth-helpers';

const UPDATABLE_FIELDS = [
  'title',
  'rawInput',
  'targetDateEarliest',
  'targetDateLatest',
  'hardDeadline',
  'needsRefinement',
  'refinementPrompt',
  'status',
  'driftCount',
  'tags',
] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getRequiredUserId();
  if (userId instanceof Response) return userId;

  try {
    const { id } = await params;
    const [task] = await db.select().from(tasks).where(
      and(eq(tasks.id, id), eq(tasks.userId, userId)),
    );

    if (!task) {
      return Response.json(
        { error: 'Task not found', code: 'TASK_NOT_FOUND' },
        { status: 404 },
      );
    }

    return Response.json(task);
  } catch {
    return Response.json(
      { error: 'Failed to fetch task', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getRequiredUserId();
  if (userId instanceof Response) return userId;

  try {
    const { id } = await params;
    const body = await request.json();

    const updateFields: Record<string, unknown> = {};
    for (const key of UPDATABLE_FIELDS) {
      if (key in body) {
        updateFields[key] = body[key];
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return Response.json(
        { error: 'No valid fields to update', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(tasks)
      .set(updateFields)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (!updated) {
      return Response.json(
        { error: 'Task not found', code: 'TASK_NOT_FOUND' },
        { status: 404 },
      );
    }

    return Response.json(updated);
  } catch {
    return Response.json(
      { error: 'Failed to update task', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getRequiredUserId();
  if (userId instanceof Response) return userId;

  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (!deleted) {
      return Response.json(
        { error: 'Task not found', code: 'TASK_NOT_FOUND' },
        { status: 404 },
      );
    }

    return Response.json(deleted);
  } catch {
    return Response.json(
      { error: 'Failed to delete task', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
