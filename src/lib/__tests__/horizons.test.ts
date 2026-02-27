import { describe, it, expect } from 'vitest';
import {
  getHorizon,
  getZDepth,
  getZDepthRange,
  HORIZON_BANDS,
} from '@/lib/horizons';
import type { DateRange } from '@/types/task';

/** Helper: create a DateRange centered around `now + days` */
function dateRangeAt(daysFromNow: number, spreadDays: number = 0, now: Date = new Date()): DateRange {
  const center = now.getTime() + daysFromNow * 24 * 60 * 60 * 1000;
  const halfSpread = (spreadDays / 2) * 24 * 60 * 60 * 1000;
  return {
    earliest: new Date(center - halfSpread),
    latest: new Date(center + halfSpread),
  };
}

describe('getHorizon', () => {
  const now = new Date('2026-03-01T12:00:00Z');

  it('returns "someday" when targetDate is undefined', () => {
    expect(getHorizon(undefined, now)).toBe('someday');
  });

  it('returns "immediate" for tomorrow (within 1 day)', () => {
    const range = dateRangeAt(0.5, 0, now); // 12 hours from now
    expect(getHorizon(range, now)).toBe('immediate');
  });

  it('returns "this-week" for 3-5 days out', () => {
    const range = dateRangeAt(4, 2, now); // midpoint = 4 days
    expect(getHorizon(range, now)).toBe('this-week');
  });

  it('returns "this-month" for 14-20 days out', () => {
    const range = dateRangeAt(17, 6, now); // midpoint = 17 days
    expect(getHorizon(range, now)).toBe('this-month');
  });

  it('returns "this-quarter" for 60-70 days out', () => {
    const range = dateRangeAt(65, 10, now); // midpoint = 65 days
    expect(getHorizon(range, now)).toBe('this-quarter');
  });

  it('returns "this-year" for 200-250 days out', () => {
    const range = dateRangeAt(225, 50, now); // midpoint = 225 days
    expect(getHorizon(range, now)).toBe('this-year');
  });

  it('returns "someday" for 400-500 days out', () => {
    const range = dateRangeAt(450, 100, now); // midpoint = 450 days
    expect(getHorizon(range, now)).toBe('someday');
  });

  it('returns "immediate" for overdue/past dates', () => {
    const range = dateRangeAt(-1, 0, now); // yesterday
    expect(getHorizon(range, now)).toBe('immediate');
  });

  it('handles boundary: exactly 1 day returns "immediate"', () => {
    const range = dateRangeAt(1, 0, now);
    expect(getHorizon(range, now)).toBe('immediate');
  });

  it('handles boundary: exactly 7 days returns "this-week"', () => {
    const range = dateRangeAt(7, 0, now);
    expect(getHorizon(range, now)).toBe('this-week');
  });

  it('handles boundary: exactly 30 days returns "this-month"', () => {
    const range = dateRangeAt(30, 0, now);
    expect(getHorizon(range, now)).toBe('this-month');
  });

  it('handles boundary: exactly 90 days returns "this-quarter"', () => {
    const range = dateRangeAt(90, 0, now);
    expect(getHorizon(range, now)).toBe('this-quarter');
  });

  it('handles boundary: exactly 365 days returns "this-year"', () => {
    const range = dateRangeAt(365, 0, now);
    expect(getHorizon(range, now)).toBe('this-year');
  });

  it('returns "someday" for dates just beyond 365 days', () => {
    const range = dateRangeAt(366, 0, now);
    expect(getHorizon(range, now)).toBe('someday');
  });
});

describe('getZDepth', () => {
  it('returns -2.5 for immediate (midpoint of 0 to -5)', () => {
    expect(getZDepth('immediate')).toBe(-2.5);
  });

  it('returns -10 for this-week (midpoint of -5 to -15)', () => {
    expect(getZDepth('this-week')).toBe(-10);
  });

  it('returns -22.5 for this-month (midpoint of -15 to -30)', () => {
    expect(getZDepth('this-month')).toBe(-22.5);
  });

  it('returns -40 for this-quarter (midpoint of -30 to -50)', () => {
    expect(getZDepth('this-quarter')).toBe(-40);
  });

  it('returns -65 for this-year (midpoint of -50 to -80)', () => {
    expect(getZDepth('this-year')).toBe(-65);
  });

  it('returns -100 for someday (midpoint of -80 to -120)', () => {
    expect(getZDepth('someday')).toBe(-100);
  });
});

describe('getZDepthRange', () => {
  it('returns { zMin: 0, zMax: -5 } for immediate', () => {
    expect(getZDepthRange('immediate')).toEqual({ zMin: 0, zMax: -5 });
  });

  it('returns { zMin: -5, zMax: -15 } for this-week', () => {
    expect(getZDepthRange('this-week')).toEqual({ zMin: -5, zMax: -15 });
  });

  it('returns { zMin: -15, zMax: -30 } for this-month', () => {
    expect(getZDepthRange('this-month')).toEqual({ zMin: -15, zMax: -30 });
  });

  it('returns { zMin: -30, zMax: -50 } for this-quarter', () => {
    expect(getZDepthRange('this-quarter')).toEqual({ zMin: -30, zMax: -50 });
  });

  it('returns { zMin: -50, zMax: -80 } for this-year', () => {
    expect(getZDepthRange('this-year')).toEqual({ zMin: -50, zMax: -80 });
  });

  it('returns { zMin: -80, zMax: -120 } for someday', () => {
    expect(getZDepthRange('someday')).toEqual({ zMin: -80, zMax: -120 });
  });
});

describe('HORIZON_BANDS', () => {
  it('has exactly 6 horizon bands', () => {
    expect(HORIZON_BANDS).toHaveLength(6);
  });

  it('bands are ordered from nearest to farthest', () => {
    const names = HORIZON_BANDS.map(b => b.name);
    expect(names).toEqual([
      'immediate',
      'this-week',
      'this-month',
      'this-quarter',
      'this-year',
      'someday',
    ]);
  });

  it('each band has contiguous Z ranges (no gaps)', () => {
    for (let i = 1; i < HORIZON_BANDS.length; i++) {
      expect(HORIZON_BANDS[i].zMin).toBe(HORIZON_BANDS[i - 1].zMax);
    }
  });
});
