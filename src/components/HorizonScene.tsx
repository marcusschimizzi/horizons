'use client';

import { useContext, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

import { SCENE_CONSTANTS } from '@/lib/scene-constants';
import { TaskStoreContext, useTasksWithHorizon } from '@/stores/task-store';
import { getTaskPosition, applyOverlapAvoidance } from '@/lib/spatial';

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
// TaskPlaceholders — renders small spheres at each task position
// ---------------------------------------------------------------------------

function TaskPlaceholders() {
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
          <mesh position={[pos.x, pos.y, pos.z]} key={task.id}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color="white" />
          </mesh>
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
      <TaskPlaceholders />
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
  return (
    <Canvas
      frameloop="demand"
      camera={{ position: [0, 0, 10], fov: 60 }}
      style={{
        width: '100%',
        height: '100%',
        background: SCENE_CONSTANTS.background,
      }}
    >
      <SceneContents />
    </Canvas>
  );
}
