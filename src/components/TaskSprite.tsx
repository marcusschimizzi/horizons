'use client';

import { useMemo, useRef, useContext } from 'react';
import { Billboard } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import type { Task } from '@/types/task';
import { SCENE_CONSTANTS } from '@/lib/scene-constants';
import { TaskStoreContext, useIsCompleting, useIsDropping } from '@/stores/task-store';

// Ink palette — tag border colors for paper notes
const INK_TAG_COLORS: Record<string, string> = {
  work: '#1e3a5f',
  personal: '#7c3a2b',
  health: '#2d5016',
  finance: '#4a2c6b',
  home: '#7c4a1a',
  social: '#8b1a3c',
};

const DEFAULT_BORDER = '#8b7d6b';   // warm ink gray
const PAPER_COLOR = '#fdf8f0';      // cream paper face
const REFINEMENT_COLOR = '#1e3a5f'; // prussian blue indicator
const DEADLINE_COLOR = '#7c3a2b';   // burnt sienna indicator

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

  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const mountTimeRef = useRef<number | null>(null);

  const dissolvingRef = useRef<'completing' | 'dropping' | null>(null);
  const dissolveStartRef = useRef<number | null>(null);

  const refinementRingRef = useRef<THREE.MeshBasicMaterial>(null);
  const deadlineRingRef = useRef<THREE.MeshBasicMaterial>(null);

  // Border color derived from first tag (ink palette)
  const borderColor = useMemo(() => {
    const firstTag = task.tags?.[0];
    return (firstTag && INK_TAG_COLORS[firstTag]) ?? DEFAULT_BORDER;
  }, [task.tags]);

  // Note scale — slightly larger with drift (same semantic as before)
  const noteScale = useMemo(() => {
    const drift = task.driftCount ?? 0;
    return 1 + Math.min(drift, 5) * 0.06;
  }, [task.driftCount]);

  const w = SCENE_CONSTANTS.spriteWidth * noteScale;
  const h = SCENE_CONSTANTS.spriteHeight * noteScale;

  // Detect start of dissolution
  if (isCompleting && dissolvingRef.current !== 'completing') {
    dissolvingRef.current = 'completing';
    dissolveStartRef.current = null;
  }
  if (isDropping && dissolvingRef.current !== 'dropping') {
    dissolvingRef.current = 'dropping';
    dissolveStartRef.current = null;
  }

  useFrame((_state, delta) => {
    if (!groupRef.current || !materialRef.current) return;

    // Dissolution animation takes priority
    if (dissolvingRef.current) {
      if (dissolveStartRef.current === null) dissolveStartRef.current = 0;
      dissolveStartRef.current += delta;
      const elapsed = dissolveStartRef.current;

      if (dissolvingRef.current === 'completing') {
        const t = Math.min(elapsed / 0.5, 1);
        groupRef.current.scale.setScalar(1 - t);
        materialRef.current.opacity = SCENE_CONSTANTS.spriteOpacity * (1 - t);
      } else {
        const t = Math.min(elapsed / 0.2, 1);
        groupRef.current.scale.setScalar(1 - t);
      }

      invalidate();
      return;
    }

    // Drift opacity — fading ink effect
    if (!isNew) {
      const driftReduction = Math.min((task.driftCount ?? 0) * 0.08, 0.5);
      materialRef.current.opacity = Math.max(0.4, SCENE_CONSTANTS.spriteOpacity - driftReduction);
    }

    // Refinement indicator pulse (~0.3 Hz)
    if (refinementRingRef.current && task.needsRefinement) {
      refinementRingRef.current.opacity = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(performance.now() * 0.002));
      invalidate();
    }

    // Deadline indicator pulse (~0.25 Hz)
    if (deadlineRingRef.current && task.hardDeadline) {
      deadlineRingRef.current.opacity = 0.15 + 0.3 * (0.5 + 0.5 * Math.sin(performance.now() * 0.0015));
      invalidate();
    }

    // Entrance animation
    if (!isNew) return;

    if (mountTimeRef.current === null) mountTimeRef.current = performance.now();

    const elapsed = (performance.now() - mountTimeRef.current) / 1000;
    const duration = 0.6;
    const raw = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - raw, 3); // ease-out cubic

    groupRef.current.scale.setScalar(eased);
    materialRef.current.opacity = SCENE_CONSTANTS.spriteOpacity * eased;

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
          {/* Deadline indicator — outermost frame, burnt sienna */}
          {task.hardDeadline && (
            <mesh position={[0, 0, -0.003]}>
              <planeGeometry args={[w + 0.12, h + 0.10]} />
              <meshBasicMaterial
                ref={deadlineRingRef}
                color={DEADLINE_COLOR}
                transparent
                opacity={0.25}
              />
            </mesh>
          )}
          {/* Refinement indicator — inner frame, prussian blue */}
          {task.needsRefinement && (
            <mesh position={[0, 0, -0.002]}>
              <planeGeometry args={[w + 0.07, h + 0.06]} />
              <meshBasicMaterial
                ref={refinementRingRef}
                color={REFINEMENT_COLOR}
                transparent
                opacity={0.25}
              />
            </mesh>
          )}
          {/* Ink border frame */}
          <mesh position={[0, 0, -0.001]}>
            <planeGeometry args={[w + 0.04, h + 0.03]} />
            <meshBasicMaterial color={borderColor} />
          </mesh>
          {/* Paper face */}
          <mesh
            onClick={(e) => { e.stopPropagation(); store?.getState().selectTask(task.id); }}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial
              ref={materialRef}
              color={PAPER_COLOR}
              transparent
              opacity={isNew ? 0 : SCENE_CONSTANTS.spriteOpacity}
            />
          </mesh>
        </Billboard>
      </group>
    </group>
  );
}
