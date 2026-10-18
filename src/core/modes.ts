// Game mode parameters. Story mode is added in phase 4.
import type { TerrainConfig } from './terrain';

export interface ModeSpec {
  id: 'free';
  terrain: Readonly<TerrainConfig>;
  /** Coins are placed up to this x when the run starts. */
  initialCoinsUpTo: number;
  /** Coins are kept placed this far ahead of the car. */
  coinLookahead: number;
}

export const FREE_MODE: Readonly<ModeSpec> = {
  id: 'free',
  terrain: { amp: 1, kick: 1, kickH: 1, flatFrom: 1e9 },
  initialCoinsUpTo: 90,
  coinLookahead: 90,
};
