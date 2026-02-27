import { db } from '@/db';
import { tasks } from '@/db/schema';
import SceneLoader from '@/components/SceneLoader';

export default async function Home() {
  try {
    const allTasks = await db.select().from(tasks);
    return <SceneLoader initialTasks={allTasks} />;
  } catch (e) {
    console.error('Failed to fetch tasks:', e);
    return <SceneLoader initialTasks={[]} error />;
  }
}
