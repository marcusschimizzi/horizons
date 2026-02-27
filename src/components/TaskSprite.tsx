'use client';

import { useMemo, useRef, useContext } from 'react';
import { Billboard } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import type { Task, TagCategory } from '@/types/task';
import { TAG_COLORS } from '@/types/task';
import { SCENE_CONSTANTS } from '@/lib/scene-constants';
import { TaskStoreContext } from '@/stores/task-store';

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
  isNew?: boolean;
}

export function TaskSprite({ task, position, isNew }: TaskSpriteProps) {
  const store = useContext(TaskStoreContext);
  const invalidate = useThree((state) => state.invalidate);

  // Refs for entrance animation (direct mutation, no React re-renders)
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const mountTimeRef = useRef<number | null>(null);

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

  // Entrance animation via useFrame — only runs while isNew
  useFrame((_state, _delta) => {
    if (!isNew) return;
    if (!groupRef.current || !materialRef.current) return;

    // Initialize mount time on first frame
    if (mountTimeRef.current === null) {
      mountTimeRef.current = performance.now();
    }

    const elapsed = (performance.now() - mountTimeRef.current) / 1000;
    const duration = 0.6;
    const raw = Math.min(elapsed / duration, 1);
    // Ease-out cubic: 1 - (1-t)^3
    const eased = 1 - Math.pow(1 - raw, 3);

    groupRef.current.scale.setScalar(eased);
    materialRef.current.opacity = SCENE_CONSTANTS.spriteOpacity * eased;

    if (raw < 1) {
      invalidate();
    } else {
      // Animation complete — clear from newTaskIds
      store?.getState().clearNewTask(task.id);
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef} scale={isNew ? [0, 0, 0] : [1, 1, 1]}>
        <Billboard>
          <mesh>
            <circleGeometry args={[radius, 32]} />
            <meshBasicMaterial
              ref={materialRef}
              color={glowColor}
              toneMapped={false}
              transparent
              opacity={isNew ? 0 : SCENE_CONSTANTS.spriteOpacity}
            />
          </mesh>
        </Billboard>
      </group>
    </group>
  );
}
