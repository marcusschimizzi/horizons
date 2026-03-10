import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { getRequiredUserId } from '@/lib/auth-helpers';

// --- Zod schemas for structured output ---

const RefinementOutputSchema = z.object({
  clarifyingQuestion: z.string().describe(
    'A thoughtful question to help clarify this task — what would "done" look like?',
  ),
  suggestedTitle: z.string().describe(
    'A cleaner, more actionable rewrite of the task title (3-8 words)',
  ),
});

const TaskRewriteSchema = z.object({
  title: z.string().describe(
    'Updated task title based on user clarification (3-8 words)',
  ),
  rawInput: z.string().describe(
    'Updated task description incorporating the user response',
  ),
});

// --- Anthropic client (reads ANTHROPIC_API_KEY from process.env) ---

const client = new Anthropic();

// --- POST handler ---

export async function POST(request: NextRequest) {
  const userId = await getRequiredUserId();
  if (userId instanceof Response) return userId;

  try {
    const body = await request.json();
    const { taskId, userResponse } = body;

    if (!taskId || typeof taskId !== 'string') {
      return Response.json(
        { error: 'taskId is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    // Fetch task from DB — scoped to current user
    const [task] = await db.select().from(tasks).where(
      and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    );
    if (!task) {
      return Response.json(
        { error: 'Task not found', code: 'TASK_NOT_FOUND' },
        { status: 404 },
      );
    }

    const today = new Date().toISOString().split('T')[0];

    if (!userResponse) {
      // MODE 1: Generate refinement prompt
      const response = await client.messages.parse({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: `You are a gentle task refinement assistant. Today is ${today}. The user has a task that needs clarification. Generate a thoughtful clarifying question and a suggested cleaner title. Be compassionate and curious, not judgmental. The question should help the user think about what "done" looks like for this task.`,
        messages: [
          {
            role: 'user',
            content: `Task title: "${task.title}"\nOriginal input: "${task.rawInput}"\nDrift count: ${task.driftCount}\nTags: ${(task.tags || []).join(', ') || 'none'}`,
          },
        ],
        output_config: { format: zodOutputFormat(RefinementOutputSchema) },
      });

      // Store the generated prompt in the DB for future display
      const prompt = response.parsed_output;
      if (prompt) {
        await db
          .update(tasks)
          .set({ refinementPrompt: JSON.stringify(prompt) })
          .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
      }

      return Response.json(prompt);
    } else {
      // MODE 2: User responded — rewrite the task
      if (typeof userResponse !== 'string' || !userResponse.trim()) {
        return Response.json(
          { error: 'userResponse must be a non-empty string', code: 'VALIDATION_ERROR' },
          { status: 400 },
        );
      }

      const response = await client.messages.parse({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: `You are a task refinement assistant. Today is ${today}. The user has clarified their task. Rewrite the task title to be concise and actionable (3-8 words), and update the description to incorporate their clarification.`,
        messages: [
          {
            role: 'user',
            content: `Original task: "${task.title}"\nOriginal input: "${task.rawInput}"\nUser's clarification: "${userResponse.trim()}"`,
          },
        ],
        output_config: { format: zodOutputFormat(TaskRewriteSchema) },
      });

      const parsed = response.parsed_output;
      if (parsed) {
        // Apply update directly to DB — scoped to current user
        await db
          .update(tasks)
          .set({
            title: parsed.title,
            rawInput: parsed.rawInput,
            needsRefinement: false,
            refinementPrompt: null,
          })
          .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

        return Response.json({
          title: parsed.title,
          rawInput: parsed.rawInput,
          needsRefinement: false,
        });
      }

      return Response.json(
        { error: 'Failed to generate rewrite', code: 'INTERNAL_ERROR' },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error('Refine error:', err);
    return Response.json(
      { error: 'Failed to refine task', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
