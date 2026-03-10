import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { SCENE_CONSTANTS } from '@/lib/scene-constants';

// ---------------------------------------------------------------------------
// Camera state — vanilla Zustand store (no React dependency)
// ---------------------------------------------------------------------------

interface CameraState {
  targetZ: number;
  currentZ: number;
  velocity: number;
  isAnimating: boolean;
  targetParallaxX: number;
  targetParallaxY: number;
  panX: number;
  panY: number;
}

interface CameraActions {
  scroll: (deltaZ: number) => void;
  tick: (newZ: number, settled: boolean) => void;
  snapToPresent: () => void;
  setParallax: (x: number, y: number) => void;
  setPan: (x: number, y: number) => void;
}

type CameraStore = CameraState & CameraActions;

export const cameraStore = createStore<CameraStore>()((set, get) => ({
  targetZ: SCENE_CONSTANTS.cameraRestZ,
  currentZ: SCENE_CONSTANTS.cameraRestZ,
  velocity: 0,
  isAnimating: false,
  targetParallaxX: 0,
  targetParallaxY: 0,
  panX: 0,
  panY: 0,

  scroll: (deltaZ: number) => {
    const { targetZ } = get();
    const { nearBoundary, farBoundary, maxOverscroll } = SCENE_CONSTANTS;

    let newTargetZ = targetZ + deltaZ;

    // Rubber-band past near boundary (present)
    if (newTargetZ > nearBoundary) {
      const overscroll = newTargetZ - nearBoundary;
      const dampedOverscroll = maxOverscroll * (1 - Math.exp(-overscroll / maxOverscroll));
      newTargetZ = nearBoundary + dampedOverscroll;
    }

    // Hard clamp at far boundary (someday depth)
    if (newTargetZ < farBoundary) {
      newTargetZ = farBoundary;
    }

    set({ targetZ: newTargetZ, velocity: deltaZ, isAnimating: true });
  },

  tick: (newZ: number, settled: boolean) => {
    if (settled) {
      const { targetZ } = get();
      set({ currentZ: targetZ, isAnimating: false, velocity: 0 });
    } else {
      set({ currentZ: newZ });
    }
  },

  snapToPresent: () => {
    set({ targetZ: SCENE_CONSTANTS.cameraRestZ, isAnimating: true });
  },

  setParallax: (x: number, y: number) => {
    set({ targetParallaxX: x, targetParallaxY: y, isAnimating: true });
  },

  setPan: (x: number, y: number) => {
    set({ panX: x, panY: y, isAnimating: true });
  },
}));

// React hook for subscribing to the camera store
export function useCameraStore<T>(selector: (state: CameraStore) => T): T {
  return useStore(cameraStore, selector);
}
