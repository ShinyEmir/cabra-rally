// Screen metrics and the follow camera. Ported from the prototype's resize() and frameUpdate().
import { clamp } from '../core/math';
import type { Car } from '../core/physics';

export interface Screen {
  /** Canvas size in device pixels. */
  W: number;
  H: number;
  /** Device pixels per meter. */
  S: number;
}

export interface Camera {
  x: number;
  y: number;
}

export const CAMERA = {
  /** Meters visible across and down, at minimum. */
  viewWidth: 15,
  viewHeight: 9.5,
  maxDpr: 2,
  /** Screen position of the camera point, as a fraction of width and height. */
  anchorX: 0.36,
  anchorY: 0.6,
  /** The camera looks ahead by speed times lead, clamped. */
  lead: 0.3,
  leadMin: -1.5,
  leadMax: 4.5,
  lift: 0.5,
  rate: 4,
  xBoost: 1.6,
} as const;

export function measureScreen(canvas: HTMLCanvasElement): Screen {
  const dpr = Math.min(CAMERA.maxDpr, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || window.innerWidth || 800;
  const h = canvas.clientHeight || window.innerHeight || 400;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const W = canvas.width, H = canvas.height;
  return { W, H, S: Math.min(W / CAMERA.viewWidth, H / CAMERA.viewHeight) };
}

export function followCar(cam: Camera, car: Car, dt: number): void {
  const tx = car.x + clamp(car.vx * CAMERA.lead, CAMERA.leadMin, CAMERA.leadMax);
  const ty = car.y + CAMERA.lift;
  const k = 1 - Math.exp(-dt * CAMERA.rate);
  cam.x += (tx - cam.x) * Math.min(1, k * CAMERA.xBoost);
  cam.y += (ty - cam.y) * k;
}
