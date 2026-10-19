// Draws any AnimalSpec from its parts. World units, y up, facing right (+x).
// Adding an animal is a new entry in core/animals.ts; this file only grows when a new kind of
// part (a new ear, snout, mark, tail or body style) is needed.
import type { AnimalSpec } from '../core/animals';
import { TAU } from '../core/math';
import { INK } from './shapes';

const ANIMAL = {
  eyeWhite: '#fff',
  beakStripe: '#f7d23e',
  feet: '#e0a33a',
  legs: '#5b4636',
  wingBlur: 'rgba(255,255,255,0.55)',
} as const;

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}

function fillStroke(ctx: CanvasRenderingContext2D, fill: string): void {
  ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
}

// ---------------------------------------------------------------- head parts

function drawEars(ctx: CanvasRenderingContext2D, a: AnimalSpec, W: number, H: number, r: number): void {
  const c = a.colors.ears ?? a.colors.main;
  switch (a.ears) {
    case 'round':
      ellipse(ctx, -0.32 * W, 0.84 * H, 0.32 * r, 0.32 * r); fillStroke(ctx, c);
      ellipse(ctx, -0.32 * W, 0.84 * H, 0.15 * r, 0.15 * r); ctx.fillStyle = a.colors.light; ctx.fill();
      break;
    case 'small':
      ellipse(ctx, -0.42 * W, 0.82 * H, 0.2 * r, 0.2 * r); fillStroke(ctx, c);
      ellipse(ctx, 0.02 * W, 0.92 * H, 0.18 * r, 0.18 * r); fillStroke(ctx, c);
      break;
    case 'tall':
      ellipse(ctx, -0.5 * W, 0.95 * H, 0.14 * r, 0.4 * r, 0.35); fillStroke(ctx, c);
      ellipse(ctx, -0.22 * W, 1.02 * H, 0.14 * r, 0.4 * r, 0.15); fillStroke(ctx, c);
      break;
    case 'pointed':
      ctx.beginPath(); ctx.moveTo(-0.6 * W, 0.55 * H); ctx.lineTo(-0.38 * W, 1.3 * H); ctx.lineTo(-0.1 * W, 0.7 * H); ctx.closePath(); fillStroke(ctx, c);
      break;
    case 'none':
      break;
  }
}

/** Three feathery gill stalks on the back of the head (axolotl). */
function drawGills(ctx: CanvasRenderingContext2D, a: AnimalSpec, W: number, H: number, r: number): void {
  const stalks: Array<[number, number]> = [[0.55, 2.0], [0.15, 2.6], [-0.25, 3.2]];
  for (const [y, ang] of stalks) {
    const bx = -0.7 * W, by = y * H, len = 1.0 * r;
    const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    // a feathery frond: a row of soft lobes on both sides of the stalk
    ctx.fillStyle = a.colors.accent;
    for (let k = 1; k <= 4; k++) {
      const f = k / 4.4, px = bx + (ex - bx) * f, py = by + (ey - by) * f, w = 0.17 * r * (1.1 - f * 0.4);
      ellipse(ctx, px + nx * w * 0.8, py + ny * w * 0.8, w, w * 0.6, ang); ctx.fill();
      ellipse(ctx, px - nx * w * 0.8, py - ny * w * 0.8, w, w * 0.6, ang); ctx.fill();
    }
    ctx.strokeStyle = a.colors.detail; ctx.lineWidth = 0.08 * r;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
  }
  ctx.strokeStyle = INK;
}

function clipToHead(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ellipse(ctx, 0, 0, W, H); ctx.clip();
}

