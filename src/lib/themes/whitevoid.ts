import type { ExperienceConfig } from '../theme-config';
import type { Horizon } from '../horizons';

const ALL_HORIZONS: readonly Horizon[] = [
  'immediate', 'this-week', 'this-month', 'this-quarter', 'this-year', 'someday',
] as const;

export const whitevoid: ExperienceConfig = {
  id: 'whitevoid',
  label: 'White Void',
  css: {
    horizons: {
      'immediate': '#c0392b',
      'this-week': '#e76b2e',
      'this-month': '#1e3a5f',
      'this-quarter': '#2d5016',
      'this-year': '#4a2c6b',
      'someday': '#8b7d6b',
    },
    bgPrimary: '#f5f0e8',
    bgSecondary: '#eee8dd',
    bgSurface: '#fdf8f0',
    textPrimary: '#1a1605',
    textSecondary: '#4a3f30',
    textMuted: '#8b7d6b',
    accentGlow: '#1a1605',
    accentSuccess: '#2d5016',
    accentRefinement: '#1e3a5f',
    accentDrift: '#7c3a2b',
    tags: {
      work: '#1e3a5f',
      personal: '#8b4513',
      health: '#2d5016',
      finance: '#4a2c6b',
      home: '#7c3a2b',
      social: '#8b2252',
    },
    borderRadius: 2,
    borderRadiusLarge: 4,
    backdropBlur: 0,
    surfaceOpacity: 0.95,
  },
  scene: {
    background: '#f5f0e8',
    fogColor: '#f5f0e8',
    fogDensity: 0.008,
    ambientIntensity: 0.6,
    directionalLight: { intensity: 0.4, position: [5, 10, 5], color: '#fff8f0' },
    stars: null,
    bloom: null,
    lodStrategy: 'all-cards',
    cardHorizons: ALL_HORIZONS,
    sprite: {
      baseRadius: 0.3,
      emissiveMultiplier: 1.0,
      opacity: 0.9,
      defaultColor: '#8b7d6b',
      etherealTarget: '#d4ccc4',
      deadlineRingColor: '#c0392b',
      refinementRingColor: '#1e3a5f',
    },
    htmlDistanceFactor: 8,
    burstColors: {
      r: [0.10, 0.30],
      g: [0.08, 0.20],
      b: [0.02, 0.10],
    },
    inkWeight: {
      darkInk: '#1a1605',
      pencilGray: '#b8ac9e',
      borderDark: '#8b7d6b',
      borderLight: '#d4ccc4',
    },
    paperTexture: true,
  },
};
