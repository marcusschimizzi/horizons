import type { Horizon } from './horizons';
import { useThemeStore, themeStore } from '@/stores/theme-store';
import { EXPERIENCES } from './themes';

/** Returns horizon color map for the current experience (reactive). */
export function useHorizonColors(): Record<Horizon, string> {
  const id = useThemeStore((s) => s.experienceId);
  return EXPERIENCES[id].css.horizons;
}

/** Non-reactive version for use outside React (e.g., in Three.js frame loops). */
export function getHorizonColors(): Record<Horizon, string> {
  return EXPERIENCES[themeStore.getState().experienceId].css.horizons;
}
