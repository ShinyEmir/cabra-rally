// Story progress rules: which levels are done and which are unlocked. Pure data; saving it is
// up to the caller.
import type { LevelSpec } from './levels';

export interface LevelProgress {
  done: boolean;
  /** Most friends brought to the stadium in one run. */
  bestFriends: number;
  bestScore: number;
}

/** By level id. Levels never played are missing. */
export type StoryProgress = Record<string, LevelProgress>;

/** Turns whatever was saved (possibly old or broken) into valid progress. */
export function sanitizeProgress(raw: unknown): StoryProgress {
  const out: StoryProgress = {};
  if (typeof raw !== 'object' || raw === null) return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'object' || v === null) continue;
    const p = v as Partial<Record<keyof LevelProgress, unknown>>;
    const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
    out[id] = { done: p.done === true, bestFriends: num(p.bestFriends), bestScore: num(p.bestScore) };
  }
  return out;
}

/** The first level is always open; each next one opens when the previous one is done. */
export function isUnlocked(levels: readonly LevelSpec[], progress: Readonly<StoryProgress>, index: number): boolean {
  if (index <= 0) return true;
  const prev = levels[index - 1];
  return prev !== undefined && progress[prev.id]?.done === true;
}

/** Progress after reaching the stadium; keeps the best results. */
export function recordWin(progress: Readonly<StoryProgress>, id: string, friends: number, score: number): StoryProgress {
  const old = progress[id];
  return {
    ...progress,
    [id]: {
      done: true,
      bestFriends: Math.max(old?.bestFriends ?? 0, friends),
      bestScore: Math.max(old?.bestScore ?? 0, score),
    },
  };
}
