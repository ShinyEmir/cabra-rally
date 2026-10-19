// One run of the game: car, fixed-step physics, coins, scoring and the crash timer.
// Mirrors the prototype's stepAll(), logic() and the play/crash/menu parts of frameUpdate().
import { collectCoins, createCoinField, generateCoins, type Coin, type CoinField } from './coins';
import type { ModeSpec } from './modes';
import { newCar, PHY, stepCar, type Car } from './physics';
import { createScoring, updateScoring, type ScoreEvent, type ScoringState } from './scoring';
import { terrain } from './terrain';
import { DEFAULT_CAR_SHAPE, type CarShape } from './vehicle';

export const RUN = {
  /** Physics steps per frame are capped so slow devices fall behind instead of freezing. */
  maxStepsPerFrame: 40,
  /** Seconds the car keeps rolling after a crash before the results show. */
  crashDelay: 0.9,
} as const;

export const FRIENDS = {
  /** Pickup is measured to this height above the friend's feet. */
  pickOffsetY: 0.6,
  /** Squared pickup distance (about 1.84 m). */
  pickR2: 3.4,
} as const;

export interface Friend {
  x: number;
  /** Ground height where the friend stands. */
  y: number;
  got: boolean;
  /** Order along the level, used to pick its look. */
  i: number;
}

/**
 * idle: the car settles with no control (behind the menu).
 * play: normal driving. crash: rolling with no control. over: frozen.
 */
export type RunPhase = 'idle' | 'play' | 'crash' | 'over';

export interface Run {
  mode: Readonly<ModeSpec>;
  /** Collision shape of the car and driver in this run. */
  shape: Readonly<CarShape>;
  phase: RunPhase;
  car: Car;
  startX: number;
  score: number;
  coins: number;
  field: CoinField;
  friends: Friend[];
  friendsAboard: number;
  /** Crossed the finish line. */
  won: boolean;
  /** Best moments of this run, for challenges. */
  stats: RunStats;
  scoring: ScoringState;
  crashT: number;
  /** Unspent frame time for the fixed physics step. */
  acc: number;
  /** Visual wheel rotation, radians. */
  wheelRot: [number, number];
}

export interface RunStats {
  /** Most flips in a single jump. */
  maxFlips: number;
  /** Longest jump, in seconds (counted like the air time score). */
  maxJump: number;
  /** Longest wheelie, in seconds. */
  maxWheelie: number;
}

/** Player input for one frame. Each value is in [-1, 1]. */
export interface DriveInput {
  /** Gas positive, brake or reverse negative. */
  thr: number;
  /** Turning in the air, nose up positive. */
  spin: number;
  /** Tilting on the ground, nose up positive. */
  lean: number;
}

/** The classic two-pedal input: the pedals also turn the car in the air, as in the prototype. */
export function pedalsOnly(thr: number): DriveInput {
  return { thr, spin: thr, lean: 0 };
}

export interface FrameEvents {
  score: ScoreEvent[];
  coins: Coin[];
  friends: Friend[];
  /** The car crashed during this frame. */
  crashed: boolean;
  /** The run ended during this frame: the crash delay ran out, or the finish line was crossed. */
  finished: boolean;
  /** The finish line was crossed during this frame (bonus already in the score). */
  won: boolean;
  /** Finish bonus added this frame. */
  bonus: number;
}

/** acc carries leftover frame time from the previous run, as the prototype does. */
export function createRun(mode: Readonly<ModeSpec>, phase: 'idle' | 'play', acc = 0, shape: Readonly<CarShape> = DEFAULT_CAR_SHAPE): Run {
  const car = newCar(0, mode.terrain);
  const field = createCoinField();
  if (phase === 'play') generateCoins(field, mode.initialCoinsUpTo, mode.terrain);
  return {
    mode, shape, phase, car, startX: car.x, score: 0, coins: 0, field,
    friends: mode.friends.map((x, i) => ({ x, y: terrain(x, mode.terrain), got: false, i })),
    friendsAboard: 0, won: false, stats: { maxFlips: 0, maxJump: 0, maxWheelie: 0 },
    scoring: createScoring(), crashT: 0, acc, wheelRot: [0, 0],
  };
}

export function distance(run: Run): number {
  return Math.max(0, Math.floor(run.car.x - run.startX));
}

function stepOnce(run: Run, input: DriveInput, ev: FrameEvents): void {
  const car = run.car;
  const playing = run.phase === 'play';
  const crashed = playing
    ? stepCar(car, input.thr, PHY.dt, false, run.mode.terrain, run.shape, input.spin, input.lean)
    : stepCar(car, 0, PHY.dt, true, run.mode.terrain, run.shape);
  const vf = car.vx * Math.cos(car.a) + car.vy * Math.sin(car.a);
  run.wheelRot[0] += vf / PHY.r * PHY.dt;
  run.wheelRot[1] += vf / PHY.r * PHY.dt;
  if (crashed && playing) { run.phase = 'crash'; run.crashT = 0; ev.crashed = true; }
}

/** Advances the run by one rendered frame of length dt. A number is the classic pedal throttle. */
export function updateRun(run: Run, dt: number, input: DriveInput | number): FrameEvents {
  const drive = typeof input === 'number' ? pedalsOnly(input) : input;
  const ev: FrameEvents = { score: [], coins: [], friends: [], crashed: false, finished: false, won: false, bonus: 0 };
  if (run.phase === 'over') return ev;
  run.acc += dt;
  let n = 0;
  while (run.acc >= PHY.dt && n < RUN.maxStepsPerFrame) { stepOnce(run, drive, ev); run.acc -= PHY.dt; n++; }
  if (run.acc > PHY.dt) run.acc = 0;
  if (run.phase === 'play') {
    const car = run.car;
    generateCoins(run.field, car.x + run.mode.coinLookahead, run.mode.terrain);
    ev.coins = collectCoins(run.field, car);
    run.coins += ev.coins.length;
    for (const fr of run.friends) {
      if (fr.got) continue;
      const dx = fr.x - car.x, dy = (fr.y + FRIENDS.pickOffsetY) - car.y;
      if (dx * dx + dy * dy < FRIENDS.pickR2) { fr.got = true; run.friendsAboard++; ev.friends.push(fr); }
    }
    updateScoring(run.scoring, car, dt, ev.score);
    for (const e of ev.score) run.score += e.points;
    const st = run.stats, sc = run.scoring;
    if (sc.jump.on) { st.maxFlips = Math.max(st.maxFlips, sc.jump.flips); st.maxJump = Math.max(st.maxJump, sc.jump.t); }
    st.maxWheelie = Math.max(st.maxWheelie, sc.wheelie);
    const finish = run.mode.finish;
    if (finish && car.x >= finish.x) {
      ev.bonus = run.friendsAboard * finish.friendBonus;
      run.score += ev.bonus;
      run.won = true;
      run.phase = 'over';
      ev.finished = true;
      ev.won = true;
    }
  }
  if (run.phase === 'crash') {
    run.crashT += dt;
    if (run.crashT > RUN.crashDelay) { run.phase = 'over'; ev.finished = true; }
  }
  return ev;
}
