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
import type { WorldSpec } from './worlds';

/** Everything the scene needs besides the run itself. */
export interface SceneLook {
  world: WorldSpec;
  car: CarLook;
}

const SKY = {
  cloud: 'rgba(255,255,255,0.85)',
  nightCloud: 'rgba(200,205,240,0.18)',
  clouds: 6,
  wave: 'rgba(255,255,255,0.5)',
  stars: 70,
  starColor: '255,250,225',
  moonGlow: 'rgba(255,250,220,0.13)',
  moonSpot: 'rgba(60,60,110,0.12)',
} as const;

/** Sharp mountains for the far layer, sized in meters (times the screen scale). */
const PEAKS = {
  /** Distance between peaks before jitter. */
  width: 5.5,
  minHeight: 1.7,
  extraHeight: 1.7,
  /** Share of a peak's height covered by snow. */
  snowShare: 0.3,
} as const;

/** One big volcano behind the far hills, repeated every so many meters of its own parallax. */
const VOLCANO = {
  par: 0.06,
  every: 45,
  /** Where it first stands, in meters of its parallax layer, so it shows at the start of a run. */
  first: 11,
  halfBase: 6,
  height: 4.4,
  crater: 0.9,
  color: '#8a6a68',
  rim: '#e0764a',
  smoke: 'rgba(95,80,82,0.32)',
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

/** Sharp peaks with snowy tops along a far layer. */
function drawPeaks(ctx: CanvasRenderingContext2D, scr: Screen, cam: Camera, layer: HillLayer, color: string, snow: string | undefined): void {
  const { W, H, S } = scr;
  const by = H * layer.base + cam.y * S * layer.par * 0.5;
  const span = PEAKS.width * S, off = cam.x * S * layer.par;
  const k0 = Math.floor(off / span) - 1, k1 = Math.ceil((off + W) / span) + 1;
  // valley and apex points, alternating
  const pts: Array<[number, number]> = [];
  for (let k = k0; k <= k1; k++) {
    const x = k * span - off;
    pts.push([x, by - S * 0.5 * hash01(k * 2.3 + 0.7)]);
    pts.push([x + span * (0.35 + 0.3 * hash01(k * 4.1)), by - S * (PEAKS.minHeight + PEAKS.extraHeight * hash01(k * 1.9 + 3))]);
  }
  pts.push([(k1 + 1) * span - off, by]);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(pts[0][0], H);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(pts[pts.length - 1][0], H); ctx.closePath(); ctx.fill();
  if (!snow) return;
  ctx.fillStyle = snow;
  for (let i = 1; i < pts.length - 1; i += 2) {
    const [ax, ay] = pts[i], [lx0, ly0] = pts[i - 1], [rx0, ry0] = pts[i + 1];
    const f = PEAKS.snowShare;
    const lx = ax + (lx0 - ax) * f, ly = ay + (ly0 - ay) * f, rx = ax + (rx0 - ax) * f, ry = ay + (ry0 - ay) * f;
    const dip = S * 0.18;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(rx, ry);
    ctx.lineTo(lx + (rx - lx) * 0.72, ly + (ry - ly) * 0.72 + dip);
    ctx.lineTo(lx + (rx - lx) * 0.5, ly + (ry - ly) * 0.5 - dip * 0.3);
    ctx.lineTo(lx + (rx - lx) * 0.25, ly + (ry - ly) * 0.25 + dip);
    ctx.lineTo(lx, ly); ctx.closePath(); ctx.fill();
  }
}

/** The volcano landmark with a glowing crater and drifting smoke, behind the far hills. */
function drawVolcano(ctx: CanvasRenderingContext2D, scr: Screen, cam: Camera, t: number): void {
  const { W, H, S } = scr;
  const by = H * HILLS[0].base + cam.y * S * VOLCANO.par * 0.5 + S * 0.6;
  const off = cam.x * VOLCANO.par;
  const span = VOLCANO.every;
  const k0 = Math.floor((off - VOLCANO.first - VOLCANO.halfBase) / span), k1 = Math.ceil((off + W / S - VOLCANO.first + VOLCANO.halfBase) / span);
  for (let k = k0; k <= k1; k++) {
    const cx = (VOLCANO.first + k * span - off) * S;
    const hb = VOLCANO.halfBase * S, top = by - VOLCANO.height * S, cr = VOLCANO.crater * S;
    // smoke first, so the cone covers the bottom of the plume
    ctx.fillStyle = VOLCANO.smoke;
    for (let i = 0; i < 6; i++) {
      const life = (t * 0.12 + i / 6) % 1;
      const px = cx + S * (life * 2.2 + Math.sin(life * 5 + i) * 0.3), py = top - S * (0.2 + life * 3.2);
      ctx.beginPath(); ctx.arc(px, py, S * (0.45 + life * 0.9), 0, TAU); ctx.fill();
    }
    ctx.fillStyle = VOLCANO.color;
    ctx.beginPath(); ctx.moveTo(cx - hb, by);
    ctx.quadraticCurveTo(cx - hb * 0.35, by - VOLCANO.height * S * 0.55, cx - cr, top);
    ctx.lineTo(cx + cr, top);
    ctx.quadraticCurveTo(cx + hb * 0.35, by - VOLCANO.height * S * 0.55, cx + hb, by);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = VOLCANO.rim; ctx.lineWidth = Math.max(1.5, S * 0.12); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - cr * 0.8, top + S * 0.04); ctx.lineTo(cx + cr * 0.8, top + S * 0.04); ctx.stroke();
  }
}

