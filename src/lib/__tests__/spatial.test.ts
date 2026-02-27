import { describe, it, expect } from 'vitest';
import {
  getTaskPosition,
  applyOverlapAvoidance,
  SPREAD_CONFIG,
  type TaskPosition,
} from '@/lib/spatial';
import type { Horizon } from '@/lib/horizons';
import { getZDepthRange } from '@/lib/horizons';

describe('getTaskPosition', () => {
  it('is deterministic: same id + horizon always returns same position', () => {
    const pos1 = getTaskPosition('abc', 'immediate');
    const pos2 = getTaskPosition('abc', 'immediate');
    expect(pos1).toEqual(pos2);
  });

  it('produces different positions for different task IDs', () => {
    const pos1 = getTaskPosition('abc', 'immediate');
    const pos2 = getTaskPosition('xyz', 'immediate');
    // At least one coordinate should differ
    const different = pos1.x !== pos2.x || pos1.y !== pos2.y || pos1.z !== pos2.z;
    expect(different).toBe(true);
  });

  it('places tasks within the immediate Z-depth band (0 to -5)', () => {
    const pos = getTaskPosition('abc', 'immediate');
    const { zMin, zMax } = getZDepthRange('immediate');
    // zMin=0, zMax=-5, so z should be between -5 and 0
    expect(pos.z).toBeLessThanOrEqual(zMin);
    expect(pos.z).toBeGreaterThanOrEqual(zMax);
  });

  it('places tasks within the this-week Z-depth band (-5 to -15)', () => {
    const pos = getTaskPosition('abc', 'this-week');
    const { zMin, zMax } = getZDepthRange('this-week');
    expect(pos.z).toBeLessThanOrEqual(zMin);
    expect(pos.z).toBeGreaterThanOrEqual(zMax);
  });

  it('places tasks within the someday Z-depth band (-80 to -120)', () => {
    const pos = getTaskPosition('abc', 'someday');
    const { zMin, zMax } = getZDepthRange('someday');
    expect(pos.z).toBeLessThanOrEqual(zMin);
    expect(pos.z).toBeGreaterThanOrEqual(zMax);
  });

  it('constrains x within immediate xSpread (+-4)', () => {
    const pos = getTaskPosition('abc', 'immediate');
    expect(Math.abs(pos.x)).toBeLessThanOrEqual(SPREAD_CONFIG['immediate'].xSpread);
  });

  it('constrains y within immediate ySpread (+-2)', () => {
    const pos = getTaskPosition('abc', 'immediate');
    expect(Math.abs(pos.y)).toBeLessThanOrEqual(SPREAD_CONFIG['immediate'].ySpread);
  });

  it('constrains x within someday xSpread (+-22)', () => {
    const pos = getTaskPosition('abc', 'someday');
    expect(Math.abs(pos.x)).toBeLessThanOrEqual(SPREAD_CONFIG['someday'].xSpread);
  });

  it('constrains y within someday ySpread (+-7)', () => {
    const pos = getTaskPosition('abc', 'someday');
    expect(Math.abs(pos.y)).toBeLessThanOrEqual(SPREAD_CONFIG['someday'].ySpread);
  });

  it('spreads wider on X for distant horizons than for near ones', () => {
    // Generate many positions and check average absolute X is larger for distant
    const immediateXs: number[] = [];
    const somedayXs: number[] = [];
    for (let i = 0; i < 50; i++) {
      immediateXs.push(Math.abs(getTaskPosition(`task-${i}`, 'immediate').x));
      somedayXs.push(Math.abs(getTaskPosition(`task-${i}`, 'someday').x));
    }
    const avgImmediate = immediateXs.reduce((a, b) => a + b, 0) / immediateXs.length;
    const avgSomeday = somedayXs.reduce((a, b) => a + b, 0) / somedayXs.length;
    expect(avgSomeday).toBeGreaterThan(avgImmediate);
  });

  it('all six horizons produce positions within their respective Z bands', () => {
    const horizons: Horizon[] = ['immediate', 'this-week', 'this-month', 'this-quarter', 'this-year', 'someday'];
    for (const h of horizons) {
      const pos = getTaskPosition('test-task', h);
      const { zMin, zMax } = getZDepthRange(h);
      expect(pos.z).toBeLessThanOrEqual(zMin);
      expect(pos.z).toBeGreaterThanOrEqual(zMax);
    }
  });
});

