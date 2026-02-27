'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 24;
const DURATION = 0.8;
const MIN_SPEED = 1.5;
const MAX_SPEED = 3.5;

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

  // Create geometry with positions at origin and white-to-gold vertex colors
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3); // all zeros (origin)
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      colors[i * 3] = 1.0;                          // R = 1
      colors[i * 3 + 1] = 0.85 + Math.random() * 0.15; // G = 0.85-1.0
      colors[i * 3 + 2] = 0.4 + Math.random() * 0.6;   // B = 0.4-1.0
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

    // Advance particle positions by velocity * delta
    const posAttr = pointsRef.current.geometry.getAttribute('position');
    const posArray = posAttr.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posArray[i * 3] += velocities[i * 3] * delta;
      posArray[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      posArray[i * 3 + 2] += velocities[i * 3 + 2] * delta;
    }
    posAttr.needsUpdate = true;

    // Fade opacity
    matRef.current.opacity = 1 - elapsed / DURATION;

    invalidate();
  });

  return (
    <points ref={pointsRef} position={position} geometry={geometry}>
      <pointsMaterial
        ref={matRef}
        size={0.15}
        vertexColors
        transparent
        toneMapped={false}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
