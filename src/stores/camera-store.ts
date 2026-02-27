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
}

interface CameraActions {
  scroll: (deltaZ: number) => void;
  tick: (newZ: number, settled: boolean) => void;
}

type CameraStore = CameraState & CameraActions;

export const cameraStore = createStore<CameraStore>()((set, get) => ({
  targetZ: SCENE_CONSTANTS.cameraRestZ,
  currentZ: SCENE_CONSTANTS.cameraRestZ,
  velocity: 0,
  isAnimating: false,

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
}));

// React hook for subscribing to the camera store
export function useCameraStore<T>(selector: (state: CameraStore) => T): T {
  return useStore(cameraStore, selector);
}
