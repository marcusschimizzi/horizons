'use client';

import { useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { damp3 } from 'maath/easing';
import normalizeWheel from 'normalize-wheel-es';

import { cameraStore } from '@/stores/camera-store';
import { SCENE_CONSTANTS } from '@/lib/scene-constants';

// ---------------------------------------------------------------------------
// CameraRig — scroll-driven Z-axis camera movement with damping + boundaries
// ---------------------------------------------------------------------------

export function CameraRig() {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  // -- Wheel event handler: scroll -> camera Z movement
  useEffect(() => {
    const domElement = gl.domElement;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { pixelY } = normalizeWheel(e);
      // Negative: scrolling down (positive pixelY) moves camera into future (negative Z)
      cameraStore.getState().scroll(-pixelY * SCENE_CONSTANTS.zUnitsPerPixel);
      invalidate();
    };

    domElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      domElement.removeEventListener('wheel', handleWheel);
    };
  }, [gl, invalidate]);

  // -- useFrame: damp camera.position toward target
  useFrame((_state, delta) => {
    const { isAnimating, targetZ, velocity } = cameraStore.getState();
    if (!isAnimating) return;

    const { nearBoundary, zSmoothTime, springBackSmoothTime } = SCENE_CONSTANTS;

    // Spring-back: if past near boundary and user stopped scrolling, snap target back
    let effectiveTargetZ = targetZ;
    if (targetZ > nearBoundary && Math.abs(velocity) < 0.5) {
      cameraStore.setState({ targetZ: nearBoundary });
      effectiveTargetZ = nearBoundary;
    }

    // Choose smooth time: faster for spring-back, normal otherwise
    const isSpringBack = camera.position.z > nearBoundary && effectiveTargetZ === nearBoundary;
    const smoothTime = isSpringBack ? springBackSmoothTime : zSmoothTime;

    // Damp camera position toward target (mutates camera.position in-place)
    damp3(camera.position, [0, 0, effectiveTargetZ], smoothTime, delta);

    // Settle detection
    if (Math.abs(camera.position.z - effectiveTargetZ) < 0.01) {
      cameraStore.getState().tick(effectiveTargetZ, true);
    } else {
      cameraStore.getState().tick(camera.position.z, false);
      invalidate();
    }
  });

  return null;
}
