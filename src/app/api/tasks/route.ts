import { NextRequest } from 'next/server';
import { db } from '@/db';
import { tasks } from '@/db/schema';

export async function GET() {
  try {
    const allTasks = await db.select().from(tasks);
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

    const [created] = await db.insert(tasks).values(body).returning();
    return Response.json(created, { status: 201 });
  } catch {
    return Response.json(
      { error: 'Failed to create task', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
