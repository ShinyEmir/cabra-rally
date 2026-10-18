// Car physics with spring suspension. Ported verbatim from the prototype (PHYSICS-START..END).
// Units: meters, seconds, radians. Y points up. Mass is 1, so forces are accelerations.
// Keep the order of arithmetic identical to the prototype so results match bit for bit.
import { clamp } from './math';
import { DEFAULT_TERRAIN, slopeAt, terrain, type TerrainConfig } from './terrain';
import type { CarShape } from './vehicle';

// Values tuned away from the prototype are listed in tests/parity.test.ts (TUNED) and in
// the parameter table of docs/PLAN.md. Mutable so the ?ajuste panel can try values live.
export const PHY = {
  g: 9.8, k: 150, c: 16, maxTravel: 0.5,
  r: 0.4, s0: 0.35, wx: 0.85, wy: 0.2,
  engine: 6.2, brake: 5.5, reverse: 2.4, vmax: 15, vrev: 5, mu: 1.25,
  inertia: 1.1, airTorque: 9, airDamp: 1.0,
  headX: 0.15, headY: 0.82, headR: 0.3,
  dt: 1 / 240,
};

/** Ground tilt from the arrows control scheme. Not in the prototype, so not part of PHY. */
export const LEAN = {
  torque: 9,
};

export interface Wheel {
  /** In contact with the ground. */
  c: boolean;
  /** Current suspension extension. */
  ext: number;
}

export interface Car {
  x: number;
  y: number;
  a: number;
  vx: number;
  vy: number;
  w: number;
  /** [rear, front] */
  wheels: [Wheel, Wheel];
  /** Seconds with no wheel on the ground. */
  air: number;
  /** Seconds spent upside down and nearly stopped. */
  stuck: number;
}

export function newCar(x: number, td: Readonly<TerrainConfig> = DEFAULT_TERRAIN): Car {
  return {
    x: x, y: terrain(x, td) + 1.05, a: 0, vx: 0, vy: 0, w: 0,
    wheels: [{ c: false, ext: PHY.s0 }, { c: false, ext: PHY.s0 }],
    air: 0, stuck: 0,
  };
}

/**
 * The prototype's collision shape: only the driver head crashes and the chassis never touches
 * the ground. With it, stepCar matches the prototype exactly. The game's shapes are in vehicle.ts.
 */
export const PROTOTYPE_SHAPE: Readonly<CarShape> = {
  collision: 'prototype',
  head: { x: PHY.headX, y: PHY.headY, r: PHY.headR },
  extraCrash: [],
  body: { points: [], k: 0, c: 0, mu: 0 },
};

/**
 * How deep a circle centered at (cx, cy) with radius r goes into the ground, measured along the
 * ground normal (treating the ground as straight under the circle). inv is 1 / sqrt(1 + slope^2)
 * at cx. Positive means touching.
 */
function circleDepth(cx: number, cy: number, r: number, inv: number, td: Readonly<TerrainConfig>): number {
  return r - (cy - terrain(cx, td)) * inv;
}

/**
 * One physics step. thr in [-1, 1]: positive is gas, negative is brake or reverse.
 * Returns true if a crash zone (the driver's head first) hits the ground or the car stays
 * upside down. With noCrash the crash checks are skipped (used after a crash, while the car
 * keeps rolling). shape adds chassis contact and per-character crash zones.
 * spin turns the car in the air (the prototype uses thr for it); lean tilts it while on the
 * ground. Both are in [-1, 1], positive nose up; the arrows control scheme sets them apart.
 */
