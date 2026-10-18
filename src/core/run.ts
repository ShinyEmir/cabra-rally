// One run of the game: car, fixed-step physics, coins, scoring and the crash timer.
// Mirrors the prototype's stepAll(), logic() and the play/crash/menu parts of frameUpdate().
import { collectCoins, createCoinField, generateCoins, type Coin, type CoinField } from './coins';
import type { ModeSpec } from './modes';
import { newCar, PHY, stepCar, type Car } from './physics';
import { createScoring, updateScoring, type ScoreEvent, type ScoringState } from './scoring';
import { DEFAULT_CAR_SHAPE, type CarShape } from './vehicle';

export const RUN = {
  /** Physics steps per frame are capped so slow devices fall behind instead of freezing. */
  maxStepsPerFrame: 40,
  /** Seconds the car keeps rolling after a crash before the results show. */
  crashDelay: 0.9,
} as const;

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
  scoring: ScoringState;
  crashT: number;
  /** Unspent frame time for the fixed physics step. */
  acc: number;
  /** Visual wheel rotation, radians. */
  wheelRot: [number, number];
}

export interface FrameEvents {
  score: ScoreEvent[];
  coins: Coin[];
  /** The car crashed during this frame. */
  crashed: boolean;
  /** The crash delay ran out during this frame; the run is over. */
  finished: boolean;
}

/** acc carries leftover frame time from the previous run, as the prototype does. */
export function createRun(mode: Readonly<ModeSpec>, phase: 'idle' | 'play', acc = 0, shape: Readonly<CarShape> = DEFAULT_CAR_SHAPE): Run {
  const car = newCar(0, mode.terrain);
  const field = createCoinField();
  if (phase === 'play') generateCoins(field, mode.initialCoinsUpTo, mode.terrain);
  return {
    mode, shape, phase, car, startX: car.x, score: 0, coins: 0, field,
    scoring: createScoring(), crashT: 0, acc, wheelRot: [0, 0],
  };
}

export function distance(run: Run): number {
  return Math.max(0, Math.floor(run.car.x - run.startX));
}

function stepOnce(run: Run, thr: number, ev: FrameEvents): void {
  const car = run.car;
  const playing = run.phase === 'play';
  const crashed = stepCar(car, playing ? thr : 0, PHY.dt, !playing, run.mode.terrain, run.shape);
  const vf = car.vx * Math.cos(car.a) + car.vy * Math.sin(car.a);
  run.wheelRot[0] += vf / PHY.r * PHY.dt;
  run.wheelRot[1] += vf / PHY.r * PHY.dt;
  if (crashed && playing) { run.phase = 'crash'; run.crashT = 0; ev.crashed = true; }
}

/** Advances the run by one rendered frame of length dt with throttle thr in [-1, 1]. */
export function updateRun(run: Run, dt: number, thr: number): FrameEvents {
  const ev: FrameEvents = { score: [], coins: [], crashed: false, finished: false };
  if (run.phase === 'over') return ev;
  run.acc += dt;
  let n = 0;
  while (run.acc >= PHY.dt && n < RUN.maxStepsPerFrame) { stepOnce(run, thr, ev); run.acc -= PHY.dt; n++; }
  if (run.acc > PHY.dt) run.acc = 0;
  if (run.phase === 'play') {
    const car = run.car;
    generateCoins(run.field, car.x + run.mode.coinLookahead, run.mode.terrain);
    ev.coins = collectCoins(run.field, car);
    run.coins += ev.coins.length;
    updateScoring(run.scoring, car, dt, ev.score);
    for (const e of ev.score) run.score += e.points;
  }
  if (run.phase === 'crash') {
    run.crashT += dt;
    if (run.crashT > RUN.crashDelay) { run.phase = 'over'; ev.finished = true; }
  }
  return ev;
}
