// Game mode parameters. Free mode is endless; story levels come from levels.ts as data.
import type { TerrainConfig } from './terrain';

export interface FinishSpec {
  /** x of the finish line; the stadium stands behind it. */
  x: number;
  /** Points per friend on board when the finish line is crossed. */
  friendBonus: number;
}

export interface ModeSpec {
  id: 'free' | 'story';
  terrain: Readonly<TerrainConfig>;
  /** Coins are placed up to this x when the run starts. */
  initialCoinsUpTo: number;
  /** Coins are kept placed this far ahead of the car. */
  coinLookahead: number;
  /** Friends waiting along the way, by x. */
  friends: readonly number[];
  /** null for endless runs. */
  finish: Readonly<FinishSpec> | null;
  /** Look of the place (see render/worlds.ts); unknown ids use the first world. */
  world: string;
}

export const FREE_MODE: Readonly<ModeSpec> = {
  id: 'free',
  terrain: { amp: 1, kick: 1, kickH: 1, flatFrom: 1e9 },
  initialCoinsUpTo: 90,
  coinLookahead: 90,
  friends: [],
  finish: null,
  world: 'valle',
};