describe('SPREAD_CONFIG', () => {
  it('has entries for all six horizons', () => {
    const horizons: Horizon[] = ['immediate', 'this-week', 'this-month', 'this-quarter', 'this-year', 'someday'];
    for (const h of horizons) {
      expect(SPREAD_CONFIG[h]).toBeDefined();
      expect(SPREAD_CONFIG[h].xSpread).toBeGreaterThan(0);
      expect(SPREAD_CONFIG[h].ySpread).toBeGreaterThan(0);
    }
  });

  it('xSpread increases for more distant horizons', () => {
    const ordered: Horizon[] = ['immediate', 'this-week', 'this-month', 'this-quarter', 'this-year', 'someday'];
    for (let i = 1; i < ordered.length; i++) {
      expect(SPREAD_CONFIG[ordered[i]].xSpread).toBeGreaterThan(SPREAD_CONFIG[ordered[i - 1]].xSpread);
    }
  });

  it('ySpread increases for more distant horizons', () => {
    const ordered: Horizon[] = ['immediate', 'this-week', 'this-month', 'this-quarter', 'this-year', 'someday'];
    for (let i = 1; i < ordered.length; i++) {
      expect(SPREAD_CONFIG[ordered[i]].ySpread).toBeGreaterThan(SPREAD_CONFIG[ordered[i - 1]].ySpread);
    }
  });
});

describe('applyOverlapAvoidance', () => {
  it('returns a Map with entries for all input task IDs', () => {
    const positions = [
      { id: 'a', pos: { x: 0, y: 0, z: -2 }, horizon: 'immediate' as Horizon },
      { id: 'b', pos: { x: 0, y: 0, z: -2 }, horizon: 'immediate' as Horizon },
    ];
    const result = applyOverlapAvoidance(positions);
    expect(result.size).toBe(2);
    expect(result.has('a')).toBe(true);
    expect(result.has('b')).toBe(true);
  });

  it('nudges overlapping same-horizon tasks apart', () => {
    const positions = [
      { id: 'a', pos: { x: 0, y: 0, z: -2 }, horizon: 'immediate' as Horizon },
      { id: 'b', pos: { x: 0.1, y: 0, z: -2 }, horizon: 'immediate' as Horizon },
    ];
    const result = applyOverlapAvoidance(positions, 2.0, 3);
    const posA = result.get('a')!;
    const posB = result.get('b')!;

    // After avoidance, they should be further apart than before
    const distBefore = Math.sqrt(0.1 * 0.1);
    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const dz = posB.z - posA.z;
    const distAfter = Math.sqrt(dx * dx + dy * dy + dz * dz);

    expect(distAfter).toBeGreaterThan(distBefore);
  });

  it('does not significantly move tasks that are already well-separated', () => {
    const positions = [
      { id: 'a', pos: { x: -10, y: 0, z: -2 }, horizon: 'immediate' as Horizon },
      { id: 'b', pos: { x: 10, y: 0, z: -2 }, horizon: 'immediate' as Horizon },
    ];
    const result = applyOverlapAvoidance(positions, 2.0, 3);
    const posA = result.get('a')!;
    const posB = result.get('b')!;

    // Positions should barely change
    expect(Math.abs(posA.x - (-10))).toBeLessThan(0.01);
    expect(Math.abs(posB.x - 10)).toBeLessThan(0.01);
  });

  it('does not nudge tasks from different horizons', () => {
    const positions = [
      { id: 'a', pos: { x: 0, y: 0, z: -2 }, horizon: 'immediate' as Horizon },
      { id: 'b', pos: { x: 0, y: 0, z: -10 }, horizon: 'this-week' as Horizon },
    ];
    const result = applyOverlapAvoidance(positions, 2.0, 3);
    const posA = result.get('a')!;
    const posB = result.get('b')!;

    // Positions should be unchanged since they are in different horizons
    expect(posA.x).toBe(0);
    expect(posA.y).toBe(0);
    expect(posB.x).toBe(0);
    expect(posB.y).toBe(0);
  });

  it('handles empty input', () => {
    const result = applyOverlapAvoidance([]);
    expect(result.size).toBe(0);
  });

  it('handles single task', () => {
    const positions = [
      { id: 'a', pos: { x: 1, y: 2, z: -3 }, horizon: 'immediate' as Horizon },
    ];
    const result = applyOverlapAvoidance(positions);
    const posA = result.get('a')!;
    expect(posA.x).toBe(1);
    expect(posA.y).toBe(2);
    expect(posA.z).toBe(-3);
  });
});
