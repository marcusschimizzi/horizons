import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { hash } from 'bcryptjs';
import { tasks, users } from './schema';

const now = new Date();

function daysFromNow(d: number): Date {
  const date = new Date(now);
  date.setDate(date.getDate() + d);
  return date;
}

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  const db = drizzle(pool);

  console.log('Wiping existing tasks and users...');
  await db.delete(tasks);
  await db.delete(users);

  console.log('Creating seed user...');
  const hashedPassword = await hash('password', 12);
  const [seedUser] = await db.insert(users).values({
    name: 'Marcus',
    email: 'marcus@horizon.dev',
    password: hashedPassword,
  }).returning();

  const userId = seedUser.id;
  console.log(`Created user: ${seedUser.email} (id: ${userId})`);

  const seedData = [
    // ── Immediate (0-1 days) — 8 tasks ──────────────────────────────
    {
      userId,
      title: "Reply to Sarah's email about weekend plans",
      rawInput: "Reply to Sarah's email about weekend plans",
      targetDateEarliest: daysFromNow(0),
      targetDateLatest: daysFromNow(0),
      tags: ['social'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Pick up prescription from CVS',
      rawInput: 'Pick up prescription from CVS',
      targetDateEarliest: daysFromNow(0),
      targetDateLatest: daysFromNow(1),
      tags: ['health'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Call dentist to confirm Thursday appointment',
      rawInput: 'Call dentist to confirm Thursday appointment',
      targetDateEarliest: daysFromNow(0),
      targetDateLatest: daysFromNow(0),
      hardDeadline: daysFromNow(1),
      tags: ['health'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Submit expense report for client dinner',
      rawInput: 'Submit expense report for client dinner last week',
      targetDateEarliest: daysFromNow(0),
      targetDateLatest: daysFromNow(1),
      hardDeadline: daysFromNow(1),
      tags: ['work'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Fix leaking kitchen faucet',
      rawInput: 'Fix leaking kitchen faucet - getting worse',
      targetDateEarliest: daysFromNow(0),
      targetDateLatest: daysFromNow(1),
      tags: ['home'],
      status: 'active' as const,
    },
    {
      userId,
      title: "Buy birthday gift for Mom",
      rawInput: "Buy birthday gift for Mom - her birthday is in 3 days",
      targetDateEarliest: daysFromNow(0),
      targetDateLatest: daysFromNow(0),
      hardDeadline: daysFromNow(2),
      tags: ['personal'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Review lease renewal letter',
      rawInput: 'Review lease renewal letter from landlord',
      targetDateEarliest: daysFromNow(0),
      targetDateLatest: daysFromNow(1),
      tags: ['home'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Prep slides for Monday standup',
      rawInput: 'Prep slides for Monday standup - sprint metrics',
      targetDateEarliest: daysFromNow(0),
      targetDateLatest: daysFromNow(1),
      tags: ['work'],
      status: 'active' as const,
    },

    // ── This Week (2-7 days) — 7 tasks ──────────────────────────────
    {
      userId,
      title: 'Dentist appointment Thursday',
      rawInput: 'Dentist appointment Thursday at 2pm',
      targetDateEarliest: daysFromNow(3),
      targetDateLatest: daysFromNow(3),
      hardDeadline: daysFromNow(3),
      tags: ['health'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Grocery run for the week',
      rawInput: 'Grocery run - need meal prep ingredients',
      targetDateEarliest: daysFromNow(2),
      targetDateLatest: daysFromNow(3),
      tags: ['personal'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Schedule car oil change',
      rawInput: 'Schedule car oil change - 3k miles overdue',
      targetDateEarliest: daysFromNow(3),
      targetDateLatest: daysFromNow(5),
      tags: ['personal'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Finish quarterly self-review',
      rawInput: 'Finish quarterly self-review for manager',
      targetDateEarliest: daysFromNow(4),
      targetDateLatest: daysFromNow(5),
      hardDeadline: daysFromNow(6),
      tags: ['work'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Return library books',
      rawInput: 'Return library books - 2 overdue already',
      targetDateEarliest: daysFromNow(2),
      targetDateLatest: daysFromNow(4),
      driftCount: 2,
      tags: ['personal'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Call landlord about AC filter replacement',
      rawInput: 'Call landlord about AC filter - running loud',
      targetDateEarliest: daysFromNow(3),
      targetDateLatest: daysFromNow(5),
      tags: ['home'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Plan weekend hike route',
      rawInput: 'Plan weekend hike route with Alex and Jamie',
      targetDateEarliest: daysFromNow(4),
      targetDateLatest: daysFromNow(6),
      tags: ['social'],
      status: 'active' as const,
    },

    // ── This Month (8-30 days) — 6 tasks ────────────────────────────
    {
      userId,
      title: 'File Q1 estimated taxes',
      rawInput: 'File Q1 estimated taxes - freelance income',
      targetDateEarliest: daysFromNow(12),
      targetDateLatest: daysFromNow(15),
      hardDeadline: daysFromNow(18),
      tags: ['finance'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Book flights for spring trip to Portland',
      rawInput: 'Book flights for spring trip to Portland - prices going up',
      targetDateEarliest: daysFromNow(10),
      targetDateLatest: daysFromNow(14),
      driftCount: 1,
      tags: ['personal'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Annual physical checkup',
      rawInput: 'Annual physical checkup - need to schedule',
      targetDateEarliest: daysFromNow(14),
      targetDateLatest: daysFromNow(21),
      tags: ['health'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Replace bathroom caulking',
      rawInput: 'Replace bathroom caulking - mildew along the tub',
      targetDateEarliest: daysFromNow(8),
      targetDateLatest: daysFromNow(12),
      tags: ['home'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Set up automated savings transfer',
      rawInput: 'Set up automated savings transfer - $500/mo to HYSA',
      targetDateEarliest: daysFromNow(10),
      targetDateLatest: daysFromNow(15),
      tags: ['finance'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Coffee catch-up with Jake',
      rawInput: "Coffee catch-up with Jake - haven't seen him in months",
      targetDateEarliest: daysFromNow(14),
      targetDateLatest: daysFromNow(20),
      tags: ['social'],
      status: 'active' as const,
    },

    // ── This Quarter (31-90 days) — 6 tasks ─────────────────────────
    {
      userId,
      title: 'Plan summer vacation itinerary',
      rawInput: 'Plan summer vacation itinerary - thinking Greece or Croatia',
      targetDateEarliest: daysFromNow(35),
      targetDateLatest: daysFromNow(42),
      needsRefinement: true,
      refinementPrompt: 'What specific destinations are you considering? Break this into bookable steps: flights, accommodations, activities.',
      tags: ['personal'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Get quotes for fence repair',
      rawInput: 'Get quotes for fence repair - back section falling over',
      targetDateEarliest: daysFromNow(40),
      targetDateLatest: daysFromNow(50),
      driftCount: 2,
      tags: ['home'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Renew passport',
      rawInput: 'Renew passport - expires in 6 months',
      targetDateEarliest: daysFromNow(45),
      targetDateLatest: daysFromNow(55),
      hardDeadline: daysFromNow(75),
      driftCount: 2,
      tags: ['personal'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Research 401k rebalancing options',
      rawInput: 'Research 401k rebalancing options - too heavy in tech',
      targetDateEarliest: daysFromNow(50),
      targetDateLatest: daysFromNow(60),
      needsRefinement: true,
      refinementPrompt: 'What is your current allocation and target allocation? Do you want to rebalance manually or set up auto-rebalancing?',
      tags: ['finance'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Deep clean garage',
      rawInput: 'Deep clean garage - donate old stuff, organize tools',
      targetDateEarliest: daysFromNow(55),
      targetDateLatest: daysFromNow(65),
      driftCount: 3,
      tags: ['home'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Sign up for pottery class',
      rawInput: 'Sign up for pottery class at community center',
      targetDateEarliest: daysFromNow(40),
      targetDateLatest: daysFromNow(50),
      tags: ['personal'],
      status: 'active' as const,
    },

    // ── This Year (91-365 days) — 5 tasks ───────────────────────────
    {
      userId,
      title: 'Train for fall half-marathon',
      rawInput: 'Train for fall half-marathon - need a 16-week plan',
      targetDateEarliest: daysFromNow(120),
      targetDateLatest: daysFromNow(130),
      needsRefinement: true,
      refinementPrompt: 'Which race are you targeting? What is your current weekly mileage? Break into training phases.',
      tags: ['health'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Learn basic conversational Spanish',
      rawInput: 'Learn basic conversational Spanish before the trip',
      targetDateEarliest: daysFromNow(150),
      targetDateLatest: daysFromNow(165),
      driftCount: 1,
      tags: ['personal'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Build raised garden beds',
      rawInput: 'Build raised garden beds in the backyard',
      targetDateEarliest: daysFromNow(95),
      targetDateLatest: daysFromNow(105),
      tags: ['home'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Replace living room carpet',
      rawInput: 'Replace living room carpet - looking at hardwood or LVP',
      targetDateEarliest: daysFromNow(180),
      targetDateLatest: daysFromNow(200),
      driftCount: 2,
      tags: ['home'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Plan Thanksgiving hosting',
      rawInput: 'Plan Thanksgiving hosting - guest list, menu, seating',
      targetDateEarliest: daysFromNow(250),
      targetDateLatest: daysFromNow(260),
      hardDeadline: daysFromNow(270),
      tags: ['social'],
      status: 'active' as const,
    },

    // ── Someday (no dates) — 4 tasks ────────────────────────────────
    {
      userId,
      title: 'Write a short story',
      rawInput: 'Write a short story - been thinking about it for years',
      needsRefinement: true,
      refinementPrompt: 'What genre or topic interests you? Set a target word count and a first-draft deadline.',
      tags: ['personal'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Visit Japan',
      rawInput: 'Visit Japan - Tokyo, Kyoto, maybe Osaka',
      tags: ['personal'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Learn to sail',
      rawInput: 'Learn to sail - check local sailing clubs',
      tags: ['personal'],
      status: 'active' as const,
    },
    {
      userId,
      title: 'Build a custom standing desk',
      rawInput: 'Build a custom standing desk - walnut top, adjustable legs',
      tags: ['home'],
      status: 'active' as const,
    },
  ];

  console.log(`Seeding ${seedData.length} tasks...`);
  await db.insert(tasks).values(seedData);

  console.log(`Seeded ${seedData.length} tasks successfully.`);
  console.log(`\nLogin with: marcus@horizon.dev / password`);
  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
