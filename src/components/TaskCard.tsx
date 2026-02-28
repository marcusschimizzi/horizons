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
    // Pulse animation for hardDeadline (amber) or needsRefinement (blue)
    ...(pulseAnimation ? { animation: pulseAnimation } : {}),
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
        <>
          <style>{`
            @keyframes refinementPulse {
              0%, 100% { box-shadow: 0 0 4px rgba(136, 170, 255, 0.2), inset 0 0 2px rgba(136, 170, 255, 0.1); }
              50% { box-shadow: 0 0 12px rgba(136, 170, 255, 0.5), inset 0 0 4px rgba(136, 170, 255, 0.2); }
            }
            @keyframes deadlinePulse {
              0%, 100% { box-shadow: 0 0 6px rgba(245, 158, 11, 0.3); }
              50% { box-shadow: 0 0 14px rgba(245, 158, 11, 0.6), inset 0 0 4px rgba(245, 158, 11, 0.15); }
            }
          `}</style>
          <div style={cardStyle} onClick={() => store?.getState().selectTask(task.id)}>
            {task.title}
            {isDrifted && (
              <span style={{
                position: 'absolute',
                top: -6,
                right: -6,
                background: 'rgba(245, 158, 11, 0.9)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid rgba(10, 10, 15, 0.8)',
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
