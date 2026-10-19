// Sky, parallax hills, terrain and coins. Ported from the prototype's drawing code.
import type { Coin } from '../core/coins';
import { TAU } from '../core/math';
import type { Run } from '../core/run';
import { terrain } from '../core/terrain';
import { CAMERA, type Camera, type Screen } from './camera';
import { drawFriend } from './draw-animal';
import { drawCar } from './draw-car';
import { drawParticles, type Particle } from './particles';
import { INK, roundRect } from './shapes';

const SKY = {
  top: '#6fc4cc',
  middle: '#cfe8c8',
  bottom: '#f6e4b5',
  sun: '#fff3b8',
  cloud: 'rgba(255,255,255,0.85)',
  clouds: 6,
} as const;

interface HillLayer { par: number; color: string; amp: number; wl: number; base: number }

const HILLS: readonly HillLayer[] = [
  { par: 0.12, color: '#9ed3b5', amp: 1.4, wl: 9, base: 0.55 },
  { par: 0.28, color: '#74b98a', amp: 1.0, wl: 6, base: 0.62 },
  { par: 0.5, color: '#559c58', amp: 0.7, wl: 4, base: 0.7 },
];

const GROUND = {
  shades: ['#8a5c36', '#7a4f2e', '#6b4427', '#5d3a21'],
  bandStep: 1.7,
  sample: 0.3,
  grassDark: '#4c8f3f',
  grassLight: '#7cc152',
} as const;

const COIN = { fill: '#f4b92a', shine: '#ffe27a' } as const;

// Generic stadium with no name or crest, as the plan requires.
const STADIUM = {
  /** Meters behind the finish line. */
  behind: 12,
  tower: '#6d7b78',
  lights: '#fff3b8',
  bowl: '#e8dcc0',
  arches: '#4b5d59',
  roof: '#2f7f80',
  flagDark: '#1f3a34',
  flagLight: '#fff',
} as const;

