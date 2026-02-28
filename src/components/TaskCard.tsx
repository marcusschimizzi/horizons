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

  // Determine animation: hardDeadline takes priority over needsRefinement
  const pulseAnimation = hasDeadline
    ? 'deadlinePulse 4s ease-in-out infinite'
    : task.needsRefinement
      ? 'refinementPulse 3s ease-in-out infinite'
      : undefined;

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    width: 200,
    padding: '10px 14px',
    background: '#fdf8f0',
    border: '1px solid #8b7d6b',
    borderRadius: 2,
    boxShadow: '2px 3px 8px rgba(26, 22, 5, 0.12)',
    color: '#1a1605',
    fontFamily: 'var(--font-serif)',
    fontSize: 13,
    lineHeight: 1.4,
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
    // Pulse animation for hardDeadline or needsRefinement
    ...(pulseAnimation ? { animation: pulseAnimation } : {}),
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
        <>
          <style>{`
            @keyframes refinementPulse {
              0%, 100% { box-shadow: 2px 3px 8px rgba(26,22,5,0.12), 0 0 0 2px rgba(30,58,95,0.15); }
              50% { box-shadow: 2px 3px 8px rgba(26,22,5,0.12), 0 0 0 3px rgba(30,58,95,0.35); }
            }
            @keyframes deadlinePulse {
              0%, 100% { box-shadow: 2px 3px 8px rgba(26,22,5,0.12), 0 0 0 2px rgba(124,58,43,0.15); }
              50% { box-shadow: 2px 3px 8px rgba(26,22,5,0.12), 0 0 0 3px rgba(124,58,43,0.35); }
            }
          `}</style>
          <div style={cardStyle} onClick={() => store?.getState().selectTask(task.id)}>
            {task.title}
            {isDrifted && (
              <span style={{
                position: 'absolute',
                top: -6,
                right: -6,
                background: '#fdf8f0',
                color: '#7c3a2b',
                fontSize: 10,
                fontWeight: 700,
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #7c3a2b',
                fontFamily: 'var(--font-geist-mono), monospace',
              }}>
                {task.driftCount}
              </span>
            )}
          </div>
        </>
      </Html>
    </group>
  );
}
