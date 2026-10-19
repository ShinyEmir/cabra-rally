// Story levels as data. Adding a level means adding an entry to LEVELS (and, if wanted, its
// name in ui/strings.ts). Level 1 is the prototype's story mode, value for value.
import type { ModeSpec } from './modes';

export interface LevelSpec {
  /** Stable id, used to save progress. Never reuse or rename one. */
  id: string;
  /** Distance to the finish line, in meters. */
  length: number;
  /** Hill height multiplier (free mode is 1). */
  amp: number;
  /** Ramp height multiplier (free mode is 1). */
  kickH: number;
  /** Ground variation; 0 is the prototype's terrain. */
  seed: number;
  /** Where friends wait, by x. Keep them off the ramps (tests check it). */
  friends: readonly number[];
}

export const STORY = {
  /** The ground flattens this many meters before the finish line. */
  flatBeforeFinish: 40,
  friendBonus: 200,
  coinLookahead: 90,
} as const;

export const LEVELS: readonly LevelSpec[] = [
  { id: 'l1', length: 300, amp: 0.75, kickH: 0.7, seed: 0, friends: [45, 95, 140, 185, 230, 268] },
  { id: 'l2', length: 340, amp: 0.85, kickH: 0.8, seed: 1, friends: [40, 90, 140, 190, 240, 290] },
  { id: 'l3', length: 380, amp: 0.95, kickH: 0.9, seed: 2, friends: [38, 85, 135, 180, 230, 280, 335] },
  { id: 'l4', length: 420, amp: 1.05, kickH: 1.0, seed: 3, friends: [42, 92, 140, 190, 240, 290, 335, 378] },
  { id: 'l5', length: 460, amp: 1.15, kickH: 1.1, seed: 4, friends: [40, 88, 135, 185, 235, 285, 330, 380, 420] },
];

export function storyMode(level: Readonly<LevelSpec>): ModeSpec {
  return {
    id: 'story',
    terrain: { amp: level.amp, kick: 1, kickH: level.kickH, flatFrom: level.length - STORY.flatBeforeFinish, seed: level.seed },
    initialCoinsUpTo: level.length,
    coinLookahead: STORY.coinLookahead,
    friends: level.friends,
    finish: { x: level.length, friendBonus: STORY.friendBonus },
  };
}
