// Sky, parallax hills with silhouettes, terrain, coins, friends and the stadium. The layout comes
// from the prototype; colors and silhouettes come from the world being played (worlds.ts).
import { friendAnimal } from '../core/animals';
import type { Coin } from '../core/coins';
import { TAU } from '../core/math';
import { hash01 } from '../core/rng';
import type { Run } from '../core/run';
import { slopeAt, terrain } from '../core/terrain';
import type { Car } from '../core/physics';
import { CAMERA, type Camera, type Screen } from './camera';
import { drawAnimalStanding } from './draw-animal';
import { drawCar, type CarLook } from './draw-car';
import { drawParticles, type Particle } from './particles';
import { INK, roundRect } from './shapes';
import type { PropKind, WorldSpec } from './worlds';

/** Everything the scene needs besides the run itself. */
export interface SceneLook {
  world: WorldSpec;
  car: CarLook;
}

const SKY = {
  cloud: 'rgba(255,255,255,0.85)',
  clouds: 6,
  wave: 'rgba(255,255,255,0.5)',
} as const;

interface HillLayer { par: number; amp: number; wl: number; base: number }

/** Far, middle and near layers; colors come from the world. */
const HILLS: readonly HillLayer[] = [
  { par: 0.12, amp: 1.4, wl: 9, base: 0.55 },
  { par: 0.28, amp: 1.0, wl: 6, base: 0.62 },
  { par: 0.5, amp: 0.7, wl: 4, base: 0.7 },
];

const PROPS = {
  /** Meters between silhouettes on the near hills, before jitter. */
  spacing: 7,
  /** Share of slots left empty. */
  skip: 0.35,
  /** Height in meters, before random variation. */
  height: 1.1,
} as const;

const GROUND = {
  bandStep: 1.7,
  sample: 0.3,
} as const;

const COIN = { fill: '#f4b92a', shine: '#ffe27a' } as const;

const CAR_SHADOW = {
  /** Height of the car center above the ground when resting on its wheels. */
  rest: 0.92,
  /** The shadow fades out completely at this height above resting, in meters. */
  fadeHeight: 5,
  alpha: 0.24,
  width: 1.45,
} as const;

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

/** Screen y of a hill layer's top edge at screen x. */
function hillY(scr: Screen, cam: Camera, layer: HillLayer, sx: number): number {
  const { H, S } = scr;
  const by = H * layer.base + cam.y * S * layer.par * 0.5;
  const u = (sx + cam.x * S * layer.par) / (layer.wl * S);
  return by - layer.amp * S * (Math.sin(u) + 0.5 * Math.sin(u * 2.3 + 1) + 0.25 * Math.sin(u * 5.1 + 2));
}

function drawHills(ctx: CanvasRenderingContext2D, scr: Screen, cam: Camera, layer: HillLayer, color: string): void {
  const { W, H } = scr;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let sx = 0; sx <= W + 16; sx += 16) ctx.lineTo(sx, hillY(scr, cam, layer, sx));
  ctx.lineTo(W + 16, H); ctx.closePath(); ctx.fill();
}

function drawSea(ctx: CanvasRenderingContext2D, scr: Screen, cam: Camera, layer: HillLayer, color: string, t: number): void {
  const { W, H, S } = scr;
  const top = H * layer.base + cam.y * S * layer.par * 0.5 - layer.amp * S;
  ctx.fillStyle = color; ctx.fillRect(0, top, W, H - top);
  ctx.strokeStyle = SKY.wave; ctx.lineWidth = Math.max(1, S * 0.06);
  ctx.beginPath();
  for (let sx = 0; sx <= W + 16; sx += 16) {
    const y = top + S * 0.25 + Math.sin((sx + cam.x * S * layer.par) / (S * 0.8) + t * 1.5) * S * 0.06;
    if (sx === 0) ctx.moveTo(sx, y); else ctx.lineTo(sx, y);
  }
  ctx.stroke();
}

