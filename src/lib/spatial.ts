import type { Horizon } from '@/lib/horizons';
import { getZDepthRange } from '@/lib/horizons';

/**
 * Simple string hash (cyrb53) - produces a 53-bit hash from any string.
 * Deterministic: same input always produces same output.
 */
function cyrb53(str: string, seed: number = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Mulberry32 PRNG - seeded pseudo-random number generator.
 * Returns a function that produces deterministic values in [0, 1).
 */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** X/Y spread multipliers per horizon band (wider for distant bands) */
export const SPREAD_CONFIG: Record<Horizon, { xSpread: number; ySpread: number }> = {
  'immediate':    { xSpread: 4,  ySpread: 2 },
  'this-week':    { xSpread: 6,  ySpread: 3 },
  'this-month':   { xSpread: 10, ySpread: 4 },
  'this-quarter': { xSpread: 14, ySpread: 5 },
  'this-year':    { xSpread: 18, ySpread: 6 },
  'someday':      { xSpread: 22, ySpread: 7 },
};

export interface TaskPosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Compute deterministic 3D position for a task based on its ID and horizon.
 * Same ID + horizon always produces the same position.
 */
export function getTaskPosition(taskId: string, horizon: Horizon): TaskPosition {
  const hash = cyrb53(taskId);
  const rng = mulberry32(hash);

  const { zMin, zMax } = getZDepthRange(horizon);
  const { xSpread, ySpread } = SPREAD_CONFIG[horizon];

  const x = (rng() - 0.5) * 2 * xSpread;  // centered around 0
  const y = (rng() - 0.5) * 2 * ySpread;   // centered around 0
  const z = zMin + rng() * (zMax - zMin);   // within band depth range

  return { x, y, z };
}

/**
 * Soft overlap avoidance: nudge positions that are too close together.
 * Only compares tasks within the same horizon band.
 * Best-effort, not guaranteed. O(n^2) but fine for 30-200 tasks.
 */
export function applyOverlapAvoidance(
  positions: { id: string; pos: TaskPosition; horizon: Horizon }[],
  minDistance: number = 2.0,
  iterations: number = 3,
): Map<string, TaskPosition> {
  const result = new Map<string, TaskPosition>();
  const adjusted = positions.map(p => ({
    id: p.id,
    horizon: p.horizon,
    pos: { ...p.pos },
  }));

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < adjusted.length; i++) {
      for (let j = i + 1; j < adjusted.length; j++) {
        // Only compare within same horizon band
        if (adjusted[i].horizon !== adjusted[j].horizon) continue;

        const dx = adjusted[j].pos.x - adjusted[i].pos.x;
        const dy = adjusted[j].pos.y - adjusted[i].pos.y;
        const dz = adjusted[j].pos.z - adjusted[i].pos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < minDistance && dist > 0.001) {
          const pushForce = (minDistance - dist) / dist * 0.5;
          adjusted[i].pos.x -= dx * pushForce;
          adjusted[i].pos.y -= dy * pushForce;
          adjusted[j].pos.x += dx * pushForce;
          adjusted[j].pos.y += dy * pushForce;
          // Don't push Z -- keep within band
        }
      }
    }
  }

  adjusted.forEach(a => result.set(a.id, a.pos));
  return result;
}
