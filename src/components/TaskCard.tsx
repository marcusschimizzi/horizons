'use client';

import { Html } from '@react-three/drei';
import type { Task } from '@/types/task';
import { SCENE_CONSTANTS } from '@/lib/scene-constants';

interface TaskCardProps {
  task: Task;
  position: [number, number, number];
}

export function TaskCard({ task, position }: TaskCardProps) {
  const hasDeadline = task.hardDeadline !== null;
  const isDrifted = task.driftCount > 0;

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
    // Hard-deadline amber glow ring
    ...(hasDeadline
      ? {
          boxShadow:
            '0 0 8px rgba(245, 158, 11, 0.4), inset 0 0 4px rgba(245, 158, 11, 0.1)',
        }
      : {}),
    // Drift desaturation and dimming
    ...(isDrifted
      ? {
          filter: `saturate(${Math.max(0.3, 1 - task.driftCount * 0.15)})`,
          opacity: Math.max(0.6, 1 - task.driftCount * 0.1),
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
        <div style={cardStyle}>{task.title}</div>
      </Html>
    </group>
  );
}
