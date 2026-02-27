'use client';

import { useMemo } from 'react';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';

import type { Task, TagCategory } from '@/types/task';
import { TAG_COLORS } from '@/types/task';
import { SCENE_CONSTANTS } from '@/lib/scene-constants';

// Default color when task has no tags or tag is not a recognized category
const DEFAULT_COLOR = '#7c8db5';

// Ethereal desaturation target — cool gray-blue to push toward starlight feel
const ETHEREAL_TARGET = new THREE.Color('#c8d6e5');

const TAG_CATEGORY_SET = new Set<string>(Object.keys(TAG_COLORS));

function isTagCategory(tag: string): tag is TagCategory {
  return TAG_CATEGORY_SET.has(tag);
}

export interface TaskSpriteProps {
  task: Task;
  position: [number, number, number];
}

export function TaskSprite({ task, position }: TaskSpriteProps) {
  // Derive glow color from first tag, shifted toward ethereal tones
  const glowColor = useMemo(() => {
    const firstTag = task.tags?.[0];
    const baseHex =
      firstTag && isTagCategory(firstTag)
        ? TAG_COLORS[firstTag]
        : DEFAULT_COLOR;

    const color = new THREE.Color(baseHex);
    color.lerp(ETHEREAL_TARGET, 0.25);
    color.multiplyScalar(SCENE_CONSTANTS.spriteEmissiveMultiplier);
    return color;
  }, [task.tags]);

  // Derive radius from driftCount — subtle scaling up to ~30% at 5 drifts
  const radius = useMemo(() => {
    const drift = task.driftCount ?? 0;
    return (
      SCENE_CONSTANTS.spriteBaseRadius *
      (1 + Math.min(drift, 5) * 0.06)
    );
  }, [task.driftCount]);

  return (
    <group position={position}>
      <Billboard>
        <mesh>
          <circleGeometry args={[radius, 32]} />
          <meshBasicMaterial
            color={glowColor}
            toneMapped={false}
            transparent
            opacity={SCENE_CONSTANTS.spriteOpacity}
          />
        </mesh>
      </Billboard>
    </group>
  );
}
