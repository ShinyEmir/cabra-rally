// Scripted inputs for test runs. All deterministic.
import type { Car } from '../src/core/physics';
import { hash01 } from '../src/core/rng';
import { angNorm } from '../src/core/scoring';

/** Throttle for frame f; may look at the car. */
export type Driver = (f: number, car: Car) => number;

export const holdGas: Driver = () => 1;

/** Gas most of the time, with coasting and brake, changing every changeEvery frames. */
export function mixed(seed: number, changeEvery: number): Driver {
  return (f) => {
    const r = hash01(seed * 1000 + Math.floor(f / changeEvery));
    return r < 0.6 ? 1 : r < 0.8 ? 0 : -1;
  };
}

/** Gas on the ground; in the air, gas or brake to bring the car back to level. */
export function leveler(tolerance: number): Driver {
  return (_f, car) => {
    if (car.air === 0) return 1;
    const a = angNorm(car.a);
    return a > tolerance ? -1 : a < -tolerance ? 1 : 0;
  };
}

/** Uneven frame times between 4 ms and 50 ms, to exercise the accumulator and the frame cap. */
export function jittery(seed: number): (f: number) => number {
  return (f) => Math.min(0.05, 0.004 + hash01(seed * 7919 + f) * 0.056);
}
