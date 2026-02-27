import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  rawInput: text('raw_input').notNull(),
  title: text('title').notNull(),
  // horizon is NOT stored — computed client-side from targetDate + now
  targetDateEarliest: timestamp('target_date_earliest', { mode: 'date', withTimezone: true }),
  targetDateLatest: timestamp('target_date_latest', { mode: 'date', withTimezone: true }),
  hardDeadline: timestamp('hard_deadline', { mode: 'date', withTimezone: true }),
  needsRefinement: boolean('needs_refinement').notNull().default(false),
  refinementPrompt: text('refinement_prompt'),
  status: text('status', { enum: ['active', 'completed', 'dropped'] }).notNull().default('active'),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
  driftCount: integer('drift_count').notNull().default(0),
  tags: text('tags').array(),
});
