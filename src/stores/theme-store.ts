import { createStore } from 'zustand/vanilla';
import { persist } from 'zustand/middleware';
import { useStore } from 'zustand';
import type { ExperienceId } from '@/lib/theme-config';
import { EXPERIENCES } from '@/lib/themes';

// ---------------------------------------------------------------------------
// Theme state — vanilla Zustand store (Canvas-compatible, no React context)
// ---------------------------------------------------------------------------

interface ThemeState {
  experienceId: ExperienceId;
}

interface ThemeActions {
  setExperience: (id: ExperienceId) => void;
  toggleExperience: () => void;
}

type ThemeStore = ThemeState & ThemeActions;

export const themeStore = createStore<ThemeStore>()(
  persist(
    (set, get) => ({
      experienceId: 'bioluminescent',

      setExperience: (id: ExperienceId) => {
        set({ experienceId: id });
      },

      toggleExperience: () => {
        const { experienceId } = get();
        set({
          experienceId: experienceId === 'bioluminescent' ? 'whitevoid' : 'bioluminescent',
        });
      },
    }),
    {
      name: 'horizons-experience',
    },
  ),
);

/** Get the full config for the current experience (non-reactive). */
export function getExperienceConfig() {
  return EXPERIENCES[themeStore.getState().experienceId];
}

/** React hook for subscribing to the theme store. */
export function useThemeStore<T>(selector: (state: ThemeStore) => T): T {
  return useStore(themeStore, selector);
}

/** React hook — returns the full ExperienceConfig for the current experience. */
export function useExperienceConfig() {
  const id = useThemeStore((s) => s.experienceId);
  return EXPERIENCES[id];
}

/** React hook — returns the scene config for the current experience. */
export function useSceneConfig() {
  const id = useThemeStore((s) => s.experienceId);
  return EXPERIENCES[id].scene;
}
