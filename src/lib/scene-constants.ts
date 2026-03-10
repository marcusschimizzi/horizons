/**
 * Static scene constants — camera physics, scroll tuning, interaction.
 * These do NOT change between themes. For theme-dependent scene values
 * (fog, bloom, stars, LOD, sprites), use useSceneConfig() or getExperienceConfig().
 */
export const SCENE_CONSTANTS = {
  // Camera
  cameraRestZ: 5,             // Default Z position — matches Canvas camera prop
  nearBoundary: 5,            // Z=5 is the present; camera cannot scroll past toward viewer
  farBoundary: -120,          // End of 'someday' band (hard stop)
  maxOverscroll: 3,           // Max Z-units rubber-band can stretch past nearBoundary
  zSmoothTime: 0.25,          // smoothTime for damp3 on Z-axis (lower = snappier)
  zUnitsPerPixel: 0.08,       // Scroll delta multiplier (~5-8 z-units per normal tick)
  springBackSmoothTime: 0.15, // Faster smoothTime for spring-back from overscroll

  // Parallax
  parallaxMaxX: 0.35,         // Max X camera shift at full mouse offset (subtle, avoids first-move jump)
  parallaxMaxY: 0.2,          // Max Y camera shift (slightly less than X)
  parallaxSmoothTime: 0.3,    // smoothTime for parallax damping (floaty feel)

  // LOD crossfade
  crossfadeDurationMs: 200,
  hysteresisBuffer: 3,        // Z-units camera must move past threshold before switching back

  // Snap-to-present
  snapDistanceThreshold: 1.5, // Z distance from cameraRestZ before snap button appears
} as const;

export type SceneConstants = typeof SCENE_CONSTANTS;
