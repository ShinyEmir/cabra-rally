import { describe, expect, it } from 'vitest';
import { COINS, collectCoins, createCoinField, generateCoins } from '../src/core/coins';
import { TAU } from '../src/core/math';
import { FREE_MODE } from '../src/core/modes';
import { newCar, type Car } from '../src/core/physics';
import { createRun, updateRun } from '../src/core/run';
import { createScoring, SCORING, updateScoring, type ScoreEvent } from '../src/core/scoring';
import { describeScore } from '../src/ui/strings';
import { holdGas, leveler, mixed, type Driver } from './drivers';

const DT = 1 / 60;

function airborne(a: number, air: number): Car {
  const car = newCar(0);
  car.a = a; car.air = air;
  car.wheels[0].c = false; car.wheels[1].c = false;
  return car;
}

function grounded(a: number, rear = true, front = true): Car {
  const car = newCar(0);
  car.a = a; car.air = 0;
  car.wheels[0].c = rear; car.wheels[1].c = front;
  return car;
}

describe('scoring', () => {
  it('does not start a jump before 0.12 s in the air', () => {
    const s = createScoring();
    updateScoring(s, airborne(0, 0.1), DT);
    expect(s.jump.on).toBe(false);
    updateScoring(s, airborne(0, 0.13), DT);
    expect(s.jump.on).toBe(true);
  });

  it('awards each flip after 0.9 turns, scaled by its number, with direction', () => {
    const s = createScoring();
    const events: ScoreEvent[] = [];
    updateScoring(s, airborne(0, 0.2), DT, events);
    updateScoring(s, airborne(TAU * 0.89, 0.3), DT, events);
    expect(events).toEqual([]);
    updateScoring(s, airborne(TAU * 0.91, 0.4), DT, events);
    updateScoring(s, airborne(TAU * 2.8, 0.5), DT, events);
    expect(events).toEqual([
      { kind: 'flip', direction: 'back', count: 1, points: 100 },
      { kind: 'flip', direction: 'back', count: 2, points: 200 },
      { kind: 'flip', direction: 'back', count: 3, points: 300 },
    ]);
    const front = createScoring(), out: ScoreEvent[] = [];
    updateScoring(front, airborne(0, 0.2), DT, out);
    updateScoring(front, airborne(-TAU, 0.3), DT, out);
    expect(out).toEqual([{ kind: 'flip', direction: 'front', count: 1, points: 100 }]);
  });

  it('names flips as the prototype does', () => {
    expect(describeScore({ kind: 'flip', direction: 'back', count: 1, points: 100 }).text).toBe('Voltereta atrás');
    expect(describeScore({ kind: 'flip', direction: 'front', count: 2, points: 200 }).text).toBe('Doble voltereta adelante');
    expect(describeScore({ kind: 'flip', direction: 'back', count: 4, points: 400 }).text).toBe('Triple voltereta atrás');
  });

  it('awards 50 per full second of jump time', () => {
    const s = createScoring(), events: ScoreEvent[] = [];
    let air = 0.13;
    for (let i = 0; i < 150; i++, air += DT) updateScoring(s, airborne(0, air), DT, events);
    expect(events.filter((e) => e.kind === 'airtime')).toHaveLength(2);
    expect(events.every((e) => e.points === SCORING.airSecondPoints)).toBe(true);
  });

  it('awards a clean landing only after a long enough jump and close to level', () => {
    const land = (jumpFrames: number, a: number) => {
      const s = createScoring(), events: ScoreEvent[] = [];
      for (let i = 0; i < jumpFrames; i++) updateScoring(s, airborne(0, 0.13 + i * DT), DT, events);
      updateScoring(s, grounded(a), DT, events);
      return events.filter((e) => e.kind === 'landing');
    };
    expect(land(60, 0)).toHaveLength(1);
    expect(land(60, TAU + 0.3)).toHaveLength(1);
    expect(land(60, 0.6)).toHaveLength(0);
    expect(land(50, 0)).toHaveLength(0);
  });

  it('awards 10 per 0.6 s on the rear wheel only, and resets when it ends', () => {
    const s = createScoring(), events: ScoreEvent[] = [];
    for (let i = 0; i < 80; i++) updateScoring(s, grounded(0.3, true, false), DT, events);
    expect(events).toEqual([{ kind: 'wheelie', points: 10 }, { kind: 'wheelie', points: 10 }]);
    updateScoring(s, grounded(0), DT, events);
    expect(s.wheelie).toBe(0);
    for (let i = 0; i < 30; i++) updateScoring(s, grounded(0.3, false, true), DT, events);
    expect(events).toHaveLength(2);
  });
});

describe('coins', () => {
  it('places coins deterministically, including arcs over the ramps', () => {
    const a = createCoinField(), b = createCoinField();
    generateCoins(a, 300, FREE_MODE.terrain);
    generateCoins(b, 150, FREE_MODE.terrain);
    generateCoins(b, 300, FREE_MODE.terrain);
    // generating in two batches interleaves ground runs and arcs differently, as in the prototype
    const byX = (field: typeof a) => [...field.items].sort((p, q) => p.x - q.x);
    expect(byX(b)).toEqual(byX(a));
    expect(a.items[0].x).toBe(COINS.firstRun);
    // the first ramp is near x = 71.5 and gets an arc of 4 coins
    expect(a.items.filter((c) => c.x > 72 && c.x < 80)).toHaveLength(COINS.arcCount);
  });

  it('collects a coin once when the car touches it', () => {
    const field = createCoinField();
    field.items.push({ x: 1, y: 1.4, got: false });
    const car = newCar(0);
    car.x = 1; car.y = 1.2;
    expect(collectCoins(field, car)).toHaveLength(1);
    expect(collectCoins(field, car)).toHaveLength(0);
  });
});

describe('free mode runs', () => {
  function play(driver: Driver): ScoreEvent[] {
    const run = createRun(FREE_MODE, 'play');
    const events: ScoreEvent[] = [];
    for (let f = 0; f < 60 * 180 && run.phase !== 'over'; f++) {
      const ev = updateRun(run, DT, driver(f, run.car));
      events.push(...ev.score);
    }
    expect(run.phase).toBe('over');
    return events;
  }

  it('fires every kind of score at least once in scripted runs', () => {
    const kinds = new Set<string>();
    for (const d of [holdGas, leveler(0.1), mixed(14, 2)]) for (const e of play(d)) kinds.add(e.kind);
    expect([...kinds].sort()).toEqual(['airtime', 'flip', 'landing', 'wheelie']);
  });
});
