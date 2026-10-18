// Deterministic coin placement and pickup. Ported from the prototype's genCoins() and logic().
// Coins are counted apart from the score; they are reserved for a future character shop.
import type { Car } from './physics';
import { hash01 } from './rng';
import { kickerAt, terrain, type TerrainConfig } from './terrain';

export const COINS = {
  /** x where the first run of ground coins starts. */
  firstRun: 14,
  /** Ramps at or before this x get no coin arc. */
  firstArc: 40,
  runMin: 5,
  /** Up to this many extra coins per run (exclusive). */
  runExtra: 3,
  runSalt: 0.37,
  spacing: 2,
  /** Height of ground coins above the terrain. */
  height: 1.15,
  gapMin: 34,
  gapExtra: 30,
  arcCount: 4,
  arcStart: 1,
  arcSpacing: 2.4,
  arcBase: 2,
  arcRise: 1.7,
  /** Coins farther than this in x are skipped by the pickup check. */
  pickRangeX: 2,
  /** Pickup is measured from this height above the car center. */
  pickOffsetY: 0.2,
  /** Squared pickup distance. */
  pickR2: 1.5,
} as const;

export interface Coin {
  x: number;
  y: number;
  got: boolean;
}

export interface CoinField {
  items: Coin[];
  /** Start x of the next run of ground coins. */
  nextRun: number;
  /** Center x of the last ramp that got a coin arc. */
  arcDone: number;
}

export function createCoinField(): CoinField {
  return { items: [], nextRun: COINS.firstRun, arcDone: COINS.firstArc };
}

/** Places ground runs and ramp arcs up to x = upTo. Safe to call every frame. */
export function generateCoins(field: CoinField, upTo: number, td: Readonly<TerrainConfig>): void {
  while (field.nextRun < upTo) {
    const x0 = field.nextRun, n = COINS.runMin + Math.floor(hash01(x0 * COINS.runSalt) * COINS.runExtra);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * COINS.spacing;
      field.items.push({ x: x, y: terrain(x, td) + COINS.height, got: false });
    }
    field.nextRun += COINS.gapMin + hash01(x0) * COINS.gapExtra;
  }
  if (td.kick > 0) {
    // arcs of coins over the launch ramps
    const kFrom = Math.floor((field.arcDone - 53) / 48);
    for (let k = Math.max(0, kFrom); ; k++) {
      const kk = kickerAt(k, td);
      if (kk.xc > upTo) break;
      if (kk.xc <= field.arcDone) continue;
      for (let j = 0; j < COINS.arcCount; j++) {
        const cx = kk.xc + COINS.arcStart + j * COINS.arcSpacing;
        field.items.push({ x: cx, y: terrain(kk.xc - 1, td) + COINS.arcBase + COINS.arcRise * Math.sin(Math.PI * (j + 0.5) / COINS.arcCount), got: false });
      }
      field.arcDone = kk.xc;
    }
  }
}

/** Marks coins touched by the car as collected and returns them. */
export function collectCoins(field: CoinField, car: Car): Coin[] {
  const got: Coin[] = [];
  for (let i = 0; i < field.items.length; i++) {
    const it = field.items[i];
    if (it.got || Math.abs(it.x - car.x) > COINS.pickRangeX) continue;
    const dx = it.x - car.x, dy = it.y - (car.y + COINS.pickOffsetY);
    if (dx * dx + dy * dy < COINS.pickR2) { it.got = true; got.push(it); }
  }
  return got;
}
