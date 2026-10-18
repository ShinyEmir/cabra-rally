// Deterministic pseudo-random value in [0, 1) from a number. Same n, same result.
export function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
