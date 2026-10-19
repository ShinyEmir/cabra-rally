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
  /** Look of the place, by id (render/worlds.ts). */
  world: string;
  /** Points for the third star; above the full friend bonus, so it also asks for tricks. */
  scoreGoal: number;
}

export const STORY = {
  /** The ground flattens this many meters before the finish line. */
  flatBeforeFinish: 40,
  friendBonus: 200,
  coinLookahead: 90,
} as const;

export const LEVELS: readonly LevelSpec[] = [
  { id: 'l1', length: 300, amp: 0.75, kickH: 0.7, seed: 0, friends: [45, 95, 140, 185, 230, 268], world: 'valle', scoreGoal: 1700 },
  { id: 'l2', length: 340, amp: 0.85, kickH: 0.8, seed: 1, friends: [40, 90, 140, 190, 240, 290], world: 'selva', scoreGoal: 1800 },
  { id: 'l3', length: 380, amp: 0.95, kickH: 0.9, seed: 2, friends: [38, 85, 135, 180, 230, 280, 335], world: 'costa', scoreGoal: 2100 },
  { id: 'l4', length: 420, amp: 1.05, kickH: 1.0, seed: 3, friends: [42, 92, 140, 190, 240, 290, 335, 378], world: 'desierto', scoreGoal: 2400 },
  { id: 'l5', length: 460, amp: 1.15, kickH: 1.1, seed: 4, friends: [40, 88, 135, 185, 235, 285, 330, 380, 420], world: 'atardecer', scoreGoal: 2700 },
  { id: 'l6', length: 500, amp: 1.2, kickH: 1.15, seed: 6, friends: [40, 87, 133, 180, 227, 273, 320, 367, 413, 460], world: 'sierra', scoreGoal: 3000 },
  { id: 'l7', length: 540, amp: 1.25, kickH: 1.2, seed: 9, friends: [40, 91, 142, 193, 244, 296, 356, 404, 449, 500], world: 'milpa', scoreGoal: 3100 },
  { id: 'l8', length: 580, amp: 1.3, kickH: 1.25, seed: 12, friends: [40, 90, 140, 190, 240, 290, 340, 401, 449, 490, 540], world: 'noche', scoreGoal: 3400 },
  { id: 'l9', length: 620, amp: 1.35, kickH: 1.3, seed: 17, friends: [40, 89, 138, 187, 236, 285, 335, 384, 433, 482, 531, 580], world: 'nevado', scoreGoal: 3700 },
  { id: 'l10', length: 660, amp: 1.4, kickH: 1.35, seed: 11, friends: [40, 88, 137, 185, 233, 282, 330, 378, 427, 475, 523, 572, 620], world: 'volcan', scoreGoal: 4000 },
];

export function storyMode(level: Readonly<LevelSpec>): ModeSpec {
  return {
    id: 'story',
    terrain: { amp: level.amp, kick: 1, kickH: level.kickH, flatFrom: level.length - STORY.flatBeforeFinish, seed: level.seed },
    initialCoinsUpTo: level.length,
    coinLookahead: STORY.coinLookahead,
    friends: level.friends,
    finish: { x: level.length, friendBonus: STORY.friendBonus },
    world: level.world,
  };
}
