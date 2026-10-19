// Visual-only particles: coin sparkles, wheel dust and exhaust puffs. Ported from the prototype.
import { TAU } from '../core/math';
import { PHY, type Car } from '../core/physics';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  col: string;
}

const PARTICLES = {
  gravity: 3,
  alpha: 0.85,
  coinCount: 5,
  coinColor: '#ffe27a',
  dustColor: '#d8c39a',
  /** Dust shows above this horizontal speed. */
  dustMinSpeed: 3,
  dustRate: 28,
  exhaustColor: '#e9e4d4',
  exhaustRate: 22,
} as const;

export function coinBurst(parts: Particle[], x: number, y: number): void {
  for (let s = 0; s < PARTICLES.coinCount; s++) {
    parts.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 4, life: 0.4, max: 0.4, r: 0.09, col: PARTICLES.coinColor });
  }
}

/** Dust from wheels on the ground, and exhaust while the gas is held. */
export function emitDriving(parts: Particle[], car: Car, dt: number, gasOn: boolean): void {
  for (let i = 0; i < 2; i++) {
    const wh = car.wheels[i];
    const sp = Math.abs(car.vx);
    if (wh.c && sp > PARTICLES.dustMinSpeed && Math.random() < dt * PARTICLES.dustRate) {
      const side = i === 0 ? -1 : 1, ca = Math.cos(car.a), sa = Math.sin(car.a);
      const wx = car.x + side * PHY.wx * ca + PHY.wy * sa + sa * (PHY.s0 + PHY.r);
      const wy = car.y + side * PHY.wx * sa - PHY.wy * ca - ca * (PHY.s0 + PHY.r);
      parts.push({ x: wx, y: wy + 0.05, vx: -car.vx * 0.15 + (Math.random() - 0.5), vy: 0.6 + Math.random(), life: 0.45, max: 0.45, r: 0.12, col: PARTICLES.dustColor });
    }
  }
  if (gasOn && Math.random() < dt * PARTICLES.exhaustRate) {
    const c2 = Math.cos(car.a), s2 = Math.sin(car.a);
    parts.push({ x: car.x - 1.35 * c2 + 0.1 * s2, y: car.y - 1.35 * s2 - 0.1 * c2, vx: -1.2 + (Math.random() - 0.5), vy: 0.5 + Math.random() * 0.5, life: 0.5, max: 0.5, r: 0.1, col: PARTICLES.exhaustColor });
  }
}

export function updateParticles(parts: Particle[], dt: number): void {
  for (let p = parts.length - 1; p >= 0; p--) {
    const q = parts[p];
    q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy -= PARTICLES.gravity * dt;
    if (q.life <= 0) parts.splice(p, 1);
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, parts: readonly Particle[]): void {
  for (const q of parts) {
    ctx.globalAlpha = Math.max(0, q.life / q.max) * PARTICLES.alpha;
    ctx.fillStyle = q.col;
    ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1.6 - q.life / q.max * 0.6), 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** White puff when a friend jumps on board. */
export function friendBurst(parts: Particle[], x: number, y: number): void {
  for (let s = 0; s < 8; s++) {
    parts.push({ x, y: y + 0.8, vx: (Math.random() - 0.5) * 5, vy: Math.random() * 5, life: 0.5, max: 0.5, r: 0.1, col: '#fff' });
  }
}
