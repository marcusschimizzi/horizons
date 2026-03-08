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
  const r = Math.floor(ar + (br - ar) * t);
  const g = Math.floor(ag + (bg - ag) * t);
  const b2 = Math.floor(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b2.toString(16).padStart(2, '0')}`;
}
