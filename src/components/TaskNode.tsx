'use client';

import type { Task } from '@/types/task';
import { SCENE_CONSTANTS } from '@/lib/scene-constants';
import { TaskCard } from './TaskCard';
import { TaskSprite } from './TaskSprite';

// O(1) lookup set from the scene constants
const cardHorizonsSet = new Set<string>(SCENE_CONSTANTS.cardHorizons);

export interface TaskNodeProps {
  task: Task;
  position: [number, number, number];
}

export function TaskNode({ task, position }: TaskNodeProps) {
  // Categorical LOD split: immediate + this-week render as cards, rest as sprites.
  // Kept as explicit variable so Phase 4 can extend with camera distance + hysteresis.
  const isCard = cardHorizonsSet.has(task.horizon);

  if (isCard) {
    return <TaskCard task={task} position={position} />;
  }

  return <TaskSprite task={task} position={position} />;
}
