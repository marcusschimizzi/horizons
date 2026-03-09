import type { Horizon } from './horizons';
import { lerpHex } from './color';

/**
 * Depth factor for each horizon — 0 = full dark ink, 1 = faint pencil.
 * Used by whitevoid's ink-weight system to encode temporal depth
 * directly into card styling (text, border, shadow all fade with distance).
 */
const HORIZON_DEPTH: Record<Horizon, number> = {
  'immediate':    0.0,
  'this-week':    0.15,
  'this-month':   0.35,
  'this-quarter': 0.55,
  'this-year':    0.75,
  'someday':      1.0,
};

export function getHorizonDepth(horizon: Horizon): number {
  return HORIZON_DEPTH[horizon];
}

/** Interpolate a color between dark ink and pencil gray based on horizon depth. */
export function getInkColor(horizon: Horizon, darkInk: string, pencilGray: string): string {
  return lerpHex(darkInk, pencilGray, HORIZON_DEPTH[horizon]);
}

/** Interpolate shadow alpha (higher for near, lower for far). */
export function getInkShadowAlpha(horizon: Horizon): number {
  const t = HORIZON_DEPTH[horizon];
  return 0.12 - t * 0.10; // 0.12 at immediate → 0.02 at someday
}
