import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

// --- Zod schema for structured extraction ---

const ParsedTaskSchema = z.object({
  title: z.string().describe("A clean, concise version of the user's intention (3-8 words)"),
  targetDateEarliest: z
    .string()
    .nullable()
    .describe('ISO 8601 date string for the earliest plausible date, or null if ambiguous'),
  targetDateLatest: z
    .string()
    .nullable()
    .describe('ISO 8601 date string for the latest plausible date, or null if ambiguous'),
  tags: z
    .array(z.string())
    .describe(
      'Category tags if obvious: work, personal, health, finance, home, social. Empty array if unclear.',
    ),
  needsRefinement: z
    .boolean()
    .describe('true if the intention is vague or the date cannot be determined'),
});

export type ParsedTask = z.infer<typeof ParsedTaskSchema>;

// --- Anthropic client (reads ANTHROPIC_API_KEY from process.env) ---

const client = new Anthropic();

// --- System prompt template ---

const SYSTEM_PROMPT = `You are a task extraction assistant. Parse the user's natural language input into a structured task.

Today is {{TODAY}}.

Rules:
- Extract a concise title (3-8 words) that captures the user's intention.
- Determine targetDateEarliest and targetDateLatest as ISO 8601 date strings (YYYY-MM-DD) defining a fuzzy time window. Set both to null if truly ambiguous or no date can be inferred.
- Only assign tags if the category is obvious from the text. Valid tags: work, personal, health, finance, home, social. Use an empty array if unclear.
- Set needsRefinement to true if the intention is vague or the date cannot be determined.

Examples:
- "dentist next Tuesday" -> title: "Dentist appointment", dates: next Tuesday for both, tags: ["health"], needsRefinement: false
- "figure out taxes sometime" -> title: "Figure out taxes", dates: null, tags: ["finance"], needsRefinement: true
- "buy groceries" -> title: "Buy groceries", dates: today to tomorrow, tags: ["home"], needsRefinement: false
- "vacation in March" -> title: "Plan vacation", dates: March 1 to March 31, tags: ["personal"], needsRefinement: false
- "learn to play guitar" -> title: "Learn to play guitar", dates: null, tags: [], needsRefinement: true`;

// --- POST handler ---

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = body?.input;

    if (!input || typeof input !== 'string' || !input.trim()) {
      return Response.json(
        { error: 'input is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const response = await client.messages.parse({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT.replace('{{TODAY}}', today),
      messages: [{ role: 'user', content: input.trim() }],
      output_config: { format: zodOutputFormat(ParsedTaskSchema) },
    });

    if (response.stop_reason === 'refusal') {
      return Response.json(
        { error: 'Could not parse this input', code: 'PARSE_REFUSED' },
        { status: 422 },
      );
    }

    return Response.json(response.parsed_output);
  } catch (err) {
    console.error('Parse error:', err);
    return Response.json(
      { error: 'Failed to parse input', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
