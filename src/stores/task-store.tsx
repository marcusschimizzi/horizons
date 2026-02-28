'use client';

import { createContext, useContext, useRef, type ReactNode } from 'react';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { TaskRow, Task, DateRange } from '@/types/task';
import { type Horizon, getHorizon } from '@/lib/horizons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ListFilters {
  tags: Set<string>;
  needsRefinement: boolean | null;
  horizons: Set<string>;
}

interface TaskState {
  tasks: TaskRow[];
  newTaskIds: Set<string>;
  completingTaskIds: Set<string>;
  droppingTaskIds: Set<string>;
  selectedTaskId: string | null;
  showListView: boolean;
  listFilters: ListFilters;
}

interface TaskActions {
  setTasks: (tasks: TaskRow[]) => void;
  addTask: (task: TaskRow) => void;
  replaceTask: (tempId: string, realTask: TaskRow) => void;
  updateTask: (id: string, updates: Partial<TaskRow>) => void;
  removeTask: (id: string) => void;
  clearNewTask: (id: string) => void;
  refresh: () => Promise<void>;
  selectTask: (id: string) => void;
  clearSelection: () => void;
  startCompletion: (id: string) => void;
  finishCompletion: (id: string) => void;
  cancelCompletion: (id: string) => void;
  restoreTask: (task: TaskRow) => void;
  startDrop: (id: string) => void;
  finishDrop: (id: string) => void;
  toggleListView: () => void;
  setListFilter: (key: keyof ListFilters, value: ListFilters[keyof ListFilters]) => void;
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
    newTaskIds: new Set<string>(),
    completingTaskIds: new Set<string>(),
    droppingTaskIds: new Set<string>(),
    selectedTaskId: null,
    showListView: false,
    listFilters: {
      tags: new Set<string>(),
      needsRefinement: null,
      horizons: new Set<string>(),
    },

    setTasks: (tasks: TaskRow[]) => set({ tasks }),

    addTask: (task: TaskRow) =>
      set((state) => {
        const ids = new Set(state.newTaskIds);
        ids.add(task.id);
        return { tasks: [...state.tasks, task], newTaskIds: ids };
      }),

    replaceTask: (tempId: string, realTask: TaskRow) =>
      set((state) => {
        const ids = new Set(state.newTaskIds);
        ids.delete(tempId);
        ids.add(realTask.id);
        return {
          tasks: state.tasks.map((t) => (t.id === tempId ? realTask : t)),
          newTaskIds: ids,
        };
      }),

    updateTask: (id: string, updates: Partial<TaskRow>) =>
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, ...updates } : t,
        ),
      })),

    removeTask: (id: string) =>
      set((state) => {
        const ids = new Set(state.newTaskIds);
        ids.delete(id);
        return {
          tasks: state.tasks.filter((t) => t.id !== id),
          newTaskIds: ids,
        };
      }),

    clearNewTask: (id: string) =>
      set((state) => {
        const ids = new Set(state.newTaskIds);
        ids.delete(id);
        return { newTaskIds: ids };
      }),

    refresh: async () => {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
      const rawTasks: Record<string, unknown>[] = await res.json();
      const tasks = rawTasks.map(deserializeTask);
      set({ tasks });
    },

    selectTask: (id: string) => set({ selectedTaskId: id }),
    clearSelection: () => set({ selectedTaskId: null }),

    startCompletion: (id: string) =>
      set((state) => {
        const ids = new Set(state.completingTaskIds);
        ids.add(id);
        return { completingTaskIds: ids };
      }),

    finishCompletion: (id: string) =>
      set((state) => {
        const completing = new Set(state.completingTaskIds);
        completing.delete(id);
        const newIds = new Set(state.newTaskIds);
        newIds.delete(id);
        return {
          completingTaskIds: completing,
          tasks: state.tasks.filter((t) => t.id !== id),
          newTaskIds: newIds,
        };
      }),

    cancelCompletion: (id: string) =>
      set((state) => {
        const ids = new Set(state.completingTaskIds);
        ids.delete(id);
        return { completingTaskIds: ids };
      }),

    restoreTask: (task: TaskRow) =>
      set((state) => ({
        tasks: state.tasks.some((t) => t.id === task.id)
          ? state.tasks
          : [...state.tasks, task],
      })),

    startDrop: (id: string) =>
      set((state) => {
        const ids = new Set(state.droppingTaskIds);
        ids.add(id);
        return { droppingTaskIds: ids };
      }),

    finishDrop: (id: string) =>
      set((state) => {
        const dropping = new Set(state.droppingTaskIds);
        dropping.delete(id);
        const newIds = new Set(state.newTaskIds);
        newIds.delete(id);
        return {
          droppingTaskIds: dropping,
          tasks: state.tasks.filter((t) => t.id !== id),
          newTaskIds: newIds,
        };
      }),

    toggleListView: () => set((state) => ({ showListView: !state.showListView })),

    setListFilter: (key, value) =>
      set((state) => ({
        listFilters: { ...state.listFilters, [key]: value },
      })),
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
// New-task selector (for entrance animations)
// ---------------------------------------------------------------------------

function useIsNewTask(taskId: string): boolean {
  return useTaskStore((state) => state.newTaskIds.has(taskId));
}

function useSelectedTask(): Task | null {
  const selectedId = useTaskStore((state) => state.selectedTaskId);
  const tasks = useTaskStore((state) => state.tasks);

  if (!selectedId) return null;
  const row = tasks.find((t) => t.id === selectedId);
  if (!row) return null;

  const targetDate: DateRange | null =
    row.targetDateEarliest && row.targetDateLatest
      ? { earliest: row.targetDateEarliest, latest: row.targetDateLatest }
      : null;
  const horizon = getHorizon(targetDate, new Date());

  return { ...row, horizon, targetDate };
}

// ---------------------------------------------------------------------------
// Completing/Dropping selectors
// ---------------------------------------------------------------------------

function useIsCompleting(taskId: string): boolean {
  return useTaskStore((state) => state.completingTaskIds.has(taskId));
}

function useIsDropping(taskId: string): boolean {
  return useTaskStore((state) => state.droppingTaskIds.has(taskId));
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { TaskStoreContext, TaskStoreProvider, useTaskStore, useTasksWithHorizon, useTasksByHorizon, useIsNewTask, useIsCompleting, useIsDropping, useSelectedTask };
