// Collision shape of a car with its driver, as data. Each character (phase 5) can bring its own
// head position and size, extra crash zones (ears, hats) and chassis outline without new code.
// All positions are in the car's local frame: meters, x forward, y up, origin at the car center.
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
  /** Ground stiffness and damping for those points. */
  k: number;
  c: number;
  /** Sliding friction while scraping. */
  mu: number;
}

export interface CarShape {
  /** Driver head: drawn here, and the run ends when it touches the ground. */
  head: Circle;
  /** More crash zones beyond the head. */
  extraCrash: Circle[];
  body: BodyContact;
}

/**
 * Current car and goat. The body is the rounded box drawn in render/draw-car.ts
 * (x from -1.35 to 1.35, y from -0.38 to 0.40, corner radius 0.22).
 */
export const DEFAULT_CAR_SHAPE: Readonly<CarShape> = {
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
