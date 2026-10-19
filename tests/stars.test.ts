import { describe, expect, it } from 'vitest';
import { CHALLENGES, isStoryTotal } from '../src/core/challenges';
import { LEVELS, STORY } from '../src/core/levels';
import { recordWin } from '../src/core/progress';
import { countStars, levelStars, STARS_PER_LEVEL } from '../src/core/stars';
import { WORLDS } from '../src/render/worlds';
import { LEVEL_NAMES } from '../src/ui/strings';

describe('stars', () => {
  const l1 = LEVELS[0];

  it('gives no stars before finishing a level', () => {
    expect(levelStars(l1, undefined)).toEqual([false, false, false]);
    expect(countStars(LEVELS, {})).toBe(0);
  });

  it('gives the first star for finishing, the second for every friend and the third for the score goal', () => {
    expect(levelStars(l1, { done: true, bestFriends: 2, bestScore: 100 })).toEqual([true, false, false]);
    expect(levelStars(l1, { done: true, bestFriends: l1.friends.length, bestScore: 100 })).toEqual([true, true, false]);
    expect(levelStars(l1, { done: true, bestFriends: 0, bestScore: l1.scoreGoal })).toEqual([true, false, true]);
  });

  it('counts the best results of different runs, as saved', () => {
    let progress = recordWin({}, l1.id, l1.friends.length, 1000);
    progress = recordWin(progress, l1.id, 1, l1.scoreGoal + 10);
    expect(countStars(LEVELS, progress)).toBe(3);
  });

  it('works out stars from progress saved before stars existed', () => {
    const old = { l1: { done: true, bestFriends: 6, bestScore: 1300 }, l2: { done: true, bestFriends: 3, bestScore: 900 } };
    expect(countStars(LEVELS, old)).toBe(3);
  });

  it('has challenges for stars that are reachable and read from saved progress', () => {
    const starChallenges = CHALLENGES.filter((c) => c.kind === 'stars');
    expect(starChallenges.length).toBeGreaterThan(0);
    for (const c of starChallenges) {
      expect(c.target).toBeLessThanOrEqual(LEVELS.length * STARS_PER_LEVEL);
      expect(isStoryTotal(c.kind)).toBe(true);
    }
  });
});

describe('levels 6 to 10', () => {
  it('has 10 levels, each in a world of its own that exists, with a name', () => {
    expect(LEVELS.length).toBe(10);
    const ids = new Set(WORLDS.map((w) => w.id));
    for (const level of LEVELS) {
      expect(ids.has(level.world), level.world).toBe(true);
      expect(LEVEL_NAMES[level.id], level.id).toBeTruthy();
    }
    expect(new Set(LEVELS.map((l) => l.world)).size).toBe(LEVELS.length);
  });

  it('gets longer and steeper level by level, each with its own ground', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].length).toBeGreaterThan(LEVELS[i - 1].length);
      expect(LEVELS[i].amp).toBeGreaterThan(LEVELS[i - 1].amp);
    }
    expect(new Set(LEVELS.map((l) => l.seed)).size).toBe(LEVELS.length);
  });

  it('asks for more than the full friend bonus to earn the score star', () => {
    for (const level of LEVELS) expect(level.scoreGoal).toBeGreaterThan(level.friends.length * STORY.friendBonus);
  });
});