/** One silhouette standing at (bx, by) in screen space (y down), h pixels tall. */
function drawProp(ctx: CanvasRenderingContext2D, kind: PropKind, bx: number, by: number, h: number): void {
  switch (kind) {
    case 'tree':
      ctx.fillRect(bx - h * 0.06, by - h * 0.55, h * 0.12, h * 0.6);
      for (const [dx, dy, r] of [[0, -0.75, 0.3], [-0.2, -0.58, 0.22], [0.2, -0.6, 0.22]]) {
        ctx.beginPath(); ctx.arc(bx + dx * h, by + dy * h, r * h, 0, TAU); ctx.fill();
      }
      break;
    case 'jungle':
      ctx.fillRect(bx - h * 0.05, by - h * 1.1, h * 0.1, h * 1.15);
      for (const [dx, dy, r] of [[0, -1.2, 0.32], [-0.28, -1.05, 0.26], [0.28, -1.08, 0.26]]) {
        ctx.beginPath(); ctx.arc(bx + dx * h, by + dy * h, r * h, 0, TAU); ctx.fill();
      }
      ctx.lineWidth = Math.max(1, h * 0.03);
      for (const dx of [-0.3, 0.25]) { ctx.beginPath(); ctx.moveTo(bx + dx * h, by - h); ctx.lineTo(bx + dx * h, by - h * 0.55); ctx.stroke(); }
      break;
    case 'palm': {
      const tx = bx + h * 0.25, ty = by - h * 1.05;
      ctx.lineWidth = Math.max(1, h * 0.08);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + h * 0.02, by - h * 0.6, tx, ty); ctx.stroke();
      ctx.lineWidth = Math.max(1, h * 0.07);
      for (const [ex, ey] of [[-0.5, 0.25], [-0.25, 0.4], [0.3, 0.38], [0.55, 0.2], [0.1, -0.2]]) {
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + ex * h * 0.6, ty - h * 0.2, tx + ex * h, ty + ey * h); ctx.stroke();
      }
      break;
    }
    case 'cactus':
      roundRect(ctx, bx - h * 0.09, by - h, h * 0.18, h * 1.02, h * 0.09); ctx.fill();
      roundRect(ctx, bx - h * 0.34, by - h * 0.78, h * 0.12, h * 0.36, h * 0.06); ctx.fill();
      ctx.fillRect(bx - h * 0.3, by - h * 0.48, h * 0.25, h * 0.1);
      roundRect(ctx, bx + h * 0.22, by - h * 0.9, h * 0.12, h * 0.34, h * 0.06); ctx.fill();
      ctx.fillRect(bx + h * 0.05, by - h * 0.62, h * 0.25, h * 0.1);
      break;
    case 'maguey':
      for (let k = 0; k < 7; k++) {
        const an = -Math.PI * (0.15 + 0.7 * k / 6), len = h * (k === 3 ? 0.75 : 0.6), w = h * 0.07;
        const nx = -Math.sin(an) * w, ny = Math.cos(an) * w;
        ctx.beginPath(); ctx.moveTo(bx + nx, by + ny); ctx.lineTo(bx + Math.cos(an) * len, by + Math.sin(an) * len); ctx.lineTo(bx - nx, by - ny); ctx.closePath(); ctx.fill();
      }
      break;
  }
}

/** Silhouettes along the near hill layer, placed by world position so they scroll with it. */
function drawProps(ctx: CanvasRenderingContext2D, scr: Screen, cam: Camera, layer: HillLayer, world: WorldSpec): void {
  const { W, S } = scr;
  const offset = cam.x * layer.par;
  ctx.fillStyle = world.propColor; ctx.strokeStyle = world.propColor; ctx.lineCap = 'round';
  const k0 = Math.floor((offset - 3) / PROPS.spacing), k1 = Math.ceil((offset + W / S + 3) / PROPS.spacing);
  for (let k = k0; k <= k1; k++) {
    if (hash01(k * 3.7 + 1) < PROPS.skip) continue;
    const xm = k * PROPS.spacing + hash01(k * 1.3) * PROPS.spacing * 0.6;
    const sx = (xm - offset) * S;
    const h = S * PROPS.height * (0.8 + hash01(k * 5.1) * 0.6);
    drawProp(ctx, world.prop, sx, hillY(scr, cam, layer, sx) + S * 0.1, h);
  }
}

