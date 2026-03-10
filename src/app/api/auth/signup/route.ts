import { NextRequest } from 'next/server';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return Response.json(
        { error: 'Valid email is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return Response.json(
        { error: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    // Check for existing user
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));

    if (existing) {
      return Response.json(
        { error: 'An account with this email already exists', code: 'CONFLICT' },
        { status: 409 },
      );
    }

    const hashedPassword = await hash(password, 12);

    const [created] = await db
      .insert(users)
      .values({
        name: name?.trim() || null,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
      })
      .returning({ id: users.id, email: users.email, name: users.name });

    return Response.json(created, { status: 201 });
  } catch {
    return Response.json(
      { error: 'Failed to create account', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
