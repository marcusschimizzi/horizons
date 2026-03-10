'use client';

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

import { SCENE_CONSTANTS } from '@/lib/scene-constants';
import { useSceneConfig, useExperienceConfig, themeStore } from '@/stores/theme-store';
import { TaskStoreContext, useTasksWithHorizon, useTaskStore } from '@/stores/task-store';
import { getTaskPosition, applyOverlapAvoidance } from '@/lib/spatial';
import { TaskNode } from './TaskNode';
import { CompletionBurst } from './CompletionBurst';
import { CameraRig } from './CameraRig';
import { DebugOverlay } from './DebugOverlay';
import { SnapToPresent } from './SnapToPresent';
import { InputBubble } from './InputBubble';
import { TaskDetail } from './TaskDetail';
import { DriftNotification } from './DriftNotification';
import { ListView } from './ListView';
import { HorizonIndicator } from './HorizonIndicator';
import { ExperienceSwitcher } from './ExperienceSwitcher';
import { TextureToggle } from './TextureToggle';

import type { ThemeSceneConfig } from '@/lib/theme-config';

// ---------------------------------------------------------------------------
// SceneInvalidator — subscribes to Zustand stores and calls invalidate()
// ---------------------------------------------------------------------------

function SceneInvalidator() {
  const invalidate = useThree((state) => state.invalidate);
  const store = useContext(TaskStoreContext);

  useEffect(() => {
    if (!store) return;
    const unsubscribe = store.subscribe(() => {
      invalidate();
    });
    return unsubscribe;
  }, [store, invalidate]);

  // Also invalidate when theme changes (scene config swap)
  useEffect(() => {
    const unsubscribe = themeStore.subscribe(() => {
      invalidate();
    });
    return unsubscribe;
  }, [invalidate]);

  return null;
}

// ---------------------------------------------------------------------------
// FogSetup — imperatively sets fog to work around React 19 declarative issues
// ---------------------------------------------------------------------------

function FogSetup({ taskCount, config }: { taskCount: number; config: ThemeSceneConfig }) {
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const baseDensity = config.fogDensity;
    const adaptiveDensity = baseDensity + Math.min(taskCount * 0.0002, 0.008);
    scene.fog = new THREE.FogExp2(config.fogColor, adaptiveDensity);
    return () => {
      scene.fog = null;
    };
  }, [scene, taskCount, config.fogDensity, config.fogColor]);

  return null;
}

// ---------------------------------------------------------------------------
// TaskNodes — renders TaskNode for each task at its computed position
// ---------------------------------------------------------------------------

interface BurstEntry {
  id: string;
  position: [number, number, number];
}

