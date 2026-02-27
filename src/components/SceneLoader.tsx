'use client';

import dynamic from 'next/dynamic';
import { TaskStoreProvider } from '@/stores/task-store';
import type { TaskRow } from '@/types/task';

// ---------------------------------------------------------------------------
// Dynamic import: prevents WebGL/Canvas code from running during SSR
// ---------------------------------------------------------------------------

const HorizonScene = dynamic(() => import('./HorizonScene'), {
  ssr: false,
  loading: () => <LoadingState />,
});

// ---------------------------------------------------------------------------
// Internal UI states
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="h-screen w-screen bg-bg-primary animate-pulse" />
  );
}

function ErrorState() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-bg-primary">
      <div className="flex flex-col items-center gap-4">
        <p className="text-text-primary text-sm">
          Couldn&apos;t load tasks. Try refreshing.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded border border-text-secondary/30 px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:border-text-primary/50 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SceneLoader — client boundary component
// ---------------------------------------------------------------------------

interface SceneLoaderProps {
  initialTasks: TaskRow[];
  error?: boolean;
}

export default function SceneLoader({ initialTasks, error }: SceneLoaderProps) {
  if (error) {
    return <ErrorState />;
  }

  return (
    <TaskStoreProvider initialTasks={initialTasks}>
      <div className="h-screen w-screen overflow-hidden">
        <HorizonScene />
      </div>
    </TaskStoreProvider>
  );
}