function drawHeadMarks(ctx: CanvasRenderingContext2D, a: AnimalSpec, W: number, H: number, r: number): void {
  const eyeX = 0.3 * W, eyeY = 0.18 * H;
  switch (a.marks) {
    case 'shield': {
      // banded helmet over the top of the head
      ctx.save(); clipToHead(ctx, W, H);
      ctx.fillStyle = a.colors.accent; ctx.fillRect(-W, 0.3 * H, 1.75 * W, H);
      ctx.strokeStyle = a.colors.detail; ctx.lineWidth = 0.07 * r;
      for (const x of [-0.55, -0.2, 0.15]) { ctx.beginPath(); ctx.moveTo(x * W, 0.3 * H); ctx.lineTo((x + 0.08) * W, H); ctx.stroke(); }
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(-0.95 * W, 0.3 * H); ctx.lineTo(0.75 * W, 0.3 * H); ctx.stroke();
      break;
    }
    case 'spots': {
      ctx.save(); clipToHead(ctx, W, H);
      ctx.strokeStyle = a.colors.detail; ctx.lineWidth = 0.07 * r;
      for (const [x, y] of [[-0.5, 0.4], [-0.15, 0.68], [-0.62, -0.15], [-0.25, 0.15], [0.05, -0.55]]) {
        ellipse(ctx, x * W, y * H, 0.11 * r, 0.09 * r); ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'mask':
      ellipse(ctx, eyeX, eyeY, 0.3 * r, 0.2 * r, -0.2); ctx.fillStyle = a.colors.detail; ctx.fill();
      ctx.strokeStyle = a.colors.light; ctx.lineWidth = 0.08 * r;
      ctx.beginPath(); ctx.moveTo(eyeX - 0.25 * r, eyeY + 0.27 * r); ctx.lineTo(eyeX + 0.25 * r, eyeY + 0.22 * r); ctx.stroke();
      ctx.strokeStyle = INK;
      break;
    case 'face':
      // pale front of the face (opossum)
      ctx.save(); clipToHead(ctx, W, H);
      ellipse(ctx, 0.55 * W, -0.15 * H, 0.75 * W, 0.8 * H); ctx.fillStyle = a.colors.light; ctx.fill();
      ctx.restore();
      break;
    case 'eyeRing':
      ellipse(ctx, eyeX, eyeY, 0.24 * r, 0.24 * r); ctx.fillStyle = a.colors.detail; ctx.fill();
      // pale bib under the beak
      ctx.save(); clipToHead(ctx, W, H);
      ellipse(ctx, 0.45 * W, -0.7 * H, 0.6 * W, 0.45 * H); ctx.fillStyle = a.colors.light; ctx.fill();
      ctx.restore();
      break;
    case 'throat':
      ctx.save(); clipToHead(ctx, W, H);
      ellipse(ctx, 0.35 * W, -0.65 * H, 0.5 * W, 0.4 * H); ctx.fillStyle = a.colors.detail; ctx.fill();
      ctx.restore();
      break;
    case 'gills':
    case 'none':
      break;
  }
}

function drawSnout(ctx: CanvasRenderingContext2D, a: AnimalSpec, W: number, H: number, r: number): void {
  const c = a.colors;
  switch (a.snout) {
    case 'smile':
      // wide smile and two nostrils (axolotl)
      ctx.lineWidth = 0.09 * r;
      ctx.beginPath(); ctx.moveTo(0.05 * W, -0.25 * H); ctx.quadraticCurveTo(0.6 * W, -0.62 * H, 0.98 * W, -0.12 * H); ctx.stroke();
      ellipse(ctx, 0.2 * W, -0.1 * H, 0.16 * r, 0.1 * r); ctx.fillStyle = c.light; ctx.fill();
      ctx.fillStyle = INK;
      ellipse(ctx, 0.88 * W, 0.12 * H, 0.035 * r, 0.035 * r); ctx.fill();
      break;
    case 'long':
    case 'longUp':
    case 'pointed':
      // drawn under the head by drawSnoutBase
      break;
    case 'muzzle':
      ellipse(ctx, 0.6 * W, -0.32 * H, 0.27 * r, 0.22 * r); fillStroke(ctx, c.light);
      ctx.beginPath(); ctx.moveTo(0.75 * W, -0.05 * H); ctx.lineTo(0.95 * W, -0.05 * H); ctx.lineTo(0.85 * W, -0.2 * H); ctx.closePath();
      ctx.fillStyle = c.accent; ctx.fill();
      ctx.fillStyle = INK;
      for (const [x, y] of [[0.5, -0.32], [0.62, -0.4], [0.72, -0.3]]) { ellipse(ctx, x * W, y * H, 0.025 * r, 0.025 * r); ctx.fill(); }
      break;
    case 'beakBig': {
      const tipX = W + 1.45 * r;
      ctx.beginPath();
      ctx.moveTo(0.55 * W, 0.32 * H);
      ctx.quadraticCurveTo(0.9 * W + 0.8 * r, 0.42 * H, tipX, -0.12 * r);
      ctx.quadraticCurveTo(0.9 * W + 0.7 * r, -0.4 * H, 0.55 * W, -0.38 * H);
      ctx.closePath(); fillStroke(ctx, c.accent);
      // pale band near the face and a dark tip
      ctx.save(); ctx.clip();
      ctx.fillStyle = ANIMAL.beakStripe; ctx.fillRect(0.55 * W, -H, 0.35 * r, 2 * H);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(tipX - 0.35 * r, 0.3 * r); ctx.lineTo(tipX + 0.1 * r, 0.3 * r); ctx.lineTo(tipX + 0.1 * r, -0.4 * r); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(0.6 * W, -0.04 * H); ctx.quadraticCurveTo(W + 0.6 * r, 0.0, tipX - 0.05 * r, -0.1 * r); ctx.stroke();
      break;
    }
    case 'beakThin':
      ctx.lineWidth = 0.1 * r; ctx.strokeStyle = c.accent;
      ctx.beginPath(); ctx.moveTo(0.85 * W, 0.0); ctx.lineTo(W + 1.25 * r, -0.12 * r); ctx.stroke();
      ctx.strokeStyle = INK;
      break;
  }
}

/** Snouts that grow out from under the head: a rounded tube with a nose at the tip. */
function drawSnoutBase(ctx: CanvasRenderingContext2D, a: AnimalSpec, W: number, H: number, r: number): void {
  const c = a.colors;
  let cx: number, cy: number, rx: number, ry: number, rot: number, fill: string, nose: string;
  switch (a.snout) {
    case 'long': cx = 0.75 * W + 0.4 * r; cy = -0.22 * H; rx = 0.62 * r; ry = 0.17 * r; rot = -0.18; fill = c.main; nose = c.detail; break;
    case 'longUp': cx = 0.75 * W + 0.38 * r; cy = -0.08 * H; rx = 0.6 * r; ry = 0.16 * r; rot = 0.22; fill = c.main; nose = c.detail; break;
    case 'pointed': cx = 0.7 * W + 0.25 * r; cy = -0.2 * H; rx = 0.48 * r; ry = 0.22 * r; rot = -0.22; fill = c.light; nose = c.accent; break;
    default: return;
  }
  ellipse(ctx, cx, cy, rx, ry, rot); fillStroke(ctx, fill);
  ellipse(ctx, cx + Math.cos(rot) * rx * 0.92, cy + Math.sin(rot) * rx * 0.92, 0.1 * r, 0.09 * r); fillStroke(ctx, nose);
}

function drawEye(ctx: CanvasRenderingContext2D, a: AnimalSpec, W: number, H: number, r: number, look: number): void {
  const x = 0.3 * W, y = 0.18 * H;
  if (a.eye === 'dot') {
    ctx.fillStyle = INK; ellipse(ctx, x, y, 0.1 * r, 0.1 * r); ctx.fill();
    ctx.fillStyle = ANIMAL.eyeWhite; ellipse(ctx, x + 0.03 * r, y + 0.04 * r, 0.035 * r, 0.035 * r); ctx.fill();
    return;
  }
  ctx.fillStyle = ANIMAL.eyeWhite; ellipse(ctx, x, y, 0.15 * r, 0.15 * r); ctx.fill();
  ctx.fillStyle = INK; ellipse(ctx, x + 0.04 * r + look * 0.02 * r, y, 0.08 * r, 0.08 * r); ctx.fill();
}

/** Head centered at (cx, cy) with radius r. look moves the pupil forward. */
export function drawAnimalHead(ctx: CanvasRenderingContext2D, a: AnimalSpec, cx: number, cy: number, r: number, look = 1): void {
  const W = r * a.head.w, H = r * a.head.h;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = 0.16 * r;
  drawEars(ctx, a, W, H, r);
  if (a.marks === 'gills') drawGills(ctx, a, W, H, r);
  ctx.lineWidth = 0.13 * r;
  drawSnoutBase(ctx, a, W, H, r);
  ctx.lineWidth = 0.16 * r;
  ellipse(ctx, 0, 0, W, H); fillStroke(ctx, a.colors.main);
  ctx.lineWidth = 0.12 * r;
  drawHeadMarks(ctx, a, W, H, r);
  drawSnout(ctx, a, W, H, r);
  drawEye(ctx, a, W, H, r, look);
  ctx.restore();
}

// ---------------------------------------------------------------- standing body

function drawTail(ctx: CanvasRenderingContext2D, a: AnimalSpec): void {
  const c = a.colors;
  switch (a.tail) {
    case 'fin':
      ctx.beginPath(); ctx.moveTo(-0.3, 0.75); ctx.quadraticCurveTo(-1.0, 0.95, -1.15, 0.5); ctx.quadraticCurveTo(-0.9, 0.25, -0.3, 0.35); ctx.closePath();
      fillStroke(ctx, c.light);
      break;
    case 'cone':
      ctx.beginPath(); ctx.moveTo(-0.35, 0.55); ctx.lineTo(-1.0, 0.22); ctx.lineTo(-0.3, 0.35); ctx.closePath(); fillStroke(ctx, c.accent);
      break;
    case 'long':
      ctx.lineWidth = a.body === 'slim' ? 0.08 : 0.12;
      ctx.strokeStyle = a.body === 'slim' ? c.accent : c.main;
      ctx.beginPath(); ctx.moveTo(-0.35, 0.5); ctx.quadraticCurveTo(-1.05, 0.2, -1.05, 0.75); ctx.stroke();
      if (a.body !== 'slim') { ctx.strokeStyle = c.detail; ctx.beginPath(); ctx.moveTo(-1.06, 0.62); ctx.lineTo(-1.05, 0.75); ctx.stroke(); }
      ctx.strokeStyle = INK; ctx.lineWidth = 0.05;
      break;
    case 'ringed':
      ctx.lineWidth = 0.16; ctx.strokeStyle = c.main;
      ctx.beginPath(); ctx.moveTo(-0.32, 0.6); ctx.quadraticCurveTo(-0.85, 0.7, -0.78, 1.35); ctx.stroke();
      ctx.setLineDash([0.09, 0.09]); ctx.strokeStyle = c.accent;
      ctx.beginPath(); ctx.moveTo(-0.32, 0.6); ctx.quadraticCurveTo(-0.85, 0.7, -0.78, 1.35); ctx.stroke();
      ctx.setLineDash([]); ctx.strokeStyle = INK; ctx.lineWidth = 0.05;
      break;
    case 'feather':
      for (const [ang, len] of [[3.0, 0.55], [3.35, 0.5]]) {
        ellipse(ctx, -0.35 + Math.cos(ang) * len * 0.5, 0.45 + Math.sin(ang) * len * 0.5, len * 0.5, 0.09, ang); fillStroke(ctx, c.main);
      }
      break;
    case 'none':
      break;
  }
}

/**
 * Full animal standing at (x, y) (feet on the ground), bobbing and waving, as the friends
 * waiting in story mode and in the character screen.
 */
export function drawAnimalStanding(ctx: CanvasRenderingContext2D, a: AnimalSpec, x: number, y: number, t: number): void {
  const c = a.colors;
  const hover = a.body === 'hover';
  const bob = hover ? 0.45 + Math.sin(t * 6 + x) * 0.06 : Math.abs(Math.sin(t * 5 + x)) * 0.1;
  ctx.save();
  ctx.translate(x, y + bob);
  if (hover) ctx.scale(0.72, 0.72);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = 0.05;
  drawTail(ctx, a);
  // legs or feet
  if (a.body === 'bird') {
    ctx.strokeStyle = ANIMAL.feet; ctx.lineWidth = 0.06;
    ctx.beginPath(); ctx.moveTo(-0.1, 0.3 - bob); ctx.lineTo(-0.1, -bob); ctx.moveTo(0.12, 0.3 - bob); ctx.lineTo(0.12, -bob); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.05;
  } else if (!hover) {
    ctx.fillStyle = a.body === 'shell' ? c.detail : ANIMAL.legs;
    ctx.fillRect(-0.28, -bob, 0.1, 0.4); ctx.fillRect(0.2, -bob, 0.1, 0.4);
  }
  // body and belly
  const rx = a.body === 'chubby' || a.body === 'shell' ? 0.46 : 0.4, ry = a.body === 'slim' ? 0.25 : 0.29;
  ellipse(ctx, 0, 0.55, rx, ry); fillStroke(ctx, a.body === 'shell' ? c.accent : c.main);
  ctx.save(); ellipse(ctx, 0, 0.55, rx, ry); ctx.clip();
  if (a.body === 'shell') {
    ctx.strokeStyle = c.detail; ctx.lineWidth = 0.05;
    for (const bx of [-0.25, -0.08, 0.09, 0.26]) { ctx.beginPath(); ctx.moveTo(bx, 0.2); ctx.lineTo(bx + 0.04, 0.9); ctx.stroke(); }
  } else {
    ellipse(ctx, 0.12, 0.42, rx * 0.7, ry * 0.6); ctx.fillStyle = c.light; ctx.fill();
  }
  ctx.restore();
  ellipse(ctx, 0, 0.55, rx, ry); ctx.stroke();
  // waving arm or flapping wing
  const wv = Math.sin(t * 8 + x) * 0.25;
  if (a.body === 'bird' || hover) {
    const flap = hover ? Math.sin(t * 40) * 0.5 : wv;
    ellipse(ctx, -0.05, 0.75 + flap * 0.15, 0.3, 0.11, 0.6 + flap); fillStroke(ctx, hover ? ANIMAL.wingBlur : c.main);
  } else {
    ctx.strokeStyle = c.main; ctx.lineWidth = 0.1;
    ctx.beginPath(); ctx.moveTo(0.15, 0.7); ctx.lineTo(0.3 + wv * 0.2, 1.1 + wv * 0.2); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.05;
  }
  drawAnimalHead(ctx, a, 0.36, 0.98, 0.24, 1);
  ctx.restore();
}
