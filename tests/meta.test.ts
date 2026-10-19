import { describe, expect, it } from 'vitest';
import { CHALLENGES, sanitizeChallenges, updateChallenges, type ChallengeContext } from '../src/core/challenges';
import { FREE_MODE } from '../src/core/modes';
import { createRun, updateRun } from '../src/core/run';
import { ACCESSORIES, buy, EMPTY_SHOP, equipAccessory, sanitizeShop, SHOP_ITEMS } from '../src/core/shop';
import { challengeText } from '../src/ui/strings';
import { holdGas, leveler } from './drivers';

const NOTHING: ChallengeContext = { mode: 'free', distance: 0, coins: 0, maxFlips: 0, maxJump: 0, maxWheelie: 0, levelsDone: 0, levelsWithAllFriends: 0 };

describe('challenges', () => {
  it('has at least 10 challenges with unique ids and positive rewards', () => {
    expect(CHALLENGES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length);
    for (const c of CHALLENGES) expect(c.reward).toBeGreaterThan(0);
  });

  it('words every challenge from its kind and target', () => {
    for (const c of CHALLENGES) expect(challengeText(c.kind, c.target), c.id).not.toBe(c.kind);
  });

  it('completes a challenge once and keeps the best value of the others', () => {
    let progress = sanitizeChallenges(undefined);
    let r = updateChallenges(CHALLENGES, progress, { ...NOTHING, maxFlips: 1, maxJump: 1.4 });
    expect(r.completed.map((c) => c.id)).toEqual(['flip1']);
    expect(r.progress.best.jump2).toBe(1.4);
    progress = r.progress;
    r = updateChallenges(CHALLENGES, progress, { ...NOTHING, maxFlips: 1 });
    expect(r.completed).toEqual([]);
    expect(r.progress.done).toContain('flip1');
  });

  it('counts distance only in free mode', () => {
    expect(updateChallenges(CHALLENGES, sanitizeChallenges({}), { ...NOTHING, mode: 'story', distance: 400 }).completed).toEqual([]);
    expect(updateChallenges(CHALLENGES, sanitizeChallenges({}), { ...NOTHING, distance: 400 }).completed.map((c) => c.id)).toEqual(['dist300']);
  });

  it('repairs broken saved progress', () => {
    expect(sanitizeChallenges({ done: ['flip1', 3], best: { jump2: 1.5, x: 'y', z: -1 } })).toEqual({ done: ['flip1'], best: { jump2: 1.5 } });
    expect(sanitizeChallenges('nope')).toEqual({ done: [], best: {} });
  });

  it('runs record the stats the challenges measure', () => {
    const flips = createRun(FREE_MODE, 'play');
    for (let f = 0; f < 60 * 60 && flips.phase !== 'over'; f++) updateRun(flips, 1 / 60, holdGas(f, flips.car));
    expect(flips.stats.maxFlips).toBeGreaterThanOrEqual(1);
    expect(flips.stats.maxJump).toBeGreaterThan(1);
    const level = createRun(FREE_MODE, 'play');
    const drive = leveler(0.1);
    for (let f = 0; f < 60 * 120 && level.phase !== 'over'; f++) updateRun(level, 1 / 60, drive(f, level.car));
    expect(level.stats.maxWheelie).toBeGreaterThan(0.6);
  });
});

describe('shop', () => {
  const lentes = SHOP_ITEMS.find((i) => i.id === 'lentes')!;

  it('sells at least 6 accessories and 3 paints, every accessory with its look', () => {
    expect(SHOP_ITEMS.filter((i) => i.kind === 'accessory').length).toBeGreaterThanOrEqual(6);
    expect(SHOP_ITEMS.filter((i) => i.kind === 'paint').length).toBeGreaterThanOrEqual(3);
    for (const item of SHOP_ITEMS.filter((i) => i.kind === 'accessory')) expect(ACCESSORIES.some((a) => a.id === item.id), item.id).toBe(true);
  });

  it('buys with enough coins, only once', () => {
    const r = buy(EMPTY_SHOP, lentes, 500);
    expect(r).not.toBeNull();
    expect(r!.coins).toBe(500 - lentes.price);
    expect(r!.state.owned).toEqual(['lentes']);
    expect(buy(r!.state, lentes, 1000)).toBeNull();
    expect(buy(EMPTY_SHOP, lentes, lentes.price - 1)).toBeNull();
  });

  it('only wears accessories that were bought', () => {
    expect(equipAccessory(EMPTY_SHOP, 'lentes').accessory).toBeNull();
    const owned = buy(EMPTY_SHOP, lentes, 500)!.state;
    expect(equipAccessory(owned, 'lentes').accessory).toBe('lentes');
    expect(equipAccessory(equipAccessory(owned, 'lentes'), null).accessory).toBeNull();
  });

  it('repairs a broken saved shop', () => {
    expect(sanitizeShop({ owned: ['lentes', 'lentes', 'nave'], accessory: 'sombrero' })).toEqual({ owned: ['lentes'], accessory: null });
    expect(sanitizeShop(null)).toEqual({ owned: [], accessory: null });
  });
});
