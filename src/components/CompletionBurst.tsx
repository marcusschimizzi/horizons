'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getExperienceConfig } from '@/stores/theme-store';

const PARTICLE_COUNT = 24;
const DURATION = 0.8;
const MIN_SPEED = 1.2;
const MAX_SPEED = 2.8;

interface CompletionBurstProps {
  position: [number, number, number];
  onComplete: () => void;
}

export function CompletionBurst({ position, onComplete }: CompletionBurstProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const startTime = useRef<number | null>(null);
  const invalidate = useThree((state) => state.invalidate);

  // Pre-compute velocities for each particle (random spherical directions)
  const velocities = useMemo(() => {
    const vels = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
      vels[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      vels[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      vels[i * 3 + 2] = Math.cos(phi) * speed;
    }
    return vels;
  }, []);

  // Create geometry with positions at origin and themed vertex colors
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const { burstColors } = getExperienceConfig().scene;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = Math.random();
      colors[i * 3] = burstColors.r[0] + t * (burstColors.r[1] - burstColors.r[0]);
      colors[i * 3 + 1] = burstColors.g[0] + t * (burstColors.g[1] - burstColors.g[0]);
      colors[i * 3 + 2] = burstColors.b[0] + t * (burstColors.b[1] - burstColors.b[0]);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  useFrame((_state, delta) => {
    if (!pointsRef.current || !matRef.current) return;

    if (startTime.current === null) {
      startTime.current = 0;
    }

    startTime.current += delta;
    const elapsed = startTime.current;

    if (elapsed > DURATION) {
      onComplete();
      return;
    }

    const posAttr = pointsRef.current.geometry.getAttribute('position');
    const posArray = posAttr.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posArray[i * 3] += velocities[i * 3] * delta;
      posArray[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      posArray[i * 3 + 2] += velocities[i * 3 + 2] * delta;
    }
    posAttr.needsUpdate = true;

    matRef.current.opacity = 1 - elapsed / DURATION;

    invalidate();
  });

  return (
    <points ref={pointsRef} position={position} geometry={geometry}>
      <pointsMaterial
        ref={matRef}
        size={0.2}
        vertexColors
        transparent
        toneMapped={false}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
