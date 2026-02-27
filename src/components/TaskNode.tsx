'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { damp3 } from 'maath/easing';
import * as THREE from 'three';

import type { Task } from '@/types/task';
import { SCENE_CONSTANTS } from '@/lib/scene-constants';
import { useIsNewTask } from '@/stores/task-store';
import { TaskCard } from './TaskCard';
import { TaskSprite } from './TaskSprite';

// O(1) lookup set from the scene constants
const cardHorizonsSet = new Set<string>(SCENE_CONSTANTS.cardHorizons);

// Smoothing time for position drift (seconds) — lower = snappier
const DRIFT_SMOOTH_TIME = 0.4;
// Threshold below which we consider position settled (no more invalidation)
const SETTLE_THRESHOLD = 0.01;

export interface TaskNodeProps {
  task: Task;
  position: [number, number, number];
}

export function TaskNode({ task, position }: TaskNodeProps) {
  // Categorical LOD split: immediate + this-week render as cards, rest as sprites.
  // Kept as explicit variable so Phase 4 can extend with camera distance + hysteresis.
  const isCard = cardHorizonsSet.has(task.horizon);
  const isNew = useIsNewTask(task.id);
  const groupRef = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);

  // Animate group position toward target using damp3
  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    const target: [number, number, number] = position;
    const changed = damp3(
      groupRef.current.position,
      target,
      DRIFT_SMOOTH_TIME,
      delta,
    );

    // Keep requesting frames while still animating
    if (changed) {
      const dx = groupRef.current.position.x - target[0];
      const dy = groupRef.current.position.y - target[1];
      const dz = groupRef.current.position.z - target[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > SETTLE_THRESHOLD) {
        invalidate();
      }
    }
  });

  if (isCard) {
    return (
      <group ref={groupRef} position={position}>
        <TaskCard task={task} position={[0, 0, 0]} isNew={isNew} />
      </group>
    );
  }

  return (
    <group ref={groupRef} position={position}>
      <TaskSprite task={task} position={[0, 0, 0]} isNew={isNew} />
    </group>
  );
}
