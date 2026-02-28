'use client';

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { SCENE_CONSTANTS } from '@/lib/scene-constants';
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
import { TextureToggle } from './TextureToggle';

// O(1) lookup for card horizons (same set as TaskNode, used for breakdown count)
const cardHorizonsSet = new Set<string>(SCENE_CONSTANTS.cardHorizons);

// ---------------------------------------------------------------------------
// SceneInvalidator — subscribes to Zustand store and calls invalidate()
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

  return null;
}

// ---------------------------------------------------------------------------
// FogSetup — imperatively sets fog to work around React 19 declarative issues
// ---------------------------------------------------------------------------

function FogSetup({ taskCount }: { taskCount: number }) {
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const baseDensity = SCENE_CONSTANTS.fogDensity;
    const adaptiveDensity = baseDensity + Math.min(taskCount * 0.0002, 0.008);
    scene.fog = new THREE.FogExp2(SCENE_CONSTANTS.fogColor, adaptiveDensity);
    return () => {
      scene.fog = null;
    };
  }, [scene, taskCount]);

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
      // Find newly added IDs
      current.forEach((id) => {
        if (!prev.has(id)) {
          // Look up the task position from positionMap
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
  return (
    <>
      <color attach="background" args={[SCENE_CONSTANTS.background]} />
      <FogSetup taskCount={taskCount} />
      <ambientLight intensity={SCENE_CONSTANTS.ambientIntensity} />
      <directionalLight position={[5, 10, 5]} intensity={0.4} color="#fff8f0" />
      <CameraRig />
      <TaskNodes />
      <SceneInvalidator />
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

  const taskBreakdown = useMemo(() => {
    const cards = tasks.filter((t) => cardHorizonsSet.has(t.horizon)).length;
    return { total: tasks.length, cards, sprites: tasks.length - cards };
  }, [tasks]);

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
          background: '#fdf8f0',
          border: '1px solid #8b7d6b',
          borderRadius: 4,
          color: '#5c5344',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'var(--font-geist-mono), monospace',
          cursor: 'pointer',
        }}
      >
        {showListView ? '3D View' : 'List View'}
      </button>

      {/* Canvas wrapper — hidden (not unmounted) when list view active */}
      <div style={{ display: showListView ? 'none' : 'contents' }}>
        <Canvas
          frameloop="demand"
          camera={{ position: [0, 0, SCENE_CONSTANTS.cameraRestZ], fov: 60 }}
          style={{
            width: '100%',
            height: '100%',
            background: SCENE_CONSTANTS.background,
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
      {!showListView && <SnapToPresent />}
      <TextureToggle />
      <InputBubble />
      <TaskDetail />
      <DebugOverlay taskBreakdown={taskBreakdown} />
    </>
  );
}
