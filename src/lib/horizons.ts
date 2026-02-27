export type Horizon = 'immediate' | 'this-week' | 'this-month' | 'this-quarter' | 'this-year' | 'someday';

export interface HorizonBand {
  name: Horizon;
  zMin: number;
  zMax: number;
}

// Stub — full implementation in TDD task
export const HORIZON_BANDS: HorizonBand[] = [];
export function getHorizon(): Horizon { return 'someday'; }
export function getZDepth(_horizon: Horizon): number { return 0; }
export function getZDepthRange(_horizon: Horizon): { zMin: number; zMax: number } { return { zMin: 0, zMax: 0 }; }
