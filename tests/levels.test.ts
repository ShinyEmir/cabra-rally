import { describe, expect, it } from 'vitest';
import { LEVELS, STORY, storyMode } from '../src/core/levels';
import { createRun, updateRun } from '../src/core/run';
import { isUnlocked, recordWin, sanitizeProgress } from '../src/core/progress';
import { kickerAt } from '../src/core/terrain';
import { cautious, leveler, type Driver } from './drivers';

describe('story levels (data)', () => {
  it('has at least 5 levels with unique ids', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
  });

  it('level 1 is the prototype story mode', () => {
    const m = storyMode(LEVELS[0]);
    expect(m.terrain).toMatchObject({ amp: 0.75, kick: 1, kickH: 0.7, flatFrom: 260, seed: 0 });
    expect(m.finish).toEqual({ x: 300, friendBonus: 200 });
    expect(m.friends).toEqual([45, 95, 140, 185, 230, 268]);
  });

  for (const [i, level] of LEVELS.entries()) {
    it(`level ${i + 1}: friends are in order, before the finish and off the ramps`, () => {
      const mode = storyMode(level);
      let last = 0;
      for (const x of level.friends) {
        expect(x).toBeGreaterThan(last + 20);
        expect(x).toBeLessThan(level.length - 5);
        last = x;
        const k = Math.floor((x - 53) / 48);
        if (k < 0) continue;
        const ramp = kickerAt(k, mode.terrain).xc;
        // a ramp climbs over 5 m before its top and drops over 1.6 m after it
        expect(x < ramp - 6 || x > ramp + 3, `friend at ${x} sits on the ramp at ${ramp.toFixed(1)}`).toBe(true);
      }
    });

    it(`level ${i + 1}: can be finished with every friend on board`, () => {
      const drivers: Driver[] = [leveler(0.1), cautious(0.15, 10), cautious(0.15, 8)];
      const results = drivers.map((drive) => {
        const run = createRun(storyMode(level), 'play');
        for (let f = 0; f < 60 * 240 && run.phase !== 'over'; f++) updateRun(run, 1 / 60, drive(f, run.car));
        return { won: run.won, friends: run.friendsAboard, score: run.score };
      });
      const best = results.find((r) => r.won && r.friends === level.friends.length);
      expect(best, JSON.stringify(results)).toBeDefined();
      // the bonus is part of the score
      expect(best!.score).toBeGreaterThanOrEqual(level.friends.length * STORY.friendBonus);
      // careful driving alone is not enough for the score star: it asks for tricks
      for (const r of results) expect(r.score).toBeLessThan(level.scoreGoal);
    });
  }
});

describe('story progress', () => {
  it('opens the first level, then each level when the previous one is done', () => {
    let progress = sanitizeProgress(undefined);
    expect(isUnlocked(LEVELS, progress, 0)).toBe(true);
    expect(isUnlocked(LEVELS, progress, 1)).toBe(false);
    progress = recordWin(progress, LEVELS[0].id, 4, 1200);
    expect(isUnlocked(LEVELS, progress, 1)).toBe(true);
    expect(isUnlocked(LEVELS, progress, 2)).toBe(false);
  });

  it('keeps the best friends and score across wins', () => {
    let progress = recordWin({}, 'l1', 6, 1500);
    progress = recordWin(progress, 'l1', 3, 2000);
    expect(progress.l1).toEqual({ done: true, bestFriends: 6, bestScore: 2000 });
  });

  it('repairs broken saved progress', () => {
    expect(sanitizeProgress({ l1: { done: true, bestFriends: -2, bestScore: 'x' }, l2: 5 })).toEqual({ l1: { done: true, bestFriends: 0, bestScore: 0 } });
    expect(sanitizeProgress('nope')).toEqual({});
  });
});
