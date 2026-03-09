import type { Horizon } from '@/lib/horizons';

/** Row shape from the database (matches Drizzle schema select type) */
export interface TaskRow {
  id: string;
  rawInput: string;
  title: string;
  targetDateEarliest: Date | null;
  targetDateLatest: Date | null;
  hardDeadline: Date | null;
  needsRefinement: boolean;
  refinementPrompt: string | null;
  status: 'active' | 'completed' | 'dropped';
  createdAt: Date;
  updatedAt: Date;
  driftCount: number;
  tags: string[] | null;
}

/** Fuzzy date range for task targeting */
export interface DateRange {
  earliest: Date;
  latest: Date;
}

/** Client-side task with computed fields */
export interface Task extends TaskRow {
  /** Computed client-side from targetDate + now */
  horizon: Horizon;
  /** Computed from targetDate fields, null if no dates set */
  targetDate: DateRange | null;
}

/** Tag categories used for visual color mapping */
export type TagCategory = 'work' | 'personal' | 'health' | 'finance' | 'home' | 'social';

/** Map tag category to display color (used by scene nodes) */
export const TAG_COLORS: Record<TagCategory, string> = {
  work: '#5b8fb9',     // dusky blue
  personal: '#d4a053', // warm amber
  health: '#81b29a',   // moss green
  finance: '#a07cc9',  // soft violet
  home: '#c97c5d',     // burnt sienna
  social: '#c97898',   // dusty rose
};