/** Twinkling stars and a moon, for night worlds. */
function drawNightSky(ctx: CanvasRenderingContext2D, scr: Screen, cam: Camera, t: number, moon: string): void {
  const { W, H, S } = scr;
  const wrap = W + S * 6;
  for (let i = 0; i < SKY.stars; i++) {
    const x = ((hash01(i * 7.1) * wrap - cam.x * S * 0.02) % wrap + wrap) % wrap - S * 3;
    const y = hash01(i * 3.3 + 1) * H * 0.55;
    const a = 0.45 + 0.55 * Math.abs(Math.sin(t * (0.8 + hash01(i) * 1.5) + i));
    ctx.fillStyle = 'rgba(' + SKY.starColor + ',' + a.toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(x, y, S * (0.03 + 0.05 * hash01(i * 9.7)), 0, TAU); ctx.fill();
  }
  const mx = W * 0.8, my = H * 0.2, r = S * 0.9;
  ctx.fillStyle = SKY.moonGlow;
  ctx.beginPath(); ctx.arc(mx, my, r * 1.7, 0, TAU); ctx.fill();
  ctx.fillStyle = moon;
  ctx.beginPath(); ctx.arc(mx, my, r, 0, TAU); ctx.fill();
  ctx.fillStyle = SKY.moonSpot;
  for (const [dx, dy, rr] of [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.3], [-0.1, 0.4, 0.14]]) {
    ctx.beginPath(); ctx.arc(mx + dx * r, my + dy * r, rr * r, 0, TAU); ctx.fill();
  }
}

