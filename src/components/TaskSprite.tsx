'use client';

import { useMemo, useRef, useContext } from 'react';
import { Billboard } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import type { Task, TagCategory } from '@/types/task';
import { TAG_COLORS } from '@/types/task';
import { useSceneConfig, getExperienceConfig } from '@/stores/theme-store';
import { TaskStoreContext, useIsCompleting, useIsDropping } from '@/stores/task-store';

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
  const isCompleting = useIsCompleting(task.id);
  const isDropping = useIsDropping(task.id);
  const spriteConfig = useSceneConfig().sprite;

  // Refs for entrance animation (direct mutation, no React re-renders)
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const mountTimeRef = useRef<number | null>(null);

  // Refs for dissolution animations
  const dissolvingRef = useRef<'completing' | 'dropping' | null>(null);
  const dissolveStartRef = useRef<number | null>(null);

  // Refs for indicator ring materials
  const refinementRingRef = useRef<THREE.MeshBasicMaterial>(null);
  const deadlineRingRef = useRef<THREE.MeshBasicMaterial>(null);

  // Derive glow color from first tag, shifted toward ethereal tones
  const glowColor = useMemo(() => {
    const firstTag = task.tags?.[0];
    const baseHex =
      firstTag && isTagCategory(firstTag)
        ? TAG_COLORS[firstTag]
        : spriteConfig.defaultColor;

    const color = new THREE.Color(baseHex);
    const etherealTarget = new THREE.Color(spriteConfig.etherealTarget);
    const driftLerp = Math.min(0.25 + (task.driftCount ?? 0) * 0.1, 0.7);
    color.lerp(etherealTarget, driftLerp);
    color.multiplyScalar(spriteConfig.emissiveMultiplier);
    return color;
  }, [task.tags, task.driftCount, spriteConfig.defaultColor, spriteConfig.etherealTarget, spriteConfig.emissiveMultiplier]);

  // Derive radius from driftCount
  const radius = useMemo(() => {
    const drift = task.driftCount ?? 0;
    return spriteConfig.baseRadius * (1 + Math.min(drift, 5) * 0.06);
  }, [task.driftCount, spriteConfig.baseRadius]);

  // Detect start of dissolution
  if (isCompleting && dissolvingRef.current !== 'completing') {
    dissolvingRef.current = 'completing';
    dissolveStartRef.current = null;
  }
  if (isDropping && dissolvingRef.current !== 'dropping') {
    dissolvingRef.current = 'dropping';
    dissolveStartRef.current = null;
  }

  // Entrance + dissolution animation via useFrame
  useFrame((_state, delta) => {
    if (!groupRef.current || !materialRef.current) return;

    // Read sprite opacity from config (non-reactive in frame loop)
    const opacity = getExperienceConfig().scene.sprite.opacity;

    // Dissolution animation takes priority
    if (dissolvingRef.current) {
      if (dissolveStartRef.current === null) {
        dissolveStartRef.current = 0;
      }
      dissolveStartRef.current += delta;
      const elapsed = dissolveStartRef.current;

      if (dissolvingRef.current === 'completing') {
        const t = Math.min(elapsed / 0.5, 1);
        groupRef.current.scale.setScalar(1 - t);
        materialRef.current.opacity = opacity * (1 - t);
      } else {
        const t = Math.min(elapsed / 0.2, 1);
        groupRef.current.scale.setScalar(1 - t);
      }

      invalidate();
      return;
    }

    // Drift-based opacity reduction in steady state
    if (!isNew) {
      const driftReduction = Math.min((task.driftCount ?? 0) * 0.08, 0.5);
      materialRef.current.opacity = Math.max(0.4, opacity - driftReduction);
    }

    // Refinement ring breathing pulse
    if (refinementRingRef.current && task.needsRefinement) {
      refinementRingRef.current.opacity = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(performance.now() * 0.002));
      invalidate();
    }

    // Deadline ring breathing pulse
    if (deadlineRingRef.current && task.hardDeadline) {
      deadlineRingRef.current.opacity = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(performance.now() * 0.0015));
      invalidate();
    }

    // Entrance animation — only runs while isNew
    if (!isNew) return;

    if (mountTimeRef.current === null) {
      mountTimeRef.current = performance.now();
    }

    const elapsed = (performance.now() - mountTimeRef.current) / 1000;
    const duration = 0.6;
    const raw = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - raw, 3);

    groupRef.current.scale.setScalar(eased);
    materialRef.current.opacity = opacity * eased;

    if (raw < 1) {
      invalidate();
    } else {
      store?.getState().clearNewTask(task.id);
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef} scale={isNew ? [0, 0, 0] : [1, 1, 1]}>
        <Billboard>
          <mesh
            onClick={(e) => { e.stopPropagation(); store?.getState().selectTask(task.id); }}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
            <circleGeometry args={[radius, 32]} />
            <meshBasicMaterial
              ref={materialRef}
              color={glowColor}
              toneMapped={false}
              transparent
              opacity={isNew ? 0 : spriteConfig.opacity}
            />
          </mesh>
          {task.hardDeadline && (
            <mesh>
              <ringGeometry args={[radius * 1.2, radius * 1.35, 32]} />
              <meshBasicMaterial
                ref={deadlineRingRef}
                color={new THREE.Color(spriteConfig.deadlineRingColor)}
                toneMapped={false}
                transparent
                opacity={0.3}
              />
            </mesh>
          )}
          {task.needsRefinement && (
            <mesh>
              <ringGeometry args={[radius * 1.4, radius * 1.6, 32]} />
              <meshBasicMaterial
                ref={refinementRingRef}
                color={new THREE.Color(spriteConfig.refinementRingColor)}
                toneMapped={false}
                transparent
                opacity={0.3}
              />
            </mesh>
          )}
        </Billboard>
      </group>
    </group>
  );
}
