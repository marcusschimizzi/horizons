'use client';

import { createContext, useContext, useRef, type ReactNode } from 'react';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { TaskRow, Task, DateRange } from '@/types/task';
import { type Horizon, getHorizon } from '@/lib/horizons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskState {
  tasks: TaskRow[];
}

interface TaskActions {
  setTasks: (tasks: TaskRow[]) => void;
  addTask: (task: TaskRow) => void;
  updateTask: (id: string, updates: Partial<TaskRow>) => void;
  removeTask: (id: string) => void;
  refresh: () => Promise<void>;
}

type TaskStore = TaskState & TaskActions;

// ---------------------------------------------------------------------------
// Date deserialization helper (for API responses with ISO strings)
// ---------------------------------------------------------------------------

export function deserializeTask(raw: Record<string, unknown>): TaskRow {
  return {
    ...raw,
    targetDateEarliest: raw.targetDateEarliest
      ? new Date(raw.targetDateEarliest as string)
      : null,
    targetDateLatest: raw.targetDateLatest
      ? new Date(raw.targetDateLatest as string)
      : null,
    hardDeadline: raw.hardDeadline
      ? new Date(raw.hardDeadline as string)
      : null,
    createdAt: new Date(raw.createdAt as string),
    updatedAt: new Date(raw.updatedAt as string),
  } as TaskRow;
}

// ---------------------------------------------------------------------------
// Store factory (vanilla createStore for Next.js App Router safety)
// ---------------------------------------------------------------------------

function createTaskStore(initialTasks: TaskRow[]) {
  return createStore<TaskStore>()((set) => ({
    tasks: initialTasks,

    setTasks: (tasks: TaskRow[]) => set({ tasks }),

    addTask: (task: TaskRow) =>
      set((state) => ({ tasks: [...state.tasks, task] })),

    updateTask: (id: string, updates: Partial<TaskRow>) =>
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, ...updates } : t,
        ),
      })),

    removeTask: (id: string) =>
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      })),

    refresh: async () => {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
      const rawTasks: Record<string, unknown>[] = await res.json();
      const tasks = rawTasks.map(deserializeTask);
      set({ tasks });
    },
  }));
}

// ---------------------------------------------------------------------------
// React Context + Provider
// ---------------------------------------------------------------------------

type TaskStoreApi = StoreApi<TaskStore>;

const TaskStoreContext = createContext<TaskStoreApi | null>(null);
const TaskStoreContextProvider = TaskStoreContext.Provider;

interface TaskStoreProviderProps {
  children: ReactNode;
  initialTasks: TaskRow[];
}

function TaskStoreProvider({ children, initialTasks }: TaskStoreProviderProps) {
  const storeRef = useRef<StoreApi<TaskStore>>(undefined);
  if (!storeRef.current) {
    storeRef.current = createTaskStore(initialTasks);
  }

  return (
    <TaskStoreContextProvider value={storeRef.current}>
      {children}
    </TaskStoreContextProvider>
  );
}

// ---------------------------------------------------------------------------
// Base hook
// ---------------------------------------------------------------------------

function useTaskStore<T>(selector: (state: TaskStore) => T): T {
  const store = useContext(TaskStoreContext);
  if (!store) {
    throw new Error('useTaskStore must be used within a TaskStoreProvider');
  }
  return useStore(store, selector);
}

// ---------------------------------------------------------------------------
// Derived selectors
// ---------------------------------------------------------------------------

function useTasksWithHorizon(): Task[] {
  const tasks = useTaskStore((state) => state.tasks);
  const now = new Date();

  return tasks.map((row) => {
    const targetDate: DateRange | null =
      row.targetDateEarliest && row.targetDateLatest
        ? { earliest: row.targetDateEarliest, latest: row.targetDateLatest }
        : null;

    const horizon = getHorizon(targetDate, now);

    return { ...row, horizon, targetDate };
  });
}

function useTasksByHorizon(): Map<Horizon, Task[]> {
  const tasks = useTasksWithHorizon();
  const grouped = new Map<Horizon, Task[]>([
    ['immediate', []],
    ['this-week', []],
    ['this-month', []],
    ['this-quarter', []],
    ['this-year', []],
    ['someday', []],
  ]);

  for (const task of tasks) {
    grouped.get(task.horizon)!.push(task);
  }

  return grouped;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { TaskStoreProvider, useTaskStore, useTasksWithHorizon, useTasksByHorizon };
