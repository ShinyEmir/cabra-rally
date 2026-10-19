// Collision shape of a car with its driver, as data. Each character (phase 5) can bring its own
// head position and size, extra crash zones (ears, hats) and chassis outline without new code.
// All positions are in the car's local frame: meters, x forward, y up, origin at the car center.
import type { AnimalSpec } from './animals';
import { PHY } from './physics';

// PROTOTYPE_SHAPE (head only, no chassis contact) lives in physics.ts as stepCar's default.

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export interface BodyContact {
  /** Chassis circles that touch the ground without crashing: the car scrapes instead of sinking. */
  points: Circle[];
  /** Ground stiffness and damping for those circles, and for the crash zones in solid mode. */
  k: number;
  c: number;
  /** Sliding friction while scraping. */
  mu: number;
}

export interface CarShape {
  /**
   * prototype: only the point under the head center is tested and nothing else touches the
   * ground (the prototype's behavior, kept for parity tests).
   * solid: head, extra zones and chassis are circles tested against the slope of the ground,
   * and all of them push out of it, so nothing sinks, not even after a crash.
   */
  collision: 'prototype' | 'solid';
  /** Driver head: drawn here, and the run ends when it touches the ground. */
  head: Circle;
  /** More crash zones beyond the head. */
  extraCrash: Circle[];
  body: BodyContact;
}

/**
 * The game car with its default driver. The body is the rounded box drawn in render/draw-car.ts
 * (x from -1.35 to 1.35, y from -0.38 to 0.40, corner radius 0.22).
 */
export const DEFAULT_CAR_SHAPE: Readonly<CarShape> = {
  collision: 'solid',
  head: { x: PHY.headX, y: PHY.headY, r: PHY.headR },
  extraCrash: [],
  body: {
    points: [
      { x: -1.13, y: -0.16, r: 0.22 },
      { x: 0, y: -0.16, r: 0.22 },
      { x: 1.13, y: -0.16, r: 0.22 },
      { x: -1.13, y: 0.18, r: 0.22 },
      { x: 1.13, y: 0.18, r: 0.22 },
    ],
    k: 800,
    c: 34,
    mu: 0.5,
  },
};

/** Global multiplier on every driver's head size (tuned from the ?ajuste panel). */
export const HITBOX = { headScale: 1 };

/** The car with this driver: same chassis, the driver's own head as the crash zone. */
export function carShapeFor(driver: Readonly<AnimalSpec>): CarShape {
  return {
    ...DEFAULT_CAR_SHAPE,
    head: { x: PHY.headX, y: PHY.headY, r: driver.headR * HITBOX.headScale },
  };
}
