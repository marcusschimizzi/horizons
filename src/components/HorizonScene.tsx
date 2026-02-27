'use client';

import { useContext, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

import { SCENE_CONSTANTS } from '@/lib/scene-constants';
import { TaskStoreContext, useTasksWithHorizon } from '@/stores/task-store';
import { getTaskPosition, applyOverlapAvoidance } from '@/lib/spatial';
import { TaskNode } from './TaskNode';
import { CameraRig } from './CameraRig';
import { DebugOverlay } from './DebugOverlay';
import { SnapToPresent } from './SnapToPresent';
import { InputBubble } from './InputBubble';

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

function FogSetup() {
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    scene.fog = new THREE.FogExp2(SCENE_CONSTANTS.fogColor, SCENE_CONSTANTS.fogDensity);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  return null;
}

// ---------------------------------------------------------------------------
// TaskNodes — renders TaskNode for each task at its computed position
// ---------------------------------------------------------------------------

function TaskNodes() {
  const tasks = useTasksWithHorizon();

  const positionMap = useMemo(() => {
    const rawPositions = tasks.map((task) => ({
      id: task.id,
      horizon: task.horizon,
      pos: getTaskPosition(task.id, task.horizon),
    }));
    return applyOverlapAvoidance(rawPositions);
  }, [tasks]);

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
    </>
  );
}

// ---------------------------------------------------------------------------
// SceneContents — everything rendered inside the Canvas
// ---------------------------------------------------------------------------

function SceneContents() {
  return (
    <>
      <color attach="background" args={[SCENE_CONSTANTS.background]} />
      <FogSetup />
      <ambientLight intensity={SCENE_CONSTANTS.ambientIntensity} />
      <Stars
        radius={SCENE_CONSTANTS.starRadius}
        depth={SCENE_CONSTANTS.starDepth}
        count={SCENE_CONSTANTS.starCount}
        factor={SCENE_CONSTANTS.starFactor}
        saturation={0}
        speed={0}
        fade
      />
      <CameraRig />
      <TaskNodes />
      <SceneInvalidator />
      <EffectComposer>
        <Bloom
          mipmapBlur={SCENE_CONSTANTS.bloomMipmapBlur}
          luminanceThreshold={SCENE_CONSTANTS.bloomLuminanceThreshold}
          luminanceSmoothing={SCENE_CONSTANTS.bloomLuminanceSmoothing}
          intensity={SCENE_CONSTANTS.bloomIntensity}
        />
      </EffectComposer>
    </>
  );
}

// ---------------------------------------------------------------------------
// HorizonScene — the main exported component
// ---------------------------------------------------------------------------

export default function HorizonScene() {
  const tasks = useTasksWithHorizon();

  const taskBreakdown = useMemo(() => {
    const cards = tasks.filter((t) => cardHorizonsSet.has(t.horizon)).length;
    return { total: tasks.length, cards, sprites: tasks.length - cards };
  }, [tasks]);

  return (
    <>
      <Canvas
        frameloop="demand"
        camera={{ position: [0, 0, SCENE_CONSTANTS.cameraRestZ], fov: 60 }}
        style={{
          width: '100%',
          height: '100%',
          background: SCENE_CONSTANTS.background,
        }}
      >
        <SceneContents />
      </Canvas>
      <SnapToPresent />
      <InputBubble />
      <DebugOverlay taskBreakdown={taskBreakdown} />
    </>
  );
}
