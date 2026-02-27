export type Horizon = 'immediate' | 'this-week' | 'this-month' | 'this-quarter' | 'this-year' | 'someday';

export interface HorizonBand {
  name: Horizon;
  zMin: number;
  zMax: number;
}

export const HORIZON_BANDS: HorizonBand[] = [
  { name: 'immediate',    zMin: 0,   zMax: -5 },
  { name: 'this-week',    zMin: -5,  zMax: -15 },
  { name: 'this-month',   zMin: -15, zMax: -30 },
  { name: 'this-quarter', zMin: -30, zMax: -50 },
  { name: 'this-year',    zMin: -50, zMax: -80 },
  { name: 'someday',      zMin: -80, zMax: -120 },
];

/** DateRange representing a fuzzy target date window */
interface DateRange {
  earliest: Date;
  latest: Date;
}

/**
 * Compute which horizon a task falls into based on its target date and the current time.
 * Tasks without a targetDate default to 'someday'.
 * Past/overdue dates clamp to 'immediate' (show up closest to user).
 */
export function getHorizon(targetDate: DateRange | undefined | null, now: Date = new Date()): Horizon {
  if (!targetDate) return 'someday';

  const midpoint = new Date((targetDate.earliest.getTime() + targetDate.latest.getTime()) / 2);
  const daysOut = (midpoint.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysOut <= 1) return 'immediate';
  if (daysOut <= 7) return 'this-week';
  if (daysOut <= 30) return 'this-month';
  if (daysOut <= 90) return 'this-quarter';
  if (daysOut <= 365) return 'this-year';
  return 'someday';
}

/**
 * Get the midpoint Z-depth for a given horizon.
 */
export function getZDepth(horizon: Horizon): number {
  const band = HORIZON_BANDS.find(b => b.name === horizon);
  if (!band) throw new Error(`Unknown horizon: ${horizon}`);
  return (band.zMin + band.zMax) / 2;
}

/**
 * Get the Z-depth range for a given horizon.
 */
export function getZDepthRange(horizon: Horizon): { zMin: number; zMax: number } {
  const band = HORIZON_BANDS.find(b => b.name === horizon);
  if (!band) throw new Error(`Unknown horizon: ${horizon}`);
  return { zMin: band.zMin, zMax: band.zMax };
}
