import { describe, expect, it } from 'vitest';
import { newCar, PHY, stepCar, type Car } from '../src/core/physics';
import { hash01 } from '../src/core/rng';
import { DEFAULT_TERRAIN, type TerrainConfig } from '../src/core/terrain';

const STEPS_PER_SECOND = Math.round(1 / PHY.dt);
const FLAT: TerrainConfig = { amp: 0, kick: 0, kickH: 1, flatFrom: 1e9 };

function speed(car: Car): number {
  return Math.hypot(car.vx, car.vy);
}

function allFinite(car: Car): boolean {
  const values = [car.x, car.y, car.a, car.vx, car.vy, car.w, car.air, car.stuck, car.wheels[0].ext, car.wheels[1].ext];
  return values.every(Number.isFinite);
}

describe('physics', () => {
  it('settles at rest on flat ground near y = 0.92 without drifting', () => {
    const car = newCar(0);
    for (let i = 0; i < 3 * STEPS_PER_SECOND; i++) stepCar(car, 0, PHY.dt, false);
    expect(car.y).toBeCloseTo(0.92, 2);
    expect(Math.abs(car.x)).toBeLessThan(0.01);
    expect(Math.abs(car.vx)).toBeLessThan(0.01);
    expect(Math.abs(car.a)).toBeLessThan(0.01);
    expect(car.wheels[0].c && car.wheels[1].c).toBe(true);
  });

  it('reaches about 11 m/s after 2 s of gas on flat ground and never exceeds vmax', () => {
    const car = newCar(0, FLAT);
    // let the car drop onto its springs first
    for (let i = 0; i < STEPS_PER_SECOND; i++) stepCar(car, 0, PHY.dt, false, FLAT);
    let maxSpeed = 0;
    for (let i = 0; i < 2 * STEPS_PER_SECOND; i++) {
      stepCar(car, 1, PHY.dt, false, FLAT);
      maxSpeed = Math.max(maxSpeed, speed(car));
    }
    // The prototype gives 11.9 m/s here; the plan says "about 11".
    expect(speed(car)).toBeGreaterThan(10.5);
    expect(speed(car)).toBeLessThan(12.5);
    for (let i = 0; i < 20 * STEPS_PER_SECOND; i++) {
      stepCar(car, 1, PHY.dt, false, FLAT);
      maxSpeed = Math.max(maxSpeed, speed(car));
    }
    expect(maxSpeed).toBeLessThanOrEqual(PHY.vmax);
  });

  it('stays finite for 60 s under any mix of gas and brake', () => {
    const terrains: TerrainConfig[] = [DEFAULT_TERRAIN, FLAT, { amp: 0.75, kick: 1, kickH: 0.7, flatFrom: 260 }];
    for (const td of terrains) {
      for (let seed = 0; seed < 8; seed++) {
        const car = newCar(0, td);
        let thr = 0;
        for (let i = 0; i < 60 * STEPS_PER_SECOND; i++) {
          // a new random input every quarter second
          if (i % 60 === 0) thr = Math.floor(hash01(seed * 1000 + i / 60) * 3) - 1;
          stepCar(car, thr, PHY.dt, true, td);
          if (!allFinite(car)) throw new Error(`non-finite state at step ${i}, seed ${seed}`);
        }
      }
    }
  });

  it('gives more than 1 s of air on a free mode ramp with gas held', () => {
    const car = newCar(0);
    let maxAir = 0;
    // skip the initial drop onto the springs, then hold gas until the first crash or 30 s
    for (let i = 0; i < 30 * STEPS_PER_SECOND; i++) {
      const crashed = stepCar(car, 1, PHY.dt, false);
      if (car.x > 50) maxAir = Math.max(maxAir, car.air);
      if (crashed) break;
    }
    expect(maxAir).toBeGreaterThan(1);
  });
});
