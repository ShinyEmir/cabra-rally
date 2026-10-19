// Stars per story level, worked out from the saved progress (no storage of their own), so levels
// played before stars existed already have theirs.
import type { LevelSpec } from './levels';
import type { LevelProgress, StoryProgress } from './progress';

export type StarKind = 'finish' | 'allFriends' | 'score';

/** In the order they are shown. */
export const STAR_KINDS: readonly StarKind[] = ['finish', 'allFriends', 'score'];

export const STARS_PER_LEVEL = STAR_KINDS.length;

/** Whether each star is earned, in STAR_KINDS order. */
export function levelStars(level: Readonly<LevelSpec>, p: Readonly<LevelProgress> | undefined): boolean[] {
  return STAR_KINDS.map((kind) => {
    if (!p?.done) return false;
    switch (kind) {
      case 'finish': return true;
      case 'allFriends': return p.bestFriends >= level.friends.length;
      case 'score': return p.bestScore >= level.scoreGoal;
    }
  });
}

export function countStars(levels: readonly LevelSpec[], progress: Readonly<StoryProgress>): number {
  let n = 0;
  for (const level of levels) for (const on of levelStars(level, progress[level.id])) if (on) n++;
  return n;
}
