'use client';

import { useState, useEffect, useContext } from 'react';
import { Html } from '@react-three/drei';
import type { Task } from '@/types/task';
import { SCENE_CONSTANTS } from '@/lib/scene-constants';
import { TaskStoreContext, useIsCompleting, useIsDropping } from '@/stores/task-store';

interface TaskCardProps {
  task: Task;
  position: [number, number, number];
  isNew?: boolean;
}

export function TaskCard({ task, position, isNew }: TaskCardProps) {
  const store = useContext(TaskStoreContext);
  const isCompleting = useIsCompleting(task.id);
  const isDropping = useIsDropping(task.id);
  const hasDeadline = task.hardDeadline !== null;
  const isDrifted = task.driftCount > 0;

  // Entrance state: existing tasks start entered, new tasks start un-entered
  const [entered, setEntered] = useState(!isNew);

  useEffect(() => {
    if (!isNew) return;

    // Trigger enter on next animation frame for CSS transition
    const raf = requestAnimationFrame(() => {
      setEntered(true);
    });

    // Clear newTask flag after transition completes
    const timer = setTimeout(() => {
      store?.getState().clearNewTask(task.id);
    }, 500);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [isNew, task.id, store]);

  // Compute drift-based opacity (only when entered)
  const driftOpacity = isDrifted
    ? Math.max(0.6, 1 - task.driftCount * 0.1)
    : 1;

  const cardStyle: React.CSSProperties = {
    width: 200,
    padding: '10px 14px',
    background: 'rgba(18, 18, 26, 0.75)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(148, 163, 184, 0.15)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    pointerEvents: 'auto',
    cursor: 'pointer',
    // Entrance animation
    opacity: entered ? driftOpacity : 0,
    transform: entered ? 'scale(1)' : 'scale(0.85)',
    ...(isNew
      ? { transition: 'opacity 0.5s ease-out, transform 0.5s ease-out' }
      : {}),
    // Hard-deadline amber glow ring
    ...(hasDeadline
      ? {
          boxShadow:
            '0 0 8px rgba(245, 158, 11, 0.4), inset 0 0 4px rgba(245, 158, 11, 0.1)',
        }
      : {}),
    // Drift desaturation
    ...(isDrifted
      ? {
          filter: `saturate(${Math.max(0.3, 1 - task.driftCount * 0.15)})`,
        }
      : {}),
    // Completion dissolution: fade + shrink
    ...(isCompleting
      ? {
          opacity: 0,
          transform: 'scale(0.5)',
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        }
      : {}),
    // Drop dissolution: abrupt shrink, no fade
    ...(isDropping
      ? {
          transform: 'scale(0)',
          transition: 'transform 0.2s ease-in',
        }
      : {}),
  };

  return (
    <group position={position}>
      <Html
        center
        distanceFactor={SCENE_CONSTANTS.htmlDistanceFactor}
        style={{ pointerEvents: 'none' }}
      >
        <div style={cardStyle} onClick={() => store?.getState().selectTask(task.id)}>{task.title}</div>
      </Html>
    </group>
  );
}
