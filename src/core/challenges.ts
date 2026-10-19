// Challenges as data: short goals checked during and after each run, paid in coins.
// Adding one is a new entry in CHALLENGES; its text comes from its kind and target (ui/strings.ts).

export type ChallengeKind =
  | 'flipsInJump' // flips in a single jump
  | 'freeDistance' // meters in one free mode run
  | 'coinsInRun' // coins picked up in one run
  | 'jumpTime' // seconds of a single jump
  | 'wheelieTime' // seconds of a single wheelie
  | 'levelsDone' // story levels finished
  | 'allFriends' // story levels finished with every friend on board
  | 'stars'; // stars earned across the story levels

export interface ChallengeSpec {
  /** Stable id, used to save progress. Never reuse or rename one. */
  id: string;
  kind: ChallengeKind;
  target: number;
  /** Coins paid when it is met. */
  reward: number;
}

export const CHALLENGES: readonly ChallengeSpec[] = [
  { id: 'flip1', kind: 'flipsInJump', target: 1, reward: 50 },
  { id: 'jump2', kind: 'jumpTime', target: 2, reward: 100 },
  { id: 'coins30', kind: 'coinsInRun', target: 30, reward: 100 },
  { id: 'dist300', kind: 'freeDistance', target: 300, reward: 100 },
  { id: 'level1', kind: 'levelsDone', target: 1, reward: 100 },
  { id: 'wheelie3', kind: 'wheelieTime', target: 3, reward: 150 },
  { id: 'flip2', kind: 'flipsInJump', target: 2, reward: 200 },
  { id: 'friends1', kind: 'allFriends', target: 1, reward: 200 },
  { id: 'jump3', kind: 'jumpTime', target: 3, reward: 250 },
  { id: 'dist800', kind: 'freeDistance', target: 800, reward: 300 },
  { id: 'coins100', kind: 'coinsInRun', target: 100, reward: 300 },
  { id: 'level5', kind: 'levelsDone', target: 5, reward: 500 },
  { id: 'stars10', kind: 'stars', target: 10, reward: 300 },
  { id: 'stars20', kind: 'stars', target: 20, reward: 600 },
  { id: 'level10', kind: 'levelsDone', target: 10, reward: 800 },
  { id: 'stars30', kind: 'stars', target: 30, reward: 1000 },
];

/** What a run has achieved so far, plus story totals. */
export interface ChallengeContext {
  mode: 'free' | 'story';
  distance: number;
  coins: number;
  maxFlips: number;
  maxJump: number;
  maxWheelie: number;
  /** Story levels finished, counting this run. */
  levelsDone: number;
  /** Story levels finished with every friend, counting this run. */
  levelsWithAllFriends: number;
  /** Stars across the story levels, counting this run. */
  stars: number;
}

export interface ChallengeProgress {
  done: string[];
  /** Best value reached so far, by challenge id. */
  best: Record<string, number>;
}

/** This run's value for a challenge (story totals for the story ones). */
export function challengeValue(spec: Readonly<ChallengeSpec>, ctx: Readonly<ChallengeContext>): number {
  switch (spec.kind) {
    case 'flipsInJump': return ctx.maxFlips;
    case 'freeDistance': return ctx.mode === 'free' ? ctx.distance : 0;
    case 'coinsInRun': return ctx.coins;
    case 'jumpTime': return ctx.maxJump;
    case 'wheelieTime': return ctx.maxWheelie;
    case 'levelsDone': return ctx.levelsDone;
    case 'allFriends': return ctx.levelsWithAllFriends;
    case 'stars': return ctx.stars;
  }
}

/** Story totals come from saved progress, so they count even before the challenge is checked. */
export function isStoryTotal(kind: ChallengeKind): boolean {
  return kind === 'levelsDone' || kind === 'allFriends' || kind === 'stars';
}

/** Records the best values and returns the challenges met for the first time. */
export function updateChallenges(
  specs: readonly ChallengeSpec[], progress: Readonly<ChallengeProgress>, ctx: Readonly<ChallengeContext>,
): { progress: ChallengeProgress; completed: ChallengeSpec[] } {
  const done = new Set(progress.done), best = { ...progress.best }, completed: ChallengeSpec[] = [];
  for (const spec of specs) {
    if (done.has(spec.id)) continue;
    const v = challengeValue(spec, ctx);
    if (v > (best[spec.id] ?? 0)) best[spec.id] = v;
    if (v >= spec.target) { done.add(spec.id); completed.push(spec); }
  }
  return { progress: { done: [...done], best }, completed };
}

/** Turns whatever was saved (possibly old or broken) into valid progress. */
export function sanitizeChallenges(raw: unknown): ChallengeProgress {
  const saved = (typeof raw === 'object' && raw !== null ? raw : {}) as { done?: unknown; best?: unknown };
  const done = Array.isArray(saved.done) ? saved.done.filter((d): d is string => typeof d === 'string') : [];
  const best: Record<string, number> = {};
  if (typeof saved.best === 'object' && saved.best !== null) {
    for (const [k, v] of Object.entries(saved.best as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) best[k] = v;
    }
  }
  return { done, best };
}
