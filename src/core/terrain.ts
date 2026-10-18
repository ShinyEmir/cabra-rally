// Deterministic terrain: three sine waves plus launch ramps. Ported from the prototype;
// the only change is that the prototype's global TD object is passed in as a parameter.
import { clamp, smooth } from './math';
import { hash01 } from './rng';

export interface TerrainConfig {
  /** Height multiplier for the rolling hills. */
  amp: number;
  /** Launch ramps are present when greater than 0. */
  kick: number;
  /** Height multiplier for the launch ramps. */
  kickH: number;
  /** The terrain flattens out over 20 m starting at this x. */
  flatFrom: number;
}

/** Prototype defaults (TD), which are also the free mode settings. */
export const DEFAULT_TERRAIN: Readonly<TerrainConfig> = { amp: 1, kick: 1, kickH: 1, flatFrom: 1e9 };

export interface Kicker {
  xc: number;
  H: number;
}

export function kickerAt(k: number, td: Readonly<TerrainConfig> = DEFAULT_TERRAIN): Kicker {
  const xc = 60 + k * 48 + hash01(k) * 14;
  const H = (1.5 + Math.min(1.7, k * 0.15)) * td.kickH;
  return { xc: xc, H: H };
}

export function terrain(x: number, td: Readonly<TerrainConfig> = DEFAULT_TERRAIN): number {
  const f = smooth((x - 8) / 24);
  const ramp = clamp((x - 20) / 260, 0, 1);
  const A = (0.45 + 1.35 * ramp) * td.amp;
  let h = A * (Math.sin(x * 0.11) + 0.45 * Math.sin(x * 0.27 + 1.7) + 0.15 * Math.sin(x * 0.61 + 0.4)) * f;
  if (td.kick > 0 && x > 50) {
    const k = Math.floor((x - 53) / 48);
    if (k >= 0) {
      const kk = kickerAt(k, td);
      const dx = x - kk.xc;
      if (dx > -5 && dx < 1.6) {
        h += dx < 0 ? kk.H * smooth((dx + 5) / 5) : kk.H * (1 - smooth(dx / 1.6));
      }
    }
  }
  if (x > td.flatFrom) h *= 1 - smooth((x - td.flatFrom) / 20);
  return h;
}

export function slopeAt(x: number, td: Readonly<TerrainConfig> = DEFAULT_TERRAIN): number {
  return (terrain(x + 0.04, td) - terrain(x - 0.04, td)) / 0.08;
}
