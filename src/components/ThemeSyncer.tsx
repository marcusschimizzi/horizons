'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/theme-store';

/**
 * Sets `data-theme` on <html> when experienceId changes.
 * Font family CSS vars are handled in globals.css via [data-theme] selectors,
 * but we need JS to actually toggle the attribute.
 */
export function ThemeSyncer() {
  const experienceId = useThemeStore((s) => s.experienceId);

  useEffect(() => {
    document.documentElement.dataset.theme = experienceId;
  }, [experienceId]);

  return null;
}
