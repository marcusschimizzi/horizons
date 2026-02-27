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
  bloomIntensity: 1.5,           // Starting value, tune visually
  bloomLuminanceThreshold: 1,    // Only toneMapped=false materials glow
  bloomLuminanceSmoothing: 0.025,
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
} as const;

export type SceneConstants = typeof SCENE_CONSTANTS;
