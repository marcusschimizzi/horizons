export const SCENE_CONSTANTS = {
  // Scene atmosphere
  background: '#f5f0e8',         // Warm cream parchment
  fogDensity: 0.012,             // FogExp2 density — fade into warm light
  fogColor: '#f5f0e8',           // MUST match background to avoid color banding

  // Lighting
  ambientIntensity: 0.5,         // Higher — paper reflects light

  // Stars (disabled — no starfield in a paper world)
  starCount: 0,
  starRadius: 200,
  starDepth: 100,
  starFactor: 2,

  // Bloom (disabled — no emissive glow in a paper world)
  bloomIntensity: 0,
  bloomLuminanceThreshold: 1.0,
  bloomLuminanceSmoothing: 0.0,
  bloomMipmapBlur: false,

  // LOD (all horizons render as Html cards — perspective handles distance legibility)
  cardHorizons: ['immediate', 'this-week', 'this-month', 'this-quarter', 'this-year', 'someday'] as const,

  // Sprite (now paper note rectangles: width x height)
  spriteBaseRadius: 0.3,         // kept for compat; actual size via spriteWidth/spriteHeight
  spriteWidth: 0.55,             // PlaneGeometry width (landscape note card)
  spriteHeight: 0.38,            // PlaneGeometry height
  spriteEmissiveMultiplier: 0,   // No emissive — paper world
  spriteOpacity: 1.0,

  // Html cards
  htmlDistanceFactor: 15,        // drei Html: scale = factor/distance. At dist=12.5 (present) → 1.2× CSS size

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