function drawHills(ctx: CanvasRenderingContext2D, scr: Screen, cam: Camera, layer: HillLayer): void {
  const { W, H, S } = scr;
  ctx.fillStyle = layer.color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  const by = H * layer.base + cam.y * S * layer.par * 0.5;
  for (let sx = 0; sx <= W + 16; sx += 16) {
    const u = (sx + cam.x * S * layer.par) / (layer.wl * S);
    const y = by - layer.amp * S * (Math.sin(u) + 0.5 * Math.sin(u * 2.3 + 1) + 0.25 * Math.sin(u * 5.1 + 2));
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(W + 16, H); ctx.closePath(); ctx.fill();
}

/** Screen-space background. t is the time in seconds, used to drift the clouds. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, scr: Screen, cam: Camera, t: number): void {
  const { W, H, S } = scr;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, SKY.top); g.addColorStop(0.55, SKY.middle); g.addColorStop(1, SKY.bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // sun
  ctx.fillStyle = SKY.sun;
  ctx.beginPath(); ctx.arc(W * 0.8, H * 0.2, S * 1.1, 0, TAU); ctx.fill();
  // clouds
  ctx.fillStyle = SKY.cloud;
  for (let i = 0; i < SKY.clouds; i++) {
    const span = W + S * 8;
    const cx = ((i * 0.31 * span - cam.x * S * 0.04 - t * S * 0.15) % span + span) % span - S * 4;
    const cy = H * (0.1 + (i % 3) * 0.1);
    ctx.beginPath();
    ctx.arc(cx, cy, S * 0.55, 0, TAU); ctx.arc(cx + S * 0.7, cy - S * 0.2, S * 0.7, 0, TAU); ctx.arc(cx + S * 1.5, cy, S * 0.5, 0, TAU);
    ctx.fill();
  }
  for (const layer of HILLS) drawHills(ctx, scr, cam, layer);
}

function drawCoin(ctx: CanvasRenderingContext2D, c: Coin, t: number): void {
  const by = Math.sin(t * 3 + c.x) * 0.08;
  const sx = Math.max(0.08, Math.abs(Math.cos(t * 4 + c.x * 0.7))) * 0.27;
  ctx.fillStyle = COIN.fill; ctx.strokeStyle = INK; ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.ellipse(c.x, c.y + by, sx, 0.27, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = COIN.shine;
  ctx.beginPath(); ctx.ellipse(c.x, c.y + by, sx * 0.5, 0.14, 0, 0, TAU); ctx.fill();
}

function drawStadium(ctx: CanvasRenderingContext2D, finishX: number, td: Run['mode']['terrain']): void {
  const x = finishX + STADIUM.behind, y = terrain(x, td);
  ctx.save(); ctx.translate(x, y);
  ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 0.1;
  // floodlight towers
  ctx.fillStyle = STADIUM.tower;
  ctx.fillRect(-9.5, 0, 0.35, 9); ctx.fillRect(9.2, 0, 0.35, 9);
  ctx.fillStyle = STADIUM.lights;
  roundRect(ctx, -10.6, 8.6, 2.5, 1.1, 0.2); ctx.fill(); ctx.stroke();
  roundRect(ctx, 8.1, 8.6, 2.5, 1.1, 0.2); ctx.fill(); ctx.stroke();
  // bowl
  ctx.fillStyle = STADIUM.bowl;
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-9, 4.4); ctx.quadraticCurveTo(0, 8.4, 9, 4.4); ctx.lineTo(9, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  // arches
  ctx.fillStyle = STADIUM.arches;
  for (let i = 0; i < 6; i++) {
    const ax = -7.2 + i * 2.9;
    ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, 1.6); ctx.arc(ax + 0.7, 1.6, 0.7, Math.PI, 0); ctx.lineTo(ax + 1.4, 0); ctx.closePath(); ctx.fill();
  }
  // roof band
  ctx.fillStyle = STADIUM.roof;
  ctx.beginPath(); ctx.moveTo(-9, 4.4); ctx.quadraticCurveTo(0, 8.4, 9, 4.4); ctx.lineTo(9, 3.7); ctx.quadraticCurveTo(0, 7.5, -9, 3.7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  // finish gate with a checkered banner
  const gy = terrain(finishX, td);
  ctx.save(); ctx.translate(finishX, gy);
  ctx.fillStyle = STADIUM.tower; ctx.strokeStyle = INK; ctx.lineWidth = 0.06;
  ctx.fillRect(-0.15, 0, 0.3, 4.2);
  ctx.fillRect(-0.15 + 3.2, 0, 0.3, 4.2);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) {
    ctx.fillStyle = (r + c) % 2 ? STADIUM.flagDark : STADIUM.flagLight;
    ctx.fillRect(-0.15 + c * 0.4, 3.9 - r * 0.4, 0.4, 0.4);
  }
  ctx.restore();
}

/** World-space scene. Expects the world transform (meters, y up) to be set. */
export function drawWorld(ctx: CanvasRenderingContext2D, scr: Screen, cam: Camera, run: Run, parts: readonly Particle[], t: number): void {
  const { W, H, S } = scr;
  const td = run.mode.terrain;
  const x0 = cam.x - W * CAMERA.anchorX / S - 2, x1 = cam.x + W * (1 - CAMERA.anchorX) / S + 2;
  const yb = cam.y - H * (1 - CAMERA.anchorY) / S - 6;
  const top = new Path2D(), fill = new Path2D();
  fill.moveTo(x0, yb);
  let first = true;
  for (let x = x0; x <= x1; x += GROUND.sample) {
    const h = terrain(x, td);
    fill.lineTo(x, h);
    if (first) { top.moveTo(x, h); first = false; } else top.lineTo(x, h);
  }
  fill.lineTo(x1, yb); fill.closePath();
  ctx.fillStyle = GROUND.shades[0]; ctx.fill(fill);
  for (let k = 1; k < GROUND.shades.length; k++) {
    ctx.save(); ctx.translate(0, -k * GROUND.bandStep); ctx.fillStyle = GROUND.shades[k]; ctx.fill(fill); ctx.restore();
  }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.save(); ctx.translate(0, -0.24);
  ctx.strokeStyle = GROUND.grassDark; ctx.lineWidth = 0.55; ctx.stroke(top);
  ctx.restore();
  ctx.save(); ctx.translate(0, -0.1);
  ctx.strokeStyle = GROUND.grassLight; ctx.lineWidth = 0.28; ctx.stroke(top);
  ctx.restore();

  if (run.mode.finish) drawStadium(ctx, run.mode.finish.x, td);
  for (const c of run.field.items) {
    if (c.got || c.x < x0 || c.x > x1) continue;
    drawCoin(ctx, c, t);
  }
  for (const fr of run.friends) {
    if (!fr.got && fr.x > x0 && fr.x < x1) drawFriend(ctx, fr.x, fr.y, fr.i, t);
  }
  drawCar(ctx, run.car, run.wheelRot, run.shape, run.friendsAboard);
  drawParticles(ctx, parts);
}

/** Draws a full frame: background in screen space, then the world through the camera. */
export function renderFrame(ctx: CanvasRenderingContext2D, scr: Screen, cam: Camera, run: Run, parts: readonly Particle[], t: number): void {
  const { W, H, S } = scr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawBackdrop(ctx, scr, cam, t);
  ctx.setTransform(S, 0, 0, -S, W * CAMERA.anchorX - cam.x * S, H * CAMERA.anchorY + cam.y * S);
  drawWorld(ctx, scr, cam, run, parts, t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
