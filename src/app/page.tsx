import { redirect } from 'next/navigation';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { and, eq, lt, isNotNull, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import SceneLoader from '@/components/SceneLoader';

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;

  try {
    const now = new Date();

    // Increment driftCount for active tasks whose horizon window has passed.
    // Also advance targetDateLatest to prevent double-counting on next refresh.
    const drifted = await db.update(tasks)
      .set({
        driftCount: sql`${tasks.driftCount} + 1`,
        targetDateLatest: sql`NOW() + GREATEST(
          (${tasks.targetDateLatest} - ${tasks.targetDateEarliest}),
          INTERVAL '7 days'
        )`,
        targetDateEarliest: sql`NOW()`,
      })
      .where(and(
        eq(tasks.userId, userId),
        eq(tasks.status, 'active'),
        isNotNull(tasks.targetDateLatest),
        lt(tasks.targetDateLatest, now),
      ))
      .returning();

    // Auto-flag needsRefinement for tasks that just hit 3+ drifts
    if (drifted.length > 0) {
      const newlyHighDrift = drifted.filter(t => t.driftCount >= 3 && !t.needsRefinement);
      if (newlyHighDrift.length > 0) {
        await db.update(tasks)
          .set({ needsRefinement: true })
          .where(
            sql`${tasks.id} IN (${sql.join(newlyHighDrift.map(t => sql`${t.id}`), sql`, `)})`
          );
      }
    }

    const allTasks = await db.select().from(tasks).where(
      and(eq(tasks.userId, userId), eq(tasks.status, 'active')),
    );
    return (
      <SceneLoader
        initialTasks={allTasks}
        driftSummary={drifted.length > 0 ? { count: drifted.length } : null}
        user={{ name: session.user.name, email: session.user.email }}
      />
    );
  } catch (e) {
    console.error('Failed to fetch tasks:', e);
    return <SceneLoader initialTasks={[]} error />;
  }
}
