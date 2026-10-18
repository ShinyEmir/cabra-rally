// Small numeric helpers shared by the core modules. Ported verbatim from the prototype.

export const TAU = Math.PI * 2;

export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

export function smooth(t: number): number {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}