function TaskNodes() {
  const tasks = useTasksWithHorizon();
  const store = useContext(TaskStoreContext);
  const [bursts, setBursts] = useState<BurstEntry[]>([]);
  const prevCompletingRef = useRef<Set<string>>(new Set());

  const positionMap = useMemo(() => {
    const rawPositions = tasks.map((task) => ({
      id: task.id,
      horizon: task.horizon,
      pos: getTaskPosition(task.id, task.horizon),
    }));
    return applyOverlapAvoidance(rawPositions);
  }, [tasks]);

  // Subscribe to store to detect new completions and spawn bursts
  useEffect(() => {
    if (!store) return;
    const unsubscribe = store.subscribe((state) => {
      const current = state.completingTaskIds;
      const prev = prevCompletingRef.current;
      current.forEach((id) => {
        if (!prev.has(id)) {
          const pos = positionMap.get(id);
          if (pos) {
            setBursts((b) => [...b, { id, position: [pos.x, pos.y, pos.z] }]);
          }
        }
      });
      prevCompletingRef.current = new Set(current);
    });
    return unsubscribe;
  }, [store, positionMap]);

  return (
    <>
      {tasks.map((task) => {
        const pos = positionMap.get(task.id);
        if (!pos) return null;
        return (
          <TaskNode
            key={task.id}
            task={task}
            position={[pos.x, pos.y, pos.z]}
          />
        );
      })}
      {bursts.map((b) => (
        <CompletionBurst
          key={b.id}
          position={b.position}
          onComplete={() => {
            setBursts((prev) => prev.filter((x) => x.id !== b.id));
            store?.getState().finishCompletion(b.id);
          }}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// SceneContents — everything rendered inside the Canvas
// ---------------------------------------------------------------------------

function SceneContents({ taskCount }: { taskCount: number }) {
  const config = useSceneConfig();

  return (
    <>
      <color attach="background" args={[config.background]} />
      <FogSetup taskCount={taskCount} config={config} />
      <ambientLight intensity={config.ambientIntensity} />
      {config.directionalLight && (
        <directionalLight
          intensity={config.directionalLight.intensity}
          position={config.directionalLight.position}
          color={config.directionalLight.color}
        />
      )}
      {config.stars && (
        <Stars
          radius={config.stars.radius}
          depth={config.stars.depth}
          count={config.stars.count}
          factor={config.stars.factor}
          saturation={0}
          speed={0}
          fade
        />
      )}
      <CameraRig />
      <TaskNodes />
      <SceneInvalidator />
      {config.bloom && (
        <EffectComposer>
          <Bloom
            mipmapBlur={config.bloom.mipmapBlur}
            luminanceThreshold={config.bloom.luminanceThreshold}
            luminanceSmoothing={config.bloom.luminanceSmoothing}
            intensity={config.bloom.intensity}
          />
        </EffectComposer>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// HorizonScene — the main exported component
// ---------------------------------------------------------------------------

interface HorizonSceneProps {
  driftSummary?: { count: number } | null;
}

export default function HorizonScene({ driftSummary }: HorizonSceneProps) {
  const tasks = useTasksWithHorizon();
  const showListView = useTaskStore((s) => s.showListView);
  const toggleListView = useTaskStore((s) => s.toggleListView);
  const sceneConfig = useSceneConfig();
  const { css } = useExperienceConfig();

  const cardHorizonsSet = useMemo(
    () => new Set<string>(sceneConfig.cardHorizons),
    [sceneConfig.cardHorizons],
  );

  const taskBreakdown = useMemo(() => {
    const cards = tasks.filter((t) => cardHorizonsSet.has(t.horizon)).length;
    return { total: tasks.length, cards, sprites: tasks.length - cards };
  }, [tasks, cardHorizonsSet]);

  // L key toggles between 3D scene and list view
  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'l' || e.key === 'L') {
        toggleListView();
      }
    },
    [toggleListView],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [handleKeydown]);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={toggleListView}
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          zIndex: 100,
          padding: '8px 14px',
          background: `${css.bgSecondary}cc`,
          ...(css.backdropBlur > 0
            ? {
                backdropFilter: `blur(${css.backdropBlur}px)`,
                WebkitBackdropFilter: `blur(${css.backdropBlur}px)`,
              }
            : {}),
          border: `1px solid ${css.accentGlow}1f`,
          borderRadius: css.borderRadius,
          color: css.textSecondary,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'var(--font-body), sans-serif',
          cursor: 'pointer',
        }}
      >
        {showListView ? '3D View' : 'List View'}
      </button>

      {/* Experience switcher */}
      <ExperienceSwitcher />

      {/* Canvas wrapper — hidden (not unmounted) when list view active */}
      <div style={{ display: showListView ? 'none' : 'contents' }}>
        <Canvas
          frameloop="demand"
          camera={{ position: [0, 0, SCENE_CONSTANTS.cameraRestZ], fov: 60 }}
          style={{
            width: '100%',
            height: '100%',
            background: sceneConfig.background,
          }}
        >
          <SceneContents taskCount={tasks.length} />
        </Canvas>
      </div>

      {/* List view */}
      {showListView && <ListView />}

      {driftSummary && driftSummary.count > 0 && (
        <DriftNotification count={driftSummary.count} />
      )}
      {!showListView && <HorizonIndicator />}
      {!showListView && <SnapToPresent />}
      <InputBubble />
      <TaskDetail />
      <DebugOverlay taskBreakdown={taskBreakdown} />
      <TextureToggle />
    </>
  );
}
