import { pgTable, text, timestamp, boolean, integer, primaryKey } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import type { AdapterAccountType } from 'next-auth/adapters';

// ---------------------------------------------------------------------------
// Auth.js tables (required by @auth/drizzle-adapter)
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified', { mode: 'date', withTimezone: true }),
  image: text('image'),
  password: text('password'), // hashed — for Credentials provider
});

export const accounts = pgTable('accounts', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').$type<AdapterAccountType>().notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (account) => [
  primaryKey({ columns: [account.provider, account.providerAccountId] }),
]);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
}, (vt) => [
  primaryKey({ columns: [vt.identifier, vt.token] }),
]);

// ---------------------------------------------------------------------------
// Application tables
// ---------------------------------------------------------------------------

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