/** Screen-space background. t is the time in seconds, used to drift the clouds and waves. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, scr: Screen, cam: Camera, t: number, world: WorldSpec): void {
  const { W, H, S } = scr;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, world.sky[0]); g.addColorStop(0.55, world.sky[1]); g.addColorStop(1, world.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // sun
  ctx.fillStyle = world.sun;
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
  if (world.sea) drawSea(ctx, scr, cam, HILLS[0], world.hills[0], t);
  else drawHills(ctx, scr, cam, HILLS[0], world.hills[0]);
  drawHills(ctx, scr, cam, HILLS[1], world.hills[1]);
  drawProps(ctx, scr, cam, HILLS[2], world);
  drawHills(ctx, scr, cam, HILLS[2], world.hills[2]);
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

/** Soft shadow on the ground under the car; smaller and lighter the higher it jumps. */
function drawCarShadow(ctx: CanvasRenderingContext2D, car: Car, td: Run['mode']['terrain']): void {
  const gy = terrain(car.x, td);
  const k = 1 - Math.max(0, car.y - gy - CAR_SHADOW.rest) / CAR_SHADOW.fadeHeight;
  if (k <= 0) return;
  ctx.save();
  ctx.translate(car.x, gy + 0.03); ctx.rotate(Math.atan(slopeAt(car.x, td)));
  ctx.fillStyle = 'rgba(31, 58, 52, ' + (CAR_SHADOW.alpha * k).toFixed(3) + ')';
  ctx.beginPath(); ctx.ellipse(0, 0, CAR_SHADOW.width * (0.6 + 0.4 * k), 0.12, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

/** World-space scene. Expects the world transform (meters, y up) to be set. */
export function drawWorld(ctx: CanvasRenderingContext2D, scr: Screen, cam: Camera, run: Run, parts: readonly Particle[], t: number, look: SceneLook): void {
  const { W, H, S } = scr;
  const world = look.world, td = run.mode.terrain;
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
  ctx.fillStyle = world.ground[0]; ctx.fill(fill);
  for (let k = 1; k < world.ground.length; k++) {
    ctx.save(); ctx.translate(0, -k * GROUND.bandStep); ctx.fillStyle = world.ground[k]; ctx.fill(fill); ctx.restore();
  }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.save(); ctx.translate(0, -0.24);
  ctx.strokeStyle = world.grass[0]; ctx.lineWidth = 0.55; ctx.stroke(top);
  ctx.restore();
  ctx.save(); ctx.translate(0, -0.1);
  ctx.strokeStyle = world.grass[1]; ctx.lineWidth = 0.28; ctx.stroke(top);
  ctx.restore();

  if (run.mode.finish) drawStadium(ctx, run.mode.finish.x, td);
  drawCarShadow(ctx, run.car, td);
  for (const c of run.field.items) {
    if (c.got || c.x < x0 || c.x > x1) continue;
    drawCoin(ctx, c, t);
  }
  for (const fr of run.friends) {
    if (!fr.got && fr.x > x0 && fr.x < x1) drawAnimalStanding(ctx, friendAnimal(fr.i), fr.x, fr.y, t);
  }
  drawCar(ctx, run.car, run.wheelRot, run.shape, look.car, run.friendsAboard);
  drawParticles(ctx, parts);
}

/** Draws a full frame: background in screen space, then the world through the camera. */
export function renderFrame(ctx: CanvasRenderingContext2D, scr: Screen, cam: Camera, run: Run, parts: readonly Particle[], t: number, look: SceneLook): void {
  const { W, H, S } = scr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawBackdrop(ctx, scr, cam, t, look.world);
  ctx.setTransform(S, 0, 0, -S, W * CAMERA.anchorX - cam.x * S, H * CAMERA.anchorY + cam.y * S);
  drawWorld(ctx, scr, cam, run, parts, t, look);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
