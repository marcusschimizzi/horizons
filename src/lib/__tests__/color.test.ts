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
    const result = lerpHex('#1a1605', '#b8ac9e', 0.5);
    // R: 0x1a=26, 0xb8=184 → mid=105=0x69
    // G: 0x16=22, 0xac=172 → mid=97=0x61
    // B: 0x05=5,  0x9e=158 → mid=81=0x51
    expect(result).toBe('#696151');
  });
});
