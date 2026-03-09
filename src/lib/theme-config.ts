import type { Horizon } from './horizons';

// ---------------------------------------------------------------------------
// Experience configuration types
// ---------------------------------------------------------------------------

export type ExperienceId = 'bioluminescent' | 'whitevoid';

/** Visual tokens set as CSS custom properties via [data-theme] selectors */
export interface ThemeCSSTokens {
  // Horizon colors
  horizons: Record<Horizon, string>;

  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgSurface: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Accents
  accentGlow: string;
  accentSuccess: string;
  accentRefinement: string;
  accentDrift: string;

  // Tags
  tags: {
    work: string;
    personal: string;
    health: string;
    finance: string;
    home: string;
    social: string;
  };

  // Surface treatment
  borderRadius: number;
  borderRadiusLarge: number;
  backdropBlur: number;       // px — 0 means no blur
  surfaceOpacity: number;     // 0-1 for rgba card backgrounds
}

/** Scene config consumed by Three.js (CSS variables can't express these) */
export interface ThemeSceneConfig {
  // Atmosphere
  background: string;
  fogColor: string;
  fogDensity: number;

  // Lighting
  ambientIntensity: number;
  directionalLight: { intensity: number; position: [number, number, number]; color: string } | null;

  // Stars (null = none)
  stars: { count: number; radius: number; depth: number; factor: number } | null;

  // Bloom post-processing (null = none)
  bloom: {
    intensity: number;
    luminanceThreshold: number;
    luminanceSmoothing: number;
    mipmapBlur: boolean;
  } | null;

  // LOD strategy
  lodStrategy: 'horizon-split' | 'all-cards';
  cardHorizons: readonly Horizon[];

  // Sprite config (only relevant for horizon-split LOD)
  sprite: {
    baseRadius: number;
    emissiveMultiplier: number;
    opacity: number;
    defaultColor: string;
    etherealTarget: string;
    deadlineRingColor: string;
    refinementRingColor: string;
  };

  // Html card distance scaling
  htmlDistanceFactor: number;

  // Completion burst particle color ranges (RGB 0-1)
  burstColors: {
    r: [number, number];
    g: [number, number];
    b: [number, number];
  };

  // Ink-weight depth system (whitevoid only, null for bioluminescent)
  inkWeight: {
    darkInk: string;
    pencilGray: string;
    borderDark: string;
    borderLight: string;
  } | null;

  // Paper texture support
  paperTexture: boolean;
}

/** Complete experience configuration */
export interface ExperienceConfig {
  id: ExperienceId;
  label: string;
  css: ThemeCSSTokens;
  scene: ThemeSceneConfig;
}
