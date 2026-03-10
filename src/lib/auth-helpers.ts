import 'server-only';
import { auth } from '@/lib/auth';

/**
 * Get the authenticated user's ID, or return a 401 Response.
 * Use in API route handlers: `const userId = await getRequiredUserId(); if (userId instanceof Response) return userId;`
 */
export async function getRequiredUserId(): Promise<string | Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(
      { error: 'Authentication required', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }
  return session.user.id;
}