export function stepCar(
  car: Car, thr: number, dt: number, noCrash: boolean,
  td: Readonly<TerrainConfig> = DEFAULT_TERRAIN, shape: Readonly<CarShape> = PROTOTYPE_SHAPE,
  spin = thr, lean = 0,
): boolean {
  let ca = Math.cos(car.a), sa = Math.sin(car.a);
  let fx = 0, fy = -PHY.g, tq = 0, contacts = 0;
  const vf = car.vx * ca + car.vy * sa;
  const L = PHY.s0 + PHY.r;
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1;
    const ox = side * PHY.wx, oy = -PHY.wy;
    const px = car.x + ox * ca - oy * sa, py = car.y + ox * sa + oy * ca;
    const bx = px + sa * L, by = py - ca * L;
    const d = terrain(bx, td) - by;
    const wh = car.wheels[i];
    if (d <= 0) { wh.c = false; wh.ext = PHY.s0; continue; }
    contacts++; wh.c = true; wh.ext = Math.max(0.05, PHY.s0 - d);
    const sl = slopeAt(bx, td), inv = 1 / Math.sqrt(1 + sl * sl);
    const nx = -sl * inv, ny = inv, tx = inv, ty = sl * inv;
    const rx = bx - car.x, ry = by - car.y;
    const vx = car.vx - car.w * ry, vy = car.vy + car.w * rx;
    const vn = vx * nx + vy * ny, vt = vx * tx + vy * ty;
    let Fn = PHY.k * d - PHY.c * vn;
    if (d > PHY.maxTravel) Fn += 600 * (d - PHY.maxTravel);
    if (Fn < 0) Fn = 0;
    let Ft = 0;
    if (thr > 0) Ft = PHY.engine * thr * Math.max(0, 1 - Math.max(0, vf) / PHY.vmax);
    else if (thr < 0) Ft = vf > 0.4 ? -PHY.brake : -PHY.reverse * (-thr) * Math.max(0, 1 - Math.max(0, -vf) / PHY.vrev);
    const cap = Fn * (0.08 + 0.5 * Math.max(0, 1 - Math.abs(vt)));
    if (thr === 0 || (thr < 0 && vf > 0.4)) Ft -= clamp(vt * 6, -cap, cap);
    const maxT = PHY.mu * Fn;
    Ft = clamp(Ft, -maxT, maxT);
    const Fx = Fn * nx + Ft * tx, Fy = Fn * ny + Ft * ty;
    fx += Fx; fy += Fy;
    tq += (px - car.x) * Fy - (py - car.y) * Fx;
  }
  // Solid contact (not in the prototype): chassis circles and crash zones push out of the ground
  // along its normal and slide with friction, so the car scrapes instead of sinking.
  if (shape.collision === 'solid') {
    const body = shape.body, n = body.points.length, total = n + 1 + shape.extraCrash.length;
    for (let i = 0; i < total; i++) {
      const z = i < n ? body.points[i] : i === n ? shape.head : shape.extraCrash[i - n - 1];
      const cx = car.x + z.x * ca - z.y * sa, cy = car.y + z.x * sa + z.y * ca;
      const sl = slopeAt(cx, td), inv = 1 / Math.sqrt(1 + sl * sl);
      const d = circleDepth(cx, cy, z.r, inv, td);
      if (d <= 0) continue;
      contacts++;
      const nx = -sl * inv, ny = inv, tx = inv, ty = sl * inv;
      const rx = cx - nx * z.r - car.x, ry = cy - ny * z.r - car.y;
      const vx = car.vx - car.w * ry, vy = car.vy + car.w * rx;
      const vn = vx * nx + vy * ny, vt = vx * tx + vy * ty;
      let Fn = body.k * d - body.c * vn;
      if (Fn < 0) Fn = 0;
      const cap = body.mu * Fn;
      const Ft = -clamp(vt * 6, -cap, cap);
      const Fx = Fn * nx + Ft * tx, Fy = Fn * ny + Ft * ty;
      fx += Fx; fy += Fy;
      tq += rx * Fy - ry * Fx;
    }
  }
  if (contacts === 0) { tq += PHY.airTorque * spin - car.w * PHY.airDamp; car.air += dt; }
  else {
    tq -= car.w * 0.5;
    // skipped when 0 so the prototype path stays bit for bit identical
    if (lean !== 0) tq += LEAN.torque * lean;
    car.air = 0;
  }
  fx -= car.vx * 0.02;
  car.vx += fx * dt; car.vy += fy * dt; car.w += tq / PHY.inertia * dt;
  car.x += car.vx * dt; car.y += car.vy * dt; car.a += car.w * dt;

  if (noCrash) return false;
  ca = Math.cos(car.a); sa = Math.sin(car.a);
  if (shape.collision === 'prototype') {
    const head = shape.head;
    const hx = car.x + head.x * ca - head.y * sa, hy = car.y + head.x * sa + head.y * ca;
    if (hy - head.r < terrain(hx, td)) return true;
  } else {
    for (let i = 0; i <= shape.extraCrash.length; i++) {
      const z = i === 0 ? shape.head : shape.extraCrash[i - 1];
      const cx = car.x + z.x * ca - z.y * sa, cy = car.y + z.x * sa + z.y * ca;
      const sl = slopeAt(cx, td);
      if (circleDepth(cx, cy, z.r, 1 / Math.sqrt(1 + sl * sl), td) > 0) return true;
    }
  }
  const slow = car.vx * car.vx + car.vy * car.vy < 2;
  if (ca < -0.3 && slow) car.stuck += dt; else car.stuck = 0;
  return car.stuck > 1.2;
}
