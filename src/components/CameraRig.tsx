'use client';

import { useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { damp3 } from 'maath/easing';
import normalizeWheel from 'normalize-wheel-es';

import { cameraStore } from '@/stores/camera-store';
import { SCENE_CONSTANTS } from '@/lib/scene-constants';

// ---------------------------------------------------------------------------
// CameraRig — scroll-driven Z-axis camera with damping, parallax, snap-to-present
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
      cameraStore.getState().scroll(-pixelY * SCENE_CONSTANTS.zUnitsPerPixel);
      invalidate();
    };

    domElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      domElement.removeEventListener('wheel', handleWheel);
    };
  }, [gl, invalidate]);

  // -- Parallax: mouse tracking on canvas element
  useEffect(() => {
    const domElement = gl.domElement;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      cameraStore.getState().setParallax(
        nx * SCENE_CONSTANTS.parallaxMaxX,
        -ny * SCENE_CONSTANTS.parallaxMaxY,
      );
      invalidate();
    };

    const handlePointerLeave = () => {
      cameraStore.getState().setParallax(0, 0);
      invalidate();
    };

    domElement.addEventListener('pointermove', handlePointerMove);
    domElement.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [gl, invalidate]);

  // -- Keyboard shortcut: Home key -> snap to present
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Home') {
        e.preventDefault();
        cameraStore.getState().snapToPresent();
        invalidate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [invalidate]);

  // -- Store subscription bridge: trigger invalidation when isAnimating set from outside Canvas
  useEffect(() => {
    const unsubscribe = cameraStore.subscribe((state) => {
      if (state.isAnimating) invalidate();
    });
    return unsubscribe;
  }, [invalidate]);

  // -- useFrame: damp camera.position toward target (Z + pan X/Y + parallax X/Y)
  useFrame((_state, delta) => {
    const { isAnimating, targetZ, velocity, targetParallaxX, targetParallaxY, panX, panY } = cameraStore.getState();
    if (!isAnimating) return;

    const { nearBoundary, zSmoothTime, springBackSmoothTime, parallaxSmoothTime } = SCENE_CONSTANTS;

    // Spring-back: if past near boundary and user stopped scrolling, snap target back
    let effectiveTargetZ = targetZ;
    if (targetZ > nearBoundary && Math.abs(velocity) < 0.5) {
      cameraStore.setState({ targetZ: nearBoundary });
      effectiveTargetZ = nearBoundary;
    }

    // Choose smooth time: faster for spring-back, normal otherwise
    const isSpringBack = camera.position.z > nearBoundary && effectiveTargetZ === nearBoundary;
    const zSmooth = isSpringBack ? springBackSmoothTime : zSmoothTime;

    // Use the slower of zSmooth / parallaxSmoothTime for the combined damp
    // so parallax feels floaty while Z remains responsive
    const combinedSmooth = Math.max(zSmooth, parallaxSmoothTime);

    const targetX = panX + targetParallaxX;
    const targetY = panY + targetParallaxY;

    // Damp camera position toward target (mutates camera.position in-place)
    damp3(
      camera.position,
      [targetX, targetY, effectiveTargetZ],
      combinedSmooth,
      delta,
    );

    // Settle detection — all three axes must be within epsilon
    const settledX = Math.abs(camera.position.x - targetX) < 0.01;
    const settledY = Math.abs(camera.position.y - targetY) < 0.01;
    const settledZ = Math.abs(camera.position.z - effectiveTargetZ) < 0.01;

    if (settledX && settledY && settledZ) {
      cameraStore.getState().tick(effectiveTargetZ, true);
    } else {
      cameraStore.getState().tick(camera.position.z, false);
      invalidate();
    }
  });

  return null;
}
