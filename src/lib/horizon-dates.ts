import type { Horizon } from '@/lib/horizons';

/**
 * Map a horizon name to an appropriate target date range.
 * Used by the Reschedule action to compute new earliest/latest dates.
 */
export function horizonToDateRange(horizon: Horizon): { earliest: Date; latest: Date } {
  const now = new Date();

  const addDays = (days: number): Date => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };

  switch (horizon) {
    case 'immediate':
      return { earliest: now, latest: addDays(1) };
    case 'this-week':
      return { earliest: addDays(1), latest: addDays(7) };
    case 'this-month':
      return { earliest: addDays(7), latest: addDays(30) };
    case 'this-quarter':
      return { earliest: addDays(30), latest: addDays(90) };
    case 'this-year':
      return { earliest: addDays(90), latest: addDays(365) };
    case 'someday':
      return { earliest: addDays(365), latest: addDays(730) };
  }
}