/** One silhouette standing at (bx, by) in screen space (y down), h pixels tall. */
function drawProp(ctx: CanvasRenderingContext2D, world: WorldSpec, bx: number, by: number, h: number): void {
  switch (world.prop) {
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
    case 'pine':
      ctx.fillRect(bx - h * 0.05, by - h * 0.35, h * 0.1, h * 0.4);
      for (let k = 0; k < 3; k++) {
        const base = by - h * (0.25 + k * 0.28), w = h * (0.38 - k * 0.09), top = base - h * 0.42;
        ctx.beginPath(); ctx.moveTo(bx - w, base); ctx.lineTo(bx, top); ctx.lineTo(bx + w, base); ctx.closePath(); ctx.fill();
        if (world.propLight) {
          // snow on the tip of each layer
          ctx.fillStyle = world.propLight;
          ctx.beginPath(); ctx.moveTo(bx - w * 0.45, top + h * 0.19); ctx.lineTo(bx, top); ctx.lineTo(bx + w * 0.45, top + h * 0.19);
          ctx.lineTo(bx + w * 0.15, top + h * 0.15); ctx.lineTo(bx - w * 0.1, top + h * 0.2); ctx.closePath(); ctx.fill();
          ctx.fillStyle = world.propColor;
        }
      }
      break;
    case 'corn':
      ctx.lineWidth = Math.max(1, h * 0.05);
      for (const [dx, k] of [[-0.18, 0.95], [0.16, 1.15]]) {
        const sx = bx + dx * h, top = by - h * k;
        ctx.beginPath(); ctx.moveTo(sx, by); ctx.lineTo(sx, top); ctx.stroke();
        for (const [ly, side] of [[0.3, -1], [0.45, 1], [0.6, -1], [0.75, 1]]) {
          const y0 = by - h * k * ly;
          ctx.beginPath(); ctx.moveTo(sx, y0); ctx.quadraticCurveTo(sx + side * h * 0.25, y0 - h * 0.2, sx + side * h * 0.34, y0 - h * 0.02); ctx.stroke();
        }
        // tassel
        for (const a of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(sx, top); ctx.lineTo(sx + Math.sin(a) * h * 0.12, top - h * 0.12); ctx.stroke(); }
        if (world.propLight) {
          ctx.fillStyle = world.propLight;
          ctx.beginPath(); ctx.ellipse(sx + h * 0.06, by - h * k * 0.52, h * 0.045, h * 0.11, 0.3, 0, TAU); ctx.fill();
          ctx.fillStyle = world.propColor;
        }
      }
      break;
    case 'house': {
      const w = h * 0.5, bodyH = h * 0.5, roofH = h * 0.32;
      ctx.fillRect(bx - w, by - bodyH, w * 2, bodyH + h * 0.05);
      ctx.beginPath(); ctx.moveTo(bx - w * 1.18, by - bodyH); ctx.lineTo(bx, by - bodyH - roofH); ctx.lineTo(bx + w * 1.18, by - bodyH); ctx.closePath(); ctx.fill();
      ctx.fillRect(bx + w * 0.45, by - bodyH - roofH * 0.95, w * 0.22, roofH * 0.6);
      if (world.propLight) {
        // two windows and a door with the lights on
        ctx.fillStyle = world.propLight;
        const ws = h * 0.13;
        ctx.fillRect(bx - w * 0.72, by - bodyH * 0.78, ws, ws);
        ctx.fillRect(bx + w * 0.72 - ws, by - bodyH * 0.78, ws, ws);
        ctx.fillRect(bx - ws * 0.5, by - bodyH * 0.55, ws, bodyH * 0.55);
        ctx.fillStyle = world.propColor;
      }
      break;
    }
    case 'rock':
      for (const [dx, dy, rx, ry] of [[-0.2, -0.22, 0.42, 0.3], [0.28, -0.14, 0.3, 0.2], [0.02, -0.38, 0.24, 0.2]]) {
        ctx.beginPath(); ctx.ellipse(bx + dx * h, by + dy * h, rx * h, ry * h, 0, 0, TAU); ctx.fill();
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
    drawProp(ctx, world, sx, hillY(scr, cam, layer, sx) + S * 0.1, h);
  }
}

/** Screen-space background. t is the time in seconds, used to drift the clouds and waves. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, scr: Screen, cam: Camera, t: number, world: WorldSpec): void {
  const { W, H, S } = scr;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, world.sky[0]); g.addColorStop(0.55, world.sky[1]); g.addColorStop(1, world.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (world.night) drawNightSky(ctx, scr, cam, t, world.sun);
  else {
    ctx.fillStyle = world.sun;
    ctx.beginPath(); ctx.arc(W * 0.8, H * 0.2, S * 1.1, 0, TAU); ctx.fill();
  }
  // clouds
  ctx.fillStyle = world.night ? SKY.nightCloud : SKY.cloud;
  for (let i = 0; i < SKY.clouds; i++) {
    const span = W + S * 8;
    const cx = ((i * 0.31 * span - cam.x * S * 0.04 - t * S * 0.15) % span + span) % span - S * 4;
    const cy = H * (0.1 + (i % 3) * 0.1);
    ctx.beginPath();
    ctx.arc(cx, cy, S * 0.55, 0, TAU); ctx.arc(cx + S * 0.7, cy - S * 0.2, S * 0.7, 0, TAU); ctx.arc(cx + S * 1.5, cy, S * 0.5, 0, TAU);
    ctx.fill();
  }
  switch (world.far ?? 'hills') {
    case 'sea': drawSea(ctx, scr, cam, HILLS[0], world.hills[0], t); break;
    case 'peaks': drawPeaks(ctx, scr, cam, HILLS[0], world.hills[0], world.snow); break;
    case 'volcano': drawVolcano(ctx, scr, cam, t); drawHills(ctx, scr, cam, HILLS[0], world.hills[0]); break;
    case 'hills': drawHills(ctx, scr, cam, HILLS[0], world.hills[0]); break;
  }
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
