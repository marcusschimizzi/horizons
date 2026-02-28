export const SCENE_CONSTANTS = {
  // Scene atmosphere
  background: '#0a0a0f',         // Near-black with faint blue hint
  fogDensity: 0.015,             // FogExp2 density — moderate, proximity=clarity
  fogColor: '#0a0a0f',           // MUST match background to avoid color banding

  // Lighting
  ambientIntensity: 0.15,        // Minimal ambient

  // Stars
  starCount: 300,                // Sparse (200-400 range)
  starRadius: 200,
  starDepth: 100,
  starFactor: 2,

  // Bloom
  bloomIntensity: 1.8,           // Tuned: stronger glow through fog for depth hierarchy
  bloomLuminanceThreshold: 0.15, // Lower threshold so more emissive surfaces catch bloom
  bloomLuminanceSmoothing: 0.015, // Tighter smoothing for cleaner glow edges
  bloomMipmapBlur: true,

  // LOD (horizon-based categorical split)
  cardHorizons: ['immediate', 'this-week'] as const,

  // Sprite
  spriteBaseRadius: 0.3,         // Base circle radius
  spriteEmissiveMultiplier: 1.5, // Color multiplier for bloom trigger
  spriteOpacity: 0.9,

  // Html cards
  htmlDistanceFactor: 10,        // drei Html distanceFactor — start here, tune visually

  // LOD crossfade
  crossfadeDurationMs: 200,

  // Hysteresis buffer (z-units camera must move past threshold before switching back)
  hysteresisBuffer: 3,

  // Camera
  cameraRestZ: 10,            // Default Z position — matches Canvas camera prop
  nearBoundary: 10,           // Z=10 is the present; camera cannot scroll past toward viewer
  farBoundary: -120,          // End of 'someday' band (hard stop)
  maxOverscroll: 3,           // Max Z-units rubber-band can stretch past nearBoundary
  zSmoothTime: 0.25,          // smoothTime for damp3 on Z-axis (lower = snappier)
  zUnitsPerPixel: 0.08,       // Scroll delta multiplier (~5-8 z-units per normal tick)
  springBackSmoothTime: 0.15, // Faster smoothTime for spring-back from overscroll

  // Parallax
  parallaxMaxX: 0.8,          // Max X camera shift at full mouse offset (~0.5-1 unit subtle)
  parallaxMaxY: 0.5,          // Max Y camera shift (slightly less than X)
  parallaxSmoothTime: 0.3,    // smoothTime for parallax damping (floaty feel)

  // Snap-to-present
  snapDistanceThreshold: 1.5, // Z distance from cameraRestZ before snap button appears
} as const;

export type SceneConstants = typeof SCENE_CONSTANTS;
