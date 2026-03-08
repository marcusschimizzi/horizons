# Ink Weight Horizon Depth — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make each task card visually lighter (text, border, shadow) the further its horizon is from the present.

**Architecture:** A `lerpHex` color-interpolation utility in `src/lib/color.ts` is used by `TaskCard.tsx` to compute ink weight from `task.horizon`. A `HORIZON_DEPTH` map (inline in TaskCard) drives a 0–1 `t` value per horizon. Three CSS properties on `cardStyle` are overridden with the computed values. No opacity change — the cream paper background stays solid.

**Tech Stack:** TypeScript, React CSS-in-JS (inline styles), Vitest

---

### Task 1: Add and test lerpHex utility

**Files:**
- Create: `src/lib/color.ts`
- Create: `src/lib/__tests__/color.test.ts`

**Step 1: Write the failing test**

Create `src/lib/__tests__/color.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { lerpHex } from '@/lib/color';

describe('lerpHex', () => {
  it('returns a at t=0', () => {
    expect(lerpHex('#000000', '#ffffff', 0)).toBe('#000000');
  });

  it('returns b at t=1', () => {
    expect(lerpHex('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerpHex('#000000', '#ffffff', 0.5)).toBe('#7f7f7f');
  });

  it('interpolates the ink-to-pencil range correctly at t=0.5', () => {
    // Dark ink #1a1605 → pencil #b8ac9e at t=0.5 should be roughly mid-range
    const result = lerpHex('#1a1605', '#b8ac9e', 0.5);
    // R: 0x1a=26, 0xb8=184 → mid=105=0x69
    // G: 0x16=22, 0xac=172 → mid=97=0x61
    // B: 0x05=5,  0x9e=158 → mid=81=0x51
    expect(result).toBe('#696151');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- color
```
Expected: FAIL with "Cannot find module '@/lib/color'"

**Step 3: Implement lerpHex**

Create `src/lib/color.ts`:

```typescript
/**
 * Linear interpolation between two hex colors.
 * @param a - Start hex color (e.g. '#1a1605')
 * @param b - End hex color (e.g. '#b8ac9e')
 * @param t - Interpolation factor 0–1
 */
export function lerpHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b2.toString(16).padStart(2, '0')}`;
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- color
```
Expected: PASS — 4 tests passing

**Step 5: Commit**

```bash
git add src/lib/color.ts src/lib/__tests__/color.test.ts
git commit -m "feat: add lerpHex color interpolation utility"
```

---

### Task 2: Apply ink weight to TaskCard

**Files:**
- Modify: `src/components/TaskCard.tsx`

**Step 1: Add HORIZON_DEPTH map and import**

At the top of `src/components/TaskCard.tsx`, after the existing imports, add:

```typescript
import { lerpHex } from '@/lib/color';

// Horizon depth: 0 = immediate (full ink), 1 = someday (pencil)
const HORIZON_DEPTH: Record<string, number> = {
  'immediate':    0.0,
  'this-week':    0.2,
  'this-month':   0.4,
  'this-quarter': 0.6,
  'this-year':    0.8,
  'someday':      1.0,
};
```

**Step 2: Compute ink values in the component body**

Inside `TaskCard`, before the `cardStyle` object, add:

```typescript
const depth = HORIZON_DEPTH[task.horizon] ?? 0;
const inkColor = lerpHex('#1a1605', '#b8ac9e', depth);
const inkBorder = lerpHex('#8b7d6b', '#d4ccc4', depth);
const shadowAlpha = (0.12 - depth * 0.10).toFixed(2);
```

**Step 3: Override three properties in cardStyle**

In the `cardStyle` object, replace the three hardcoded values:

```typescript
// Before:
border: '1px solid #8b7d6b',
boxShadow: '2px 3px 8px rgba(26, 22, 5, 0.12)',
color: '#1a1605',

// After:
border: `1px solid ${inkBorder}`,
boxShadow: `2px 3px 8px rgba(26, 22, 5, ${shadowAlpha})`,
color: inkColor,
```

**Step 4: Visual verification**

Run `npm run dev` and check:
- Immediate tasks: dark ink text, warm gray border, visible shadow
- This-month tasks: noticeably lighter text and border
- Someday tasks: pencil-gray text (`#b8ac9e`), barely-there border (`#d4ccc4`), near-flat shadow

Scroll from present to someday: the depth gradient should be visible at each horizon stop.
Also check that ListView (L key) is unaffected — TaskCard is not rendered there.

**Step 5: Commit**

```bash
git add src/components/TaskCard.tsx
git commit -m "feat(whitevoid): ink weight depth — cards fade from ink to pencil by horizon"
```
