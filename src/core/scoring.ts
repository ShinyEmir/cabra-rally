// Trick scoring: flips, air time, clean landings and wheelies. Ported from the prototype's logic().
// Returns events instead of text so the UI decides how to show them.
import { TAU } from './math';
import type { Car } from './physics';

export const SCORING = {
  /** Seconds without ground contact before a jump starts counting. */
  jumpAfter: 0.12,
  /** Accumulated turns needed for each flip. */
  flipTurns: 0.9,
  /** Points for a flip, multiplied by its number within the same jump. */
  flipPoints: 100,
  /** Points per full second of jump time. */
  airSecondPoints: 50,
  /** Minimum jump time for a clean landing. */
  cleanMinJump: 0.9,
  /** Maximum angle from level for a clean landing, in radians. */
  cleanMaxAngle: 0.5,
  cleanPoints: 50,
  /** Seconds on the rear wheel only per wheelie award. */
  wheelieEvery: 0.6,
  wheeliePoints: 10,
} as const;

export interface JumpState {
  on: boolean;
  /** Angle when the jump started. */
  a0: number;
  /** Jump time, counted from when the jump started. */
  t: number;
  flips: number;
  secs: number;
}

export interface ScoringState {
  jump: JumpState;
  wheelie: number;
  wheelieN: number;
}

export type ScoreEvent =
  | { kind: 'flip'; direction: 'back' | 'front'; count: number; points: number }
  | { kind: 'airtime'; points: number }
  | { kind: 'landing'; points: number }
  | { kind: 'wheelie'; points: number };

export function createScoring(): ScoringState {
  return { jump: { on: false, a0: 0, t: 0, flips: 0, secs: 0 }, wheelie: 0, wheelieN: 0 };
}

/** Wraps an angle to [-PI, PI]. */
export function angNorm(a: number): number {
  a = a % TAU;
  if (a > Math.PI) a -= TAU;
  if (a < -Math.PI) a += TAU;
  return a;
}

/** Advances the scoring state by one frame and appends any awards to out. */
export function updateScoring(s: ScoringState, car: Car, dt: number, out: ScoreEvent[] = []): ScoreEvent[] {
  const J = s.jump;
  if (car.air > SCORING.jumpAfter) {
    if (!J.on) { J.on = true; J.a0 = car.a; J.t = 0; J.flips = 0; J.secs = 0; }
    J.t += dt;
    const rot = car.a - J.a0, nf = Math.floor(Math.abs(rot) / (TAU * SCORING.flipTurns));
    while (J.flips < nf) {
      J.flips++;
      out.push({ kind: 'flip', direction: rot > 0 ? 'back' : 'front', count: J.flips, points: SCORING.flipPoints * J.flips });
    }
    const sec = Math.floor(J.t);
    while (J.secs < sec) { J.secs++; out.push({ kind: 'airtime', points: SCORING.airSecondPoints }); }
  } else if (J.on) {
    if (J.t > SCORING.cleanMinJump && Math.abs(angNorm(car.a)) < SCORING.cleanMaxAngle) {
      out.push({ kind: 'landing', points: SCORING.cleanPoints });
    }
    J.on = false;
  }
  // wheelie: rear wheel down, front wheel up
  if (car.wheels[0].c && !car.wheels[1].c && car.air === 0) {
    s.wheelie += dt;
    const wn = Math.floor(s.wheelie / SCORING.wheelieEvery);
    while (s.wheelieN < wn) { s.wheelieN++; out.push({ kind: 'wheelie', points: SCORING.wheeliePoints }); }
  } else { s.wheelie = 0; s.wheelieN = 0; }
  return out;
}
