// Draws any AnimalSpec from its parts. World units, y up, facing right (+x).
// Adding an animal is a new entry in core/animals.ts; this file only grows when a new kind of
// part (a new ear, snout, mark, tail or body style) is needed.
// Every filled shape gets the same soft lighting: a highlight from the upper back and a shade
// along the bottom, then the dark outline on top.
import type { AnimalSpec } from '../core/animals';
import { TAU } from '../core/math';
import { INK } from './shapes';

const ANIMAL = {
  eyeWhite: '#fff',
  iris: '#2a2320',
  sparkle: '#fff',
  blush: 'rgba(255, 120, 140, 0.42)',
  beakStripe: '#f7d23e',
  feet: '#e0a33a',
  pawDark: 'rgba(31, 58, 52, 0.18)',
  shadow: 'rgba(31, 58, 52, 0.18)',
  wingBlur: 'rgba(255, 255, 255, 0.6)',
  highlight: 'rgba(255, 255, 255, 0.38)',
  shade: 'rgba(20, 30, 28, 0.2)',
} as const;

// ---------------------------------------------------------------- shading helpers

function ellipsePath(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}

/**
 * Lights the current path: call right after building it. Fills with color, adds a highlight
 * centered at (hx, hy) and a shade toward the bottom, then strokes the outline.
 */
function shadeFill(ctx: CanvasRenderingContext2D, color: string, hx: number, hy: number, size: number, stroke = true): void {
  ctx.fillStyle = color; ctx.fill();
  ctx.save();
  ctx.clip();
  const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, size * 1.7);
  g.addColorStop(0, ANIMAL.highlight);
  g.addColorStop(0.4, 'rgba(255, 255, 255, 0)');
  g.addColorStop(0.75, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, ANIMAL.shade);
  ctx.fillStyle = g;
  ctx.fillRect(hx - size * 3, hy - size * 3, size * 6, size * 6);
  ctx.restore();
  if (stroke) ctx.stroke();
}

/** Lit ellipse with outline. */
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, rot = 0): void {
  ellipsePath(ctx, x, y, rx, ry, rot);
  shadeFill(ctx, color, x - rx * 0.3, y + ry * 0.45, Math.max(rx, ry));
}

/** Filled ribbon along a quadratic curve that narrows from w0 to w1 (tails). */
function taper(ctx: CanvasRenderingContext2D, p0: [number, number], c: [number, number], p1: [number, number], w0: number, w1: number): Array<[number, number, number, number]> {
  const n = 14, left: Array<[number, number]> = [], right: Array<[number, number]> = [], samples: Array<[number, number, number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const x = u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0];
    const y = u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1];
    const dx = 2 * u * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]);
    const dy = 2 * u * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1]);
    const len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, w = (w0 + (w1 - w0) * t) / 2;
    left.push([x + nx * w, y + ny * w]); right.push([x - nx * w, y - ny * w]);
    samples.push([x, y, nx, ny]);
  }
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (const [x, y] of left) ctx.lineTo(x, y);
  const end = samples[n];
  ctx.arc(end[0], end[1], Math.max(0.005, w1 / 2), Math.atan2(end[3], end[2]), Math.atan2(end[3], end[2]) + Math.PI, true);
  for (let i = n; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  return samples;
}

// ---------------------------------------------------------------- head parts

function drawEars(ctx: CanvasRenderingContext2D, a: AnimalSpec, W: number, H: number, r: number): void {
  const c = a.colors.ears ?? a.colors.main;
  switch (a.ears) {
    case 'round':
      blob(ctx, -0.32 * W, 0.84 * H, 0.32 * r, 0.32 * r, c);
      ellipsePath(ctx, -0.3 * W, 0.83 * H, 0.15 * r, 0.15 * r); ctx.fillStyle = a.colors.ears ? a.colors.detail : a.colors.light; ctx.fill();
      break;
    case 'small':
      blob(ctx, -0.42 * W, 0.84 * H, 0.2 * r, 0.2 * r, c);
      blob(ctx, 0.02 * W, 0.94 * H, 0.18 * r, 0.18 * r, c);
      break;
    case 'tall':
      blob(ctx, -0.5 * W, 0.98 * H, 0.15 * r, 0.42 * r, c, 0.4);
      blob(ctx, -0.2 * W, 1.05 * H, 0.15 * r, 0.42 * r, c, 0.15);
      ellipsePath(ctx, -0.2 * W, 1.05 * H, 0.06 * r, 0.26 * r, 0.15); ctx.fillStyle = a.colors.light; ctx.fill();
      break;
    case 'pointed':
      ctx.beginPath(); ctx.moveTo(-0.6 * W, 0.55 * H); ctx.lineTo(-0.38 * W, 1.3 * H); ctx.lineTo(-0.1 * W, 0.7 * H); ctx.closePath();
      shadeFill(ctx, c, -0.4 * W, 1.0 * H, 0.4 * r);
      break;
    case 'none':
      break;
  }
}

/** Three feathery gill fronds on the back of the head (axolotl). */
function drawGills(ctx: CanvasRenderingContext2D, a: AnimalSpec, W: number, H: number, r: number): void {
  const stalks: Array<[number, number]> = [[0.55, 2.0], [0.15, 2.6], [-0.25, 3.2]];
  for (const [y, ang] of stalks) {
    const bx = -0.7 * W, by = y * H, len = 1.0 * r;
    const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    for (let k = 1; k <= 4; k++) {
      const f = k / 4.4, px = bx + (ex - bx) * f, py = by + (ey - by) * f, w = 0.17 * r * (1.1 - f * 0.4);
      for (const side of [1, -1]) {
        ellipsePath(ctx, px + side * nx * w * 0.8, py + side * ny * w * 0.8, w, w * 0.6, ang);
        ctx.fillStyle = a.colors.accent; ctx.fill();
        ellipsePath(ctx, px + side * nx * w * 1.0, py + side * ny * w * 1.0, w * 0.45, w * 0.28, ang);
        ctx.fillStyle = ANIMAL.highlight; ctx.fill();
      }
    }
    ctx.strokeStyle = a.colors.detail; ctx.lineWidth = 0.08 * r;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
  }
  ctx.strokeStyle = INK;
}

function clipToHead(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ellipsePath(ctx, 0, 0, W, H); ctx.clip();
}

/** A jaguar rosette: a broken ring with a dot inside. */
function rosette(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.strokeStyle = color; ctx.lineWidth = s * 0.45;
  for (let k = 0; k < 3; k++) {
    const a0 = k * TAU / 3 + 0.3;
    ctx.beginPath(); ctx.arc(x, y, s, a0, a0 + 1.6); ctx.stroke();
  }
  ctx.fillStyle = color; ellipsePath(ctx, x, y, s * 0.3, s * 0.3); ctx.fill();
}

function drawHeadMarks(ctx: CanvasRenderingContext2D, a: AnimalSpec, W: number, H: number, r: number): void {
  const eyeX = 0.3 * W, eyeY = 0.18 * H;
  switch (a.marks) {
    case 'shield': {
      // banded helmet over the top of the head
      ctx.save(); clipToHead(ctx, W, H);
      ctx.fillStyle = a.colors.accent; ctx.fillRect(-W, 0.32 * H, 1.75 * W, H);
      ctx.strokeStyle = a.colors.detail; ctx.lineWidth = 0.07 * r;
      for (const x of [-0.55, -0.22, 0.1]) { ctx.beginPath(); ctx.moveTo(x * W, 0.32 * H); ctx.lineTo((x + 0.08) * W, H); ctx.stroke(); }
      ctx.strokeStyle = ANIMAL.highlight; ctx.lineWidth = 0.05 * r;
      for (const x of [-0.42, -0.08]) { ctx.beginPath(); ctx.moveTo(x * W, 0.45 * H); ctx.lineTo((x + 0.06) * W, 0.9 * H); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.1 * r;
      ctx.beginPath(); ctx.moveTo(-0.95 * W, 0.32 * H); ctx.quadraticCurveTo(0, 0.4 * H, 0.75 * W, 0.32 * H); ctx.stroke();
      break;
    }
    case 'spots': {
      ctx.save(); clipToHead(ctx, W, H);
      for (const [x, y, s] of [[-0.5, 0.45, 0.1], [-0.12, 0.7, 0.08], [-0.65, -0.1, 0.09], [-0.28, 0.12, 0.07], [0.0, -0.6, 0.06]]) rosette(ctx, x * W, y * H, s * r, a.colors.detail);
      ctx.restore();
      ctx.strokeStyle = INK;
      break;
    }
    case 'mask':
      // dark patch around the eye and a pale spot above it (coati)
      ellipsePath(ctx, eyeX + 0.02 * r, eyeY - 0.04 * r, 0.26 * r, 0.18 * r, -0.25); ctx.fillStyle = a.colors.detail; ctx.fill();
      ellipsePath(ctx, eyeX - 0.06 * r, eyeY + 0.27 * r, 0.09 * r, 0.06 * r); ctx.fillStyle = a.colors.light; ctx.fill();
      ellipsePath(ctx, eyeX + 0.12 * r, eyeY - 0.28 * r, 0.12 * r, 0.06 * r, -0.3); ctx.fill();
      break;
    case 'face':
      // pale front of the face with a small dark ring around the eye (opossum)
      ctx.save(); clipToHead(ctx, W, H);
      ellipsePath(ctx, 0.55 * W, -0.15 * H, 0.78 * W, 0.82 * H); ctx.fillStyle = a.colors.light; ctx.fill();
      ctx.restore();
      ellipsePath(ctx, eyeX, eyeY, 0.2 * r, 0.18 * r); ctx.fillStyle = a.colors.detail; ctx.fill();
      break;
    case 'eyeRing':
      // pale bib under the beak, then a blue ring around the eye (toucan)
      ctx.save(); clipToHead(ctx, W, H);
      ellipsePath(ctx, 0.45 * W, -0.7 * H, 0.62 * W, 0.48 * H); ctx.fillStyle = a.colors.light; ctx.fill();
      ctx.restore();
      ellipsePath(ctx, eyeX, eyeY, 0.25 * r, 0.25 * r); ctx.fillStyle = a.colors.detail; ctx.fill();
      break;
    case 'throat': {
      // shiny gorget (hummingbird)
      ctx.save(); clipToHead(ctx, W, H);
      const g = ctx.createLinearGradient(0, -H, 0.8 * W, -0.2 * H);
      g.addColorStop(0, a.colors.detail); g.addColorStop(1, '#ff7aa8');
      ellipsePath(ctx, 0.35 * W, -0.65 * H, 0.52 * W, 0.42 * H); ctx.fillStyle = g; ctx.fill();
      ctx.restore();
      break;
    }
    case 'gills':
      // a few pale freckles (axolotl)
      ctx.fillStyle = a.colors.light;
      for (const [x, y] of [[-0.45, 0.4], [-0.2, 0.62], [-0.6, 0.05]]) { ellipsePath(ctx, x * W, y * H, 0.05 * r, 0.05 * r); ctx.fill(); }
      break;
    case 'none':
      break;
  }
}

/** Snouts that grow out from under the head: a rounded tube with a nose at the tip. */
function drawSnoutBase(ctx: CanvasRenderingContext2D, a: AnimalSpec, W: number, H: number, r: number): void {
  const c = a.colors;
  let cx: number, cy: number, rx: number, ry: number, rot: number, fill: string, nose: string;
  switch (a.snout) {
    case 'long': cx = 0.75 * W + 0.4 * r; cy = -0.22 * H; rx = 0.62 * r; ry = 0.18 * r; rot = -0.18; fill = c.main; nose = c.detail; break;
    case 'longUp': cx = 0.75 * W + 0.38 * r; cy = -0.08 * H; rx = 0.6 * r; ry = 0.17 * r; rot = 0.22; fill = c.main; nose = c.detail; break;
    case 'pointed': cx = 0.7 * W + 0.25 * r; cy = -0.2 * H; rx = 0.5 * r; ry = 0.23 * r; rot = -0.22; fill = c.light; nose = c.accent; break;
    default: return;
  }
  blob(ctx, cx, cy, rx, ry, fill, rot);
  const tx = cx + Math.cos(rot) * rx * 0.92, ty = cy + Math.sin(rot) * rx * 0.92;
  blob(ctx, tx, ty, 0.11 * r, 0.1 * r, nose);
  if (a.snout === 'pointed') {
    // whiskers
    ctx.lineWidth = 0.03 * r;
    for (const dy of [0.04, -0.06]) { ctx.beginPath(); ctx.moveTo(tx - 0.15 * r, ty + dy * r); ctx.lineTo(tx + 0.3 * r, ty + dy * r * 2.5); ctx.stroke(); }
    ctx.lineWidth = 0.12 * r;
  }
}

function drawSnout(ctx: CanvasRenderingContext2D, a: AnimalSpec, W: number, H: number, r: number): void {
  const c = a.colors;
  switch (a.snout) {
    case 'smile':
      // wide smile and two nostrils (axolotl)
      ctx.lineWidth = 0.09 * r;
      ctx.beginPath(); ctx.moveTo(0.05 * W, -0.25 * H); ctx.quadraticCurveTo(0.6 * W, -0.64 * H, 0.98 * W, -0.12 * H); ctx.stroke();
      ctx.fillStyle = INK;
      ellipsePath(ctx, 0.86 * W, 0.12 * H, 0.035 * r, 0.035 * r); ctx.fill();
      break;
    case 'muzzle':
      blob(ctx, 0.6 * W, -0.32 * H, 0.28 * r, 0.22 * r, c.light);
      ctx.beginPath(); ctx.moveTo(0.74 * W, -0.04 * H); ctx.quadraticCurveTo(0.86 * W, 0.02 * H, 0.97 * W, -0.04 * H); ctx.lineTo(0.86 * W, -0.2 * H); ctx.closePath();
      ctx.fillStyle = c.accent; ctx.fill();
      ctx.lineWidth = 0.05 * r;
      ctx.beginPath(); ctx.moveTo(0.86 * W, -0.2 * H); ctx.lineTo(0.86 * W, -0.36 * H); ctx.stroke();
      ctx.fillStyle = INK;
      for (const [x, y] of [[0.5, -0.3], [0.62, -0.4], [0.72, -0.3]]) { ellipsePath(ctx, x * W, y * H, 0.025 * r, 0.025 * r); ctx.fill(); }
      ctx.lineWidth = 0.12 * r;
      break;
    case 'beakBig': {
      const tipX = W + 1.45 * r;
      const beak = () => {
        ctx.beginPath();
        ctx.moveTo(0.55 * W, 0.32 * H);
        ctx.quadraticCurveTo(0.9 * W + 0.8 * r, 0.44 * H, tipX, -0.12 * r);
        ctx.quadraticCurveTo(0.9 * W + 0.7 * r, -0.42 * H, 0.55 * W, -0.38 * H);
        ctx.closePath();
      };
      beak(); ctx.fillStyle = c.accent; ctx.fill();
      // pale band near the face, a red keel line and a dark tip, all inside the beak
      ctx.save(); ctx.clip();
      ctx.fillStyle = ANIMAL.beakStripe; ctx.fillRect(0.55 * W, -H, 0.38 * r, 2 * H);
      ctx.fillStyle = '#d9462f'; ctx.fillRect(0.55 * W, 0.28 * H, 2 * r, 0.12 * r);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(tipX - 0.35 * r, 0.3 * r); ctx.lineTo(tipX + 0.1 * r, 0.3 * r); ctx.lineTo(tipX + 0.1 * r, -0.4 * r); ctx.closePath(); ctx.fill();
      const g = ctx.createLinearGradient(0, 0.4 * H, 0, -0.4 * H);
      g.addColorStop(0, ANIMAL.highlight); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, ANIMAL.shade);
      ctx.fillStyle = g; ctx.fillRect(0.5 * W, -H, 2.5 * r, 2 * H);
      ctx.restore();
      beak(); ctx.stroke();
      ctx.lineWidth = 0.07 * r;
      ctx.beginPath(); ctx.moveTo(0.6 * W, -0.04 * H); ctx.quadraticCurveTo(W + 0.6 * r, 0.0, tipX - 0.05 * r, -0.1 * r); ctx.stroke();
      ctx.lineWidth = 0.12 * r;
      break;
    }
    case 'beakThin':
      ctx.lineWidth = 0.11 * r; ctx.strokeStyle = c.accent;
      ctx.beginPath(); ctx.moveTo(0.85 * W, 0.0); ctx.lineTo(W + 1.3 * r, -0.14 * r); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.12 * r;
      break;
    case 'long':
    case 'longUp':
    case 'pointed':
      // drawn under the head by drawSnoutBase
      break;
  }
}

function drawCheek(ctx: CanvasRenderingContext2D, a: AnimalSpec, W: number, H: number, r: number): void {
  if (a.body === 'bird' || a.body === 'hover' || a.marks === 'face') return;
  ellipsePath(ctx, 0.42 * W, -0.36 * H, 0.17 * r, 0.1 * r); ctx.fillStyle = ANIMAL.blush; ctx.fill();
}

function drawEye(ctx: CanvasRenderingContext2D, a: AnimalSpec, W: number, H: number, r: number, look: number): void {
  const x = 0.3 * W, y = 0.18 * H;
  if (a.eye === 'dot') {
    ctx.fillStyle = INK; ellipsePath(ctx, x, y, 0.11 * r, 0.11 * r); ctx.fill();
    ctx.fillStyle = ANIMAL.sparkle; ellipsePath(ctx, x - 0.03 * r, y + 0.04 * r, 0.04 * r, 0.04 * r); ctx.fill();
    return;
  }
  ctx.fillStyle = ANIMAL.eyeWhite; ellipsePath(ctx, x, y, 0.16 * r, 0.18 * r); ctx.fill();
  ctx.lineWidth = 0.04 * r; ctx.stroke();
  const px = x + 0.04 * r + look * 0.02 * r;
  ctx.fillStyle = ANIMAL.iris; ellipsePath(ctx, px, y - 0.01 * r, 0.095 * r, 0.11 * r); ctx.fill();
  ctx.fillStyle = ANIMAL.sparkle;
  ellipsePath(ctx, px - 0.03 * r, y + 0.04 * r, 0.035 * r, 0.035 * r); ctx.fill();
  ellipsePath(ctx, px + 0.035 * r, y - 0.05 * r, 0.015 * r, 0.015 * r); ctx.fill();
}

/** Head centered at (cx, cy) with radius r. look moves the pupil forward. */
export function drawAnimalHead(ctx: CanvasRenderingContext2D, a: AnimalSpec, cx: number, cy: number, r: number, look = 1): void {
  const W = r * a.head.w, H = r * a.head.h;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = 0.13 * r;
  drawEars(ctx, a, W, H, r);
  if (a.marks === 'gills') drawGills(ctx, a, W, H, r);
  ctx.lineWidth = 0.12 * r;
  drawSnoutBase(ctx, a, W, H, r);
  ctx.lineWidth = 0.15 * r;
  ellipsePath(ctx, 0, 0, W, H);
  shadeFill(ctx, a.colors.main, -0.3 * W, 0.45 * H, Math.max(W, H), false);
  ctx.lineWidth = 0.12 * r;
  drawHeadMarks(ctx, a, W, H, r);
  ctx.strokeStyle = INK; ctx.lineWidth = 0.15 * r;
  ellipsePath(ctx, 0, 0, W, H); ctx.stroke();
  ctx.lineWidth = 0.12 * r;
  drawCheek(ctx, a, W, H, r);
  drawSnout(ctx, a, W, H, r);
  drawEye(ctx, a, W, H, r, look);
  ctx.restore();
}

// ---------------------------------------------------------------- body parts

function drawTail(ctx: CanvasRenderingContext2D, a: AnimalSpec, t: number): void {
  const c = a.colors, sway = Math.sin(t * 3) * 0.06;
  switch (a.tail) {
    case 'fin': {
      ctx.beginPath(); ctx.moveTo(-0.28, 0.76); ctx.quadraticCurveTo(-0.85, 0.92 + sway, -0.98, 0.55 + sway); ctx.quadraticCurveTo(-0.8, 0.28, -0.28, 0.36); ctx.closePath();
      shadeFill(ctx, c.main, -0.6, 0.7, 0.45);
      ctx.beginPath(); ctx.moveTo(-0.4, 0.72); ctx.quadraticCurveTo(-0.82, 0.84 + sway, -0.9, 0.56 + sway); ctx.quadraticCurveTo(-0.74, 0.38, -0.4, 0.44); ctx.closePath();
      ctx.fillStyle = c.light; ctx.fill();
      break;
    }
    case 'cone': {
      taper(ctx, [-0.32, 0.45], [-0.7, 0.36], [-1.02, 0.18 + sway], 0.22, 0.04);
      shadeFill(ctx, c.accent, -0.6, 0.45, 0.3);
      ctx.strokeStyle = c.detail; ctx.lineWidth = 0.03;
      for (const x of [-0.5, -0.66, -0.82]) { ctx.beginPath(); ctx.moveTo(x, 0.48 + (x + 0.3) * 0.4); ctx.lineTo(x + 0.02, 0.28 + (x + 0.3) * 0.2); ctx.stroke(); }
      ctx.strokeStyle = INK;
      break;
    }
    case 'long': {
      const thin = a.body === 'slim';
      taper(ctx, [-0.34, 0.5], [-1.05, 0.15], [-1.05 + sway, 0.78], thin ? 0.09 : 0.14, thin ? 0.03 : 0.07);
      shadeFill(ctx, thin ? c.accent : c.main, -0.8, 0.5, 0.4);
      if (!thin) {
        // spots and a dark tip
        ctx.fillStyle = c.detail;
        for (const [x, y] of [[-0.6, 0.3], [-0.85, 0.32], [-1.0, 0.5]]) { ellipsePath(ctx, x, y, 0.035, 0.03); ctx.fill(); }
        ellipsePath(ctx, -1.05 + sway, 0.76, 0.045, 0.045); ctx.fill();
      }
      break;
    }
    case 'ringed': {
      const samples = taper(ctx, [-0.32, 0.6], [-0.9, 0.7], [-0.8 + sway, 1.4], 0.2, 0.1);
      shadeFill(ctx, c.main, -0.7, 1.0, 0.5, false);
      ctx.save(); ctx.clip();
      ctx.strokeStyle = c.accent; ctx.lineWidth = 0.08;
      for (let i = 3; i < samples.length; i += 3) {
        const [x, y, nx, ny] = samples[i];
        ctx.beginPath(); ctx.moveTo(x - nx * 0.2, y - ny * 0.2); ctx.lineTo(x + nx * 0.2, y + ny * 0.2); ctx.stroke();
      }
      ctx.restore();
      taper(ctx, [-0.32, 0.6], [-0.9, 0.7], [-0.8 + sway, 1.4], 0.2, 0.1);
      ctx.strokeStyle = INK; ctx.stroke();
      break;
    }
    case 'feather':
      for (const [ang, len, col] of [[3.05, 0.6, c.main], [3.35, 0.52, c.main], [2.8, 0.48, c.light]] as Array<[number, number, string]>) {
        const cx = -0.32 + Math.cos(ang) * len * 0.5, cy = 0.45 + Math.sin(ang) * len * 0.5;
        blob(ctx, cx, cy, len * 0.5, 0.1, col, ang);
      }
      break;
    case 'none':
      break;
  }
}

/** A short rounded leg with a paw, from the hip down to the ground. */
function leg(ctx: CanvasRenderingContext2D, x: number, top: number, color: string, paw: string): void {
  ctx.beginPath(); ctx.roundRect(x - 0.075, 0, 0.15, top, 0.07);
  shadeFill(ctx, color, x - 0.03, top * 0.7, 0.2);
  ellipsePath(ctx, x + 0.04, 0.03, 0.11, 0.06); shadeFill(ctx, paw, x + 0.02, 0.06, 0.1);
}

function drawBodyPattern(ctx: CanvasRenderingContext2D, a: AnimalSpec, rx: number, ry: number): void {
  const c = a.colors;
  if (a.body === 'shell') {
    ctx.strokeStyle = c.detail; ctx.lineWidth = 0.05;
    for (const bx of [-0.27, -0.1, 0.07, 0.24]) { ctx.beginPath(); ctx.moveTo(bx, 0.2); ctx.quadraticCurveTo(bx + 0.06, 0.55, bx + 0.02, 0.9); ctx.stroke(); }
    ctx.strokeStyle = ANIMAL.highlight; ctx.lineWidth = 0.035;
    for (const bx of [-0.19, -0.02, 0.15]) { ctx.beginPath(); ctx.moveTo(bx, 0.6); ctx.quadraticCurveTo(bx + 0.04, 0.72, bx + 0.02, 0.82); ctx.stroke(); }
    // pale lower edge of the shell
    ellipsePath(ctx, 0.05, 0.3, rx * 0.95, ry * 0.32); ctx.fillStyle = c.light; ctx.fill();
  } else if (a.marks === 'spots') {
    ellipsePath(ctx, 0.12, 0.42, rx * 0.7, ry * 0.6); ctx.fillStyle = c.light; ctx.fill();
    for (const [x, y, s] of [[-0.28, 0.66, 0.07], [-0.05, 0.75, 0.06], [-0.32, 0.45, 0.05], [0.12, 0.7, 0.05]]) rosette(ctx, x, y, s, c.detail);
  } else {
    ellipsePath(ctx, 0.12, 0.42, rx * 0.7, ry * 0.6); ctx.fillStyle = c.light; ctx.fill();
    if (a.marks === 'gills') {
      ctx.fillStyle = c.light;
      for (const [x, y] of [[-0.3, 0.7], [-0.1, 0.78], [-0.36, 0.55]]) { ellipsePath(ctx, x, y, 0.035, 0.035); ctx.fill(); }
    }
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
  // ground shadow, which shrinks as the animal rises
  ctx.fillStyle = ANIMAL.shadow;
  ellipsePath(ctx, x, y + 0.02, 0.48 - bob * 0.25, 0.07, 0); ctx.fill();
  ctx.save();
  ctx.translate(x, y + bob);
  if (hover) ctx.scale(0.72, 0.72);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = 0.045;
  drawTail(ctx, a, t + x);
  const limb = a.body === 'shell' ? c.detail : c.main;
  const paw = a.body === 'shell' ? c.detail : c.ears ?? c.accent;
  // legs or feet (the far leg first, slightly darker)
  if (a.body === 'bird') {
    ctx.strokeStyle = ANIMAL.feet; ctx.lineWidth = 0.06;
    for (const lx of [-0.1, 0.12]) {
      ctx.beginPath(); ctx.moveTo(lx, 0.32 - bob); ctx.lineTo(lx, -bob + 0.02); ctx.lineTo(lx + 0.1, -bob); ctx.moveTo(lx, -bob + 0.02); ctx.lineTo(lx - 0.06, -bob); ctx.stroke();
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 0.045;
  } else if (!hover) {
    ctx.save(); ctx.translate(0, -bob);
    leg(ctx, 0.2, 0.42, limb, paw);
    ctx.fillStyle = ANIMAL.pawDark; ctx.beginPath(); ctx.roundRect(0.125, 0, 0.15, 0.42, 0.07); ctx.fill();
    leg(ctx, -0.22, 0.42, limb, paw);
    ctx.restore();
  }
  const wv = Math.sin(t * 8 + x) * 0.25;
  // body and belly
  const rx = a.body === 'chubby' || a.body === 'shell' ? 0.46 : 0.4, ry = a.body === 'slim' ? 0.26 : 0.3;
  const bodyColor = a.body === 'shell' ? c.accent : c.main;
  ellipsePath(ctx, 0, 0.55, rx, ry);
  shadeFill(ctx, bodyColor, -0.15, 0.72, rx, false);
  ctx.save(); ellipsePath(ctx, 0, 0.55, rx, ry); ctx.clip();
  drawBodyPattern(ctx, a, rx, ry);
  ctx.restore();
  ctx.strokeStyle = INK; ctx.lineWidth = 0.045;
  ellipsePath(ctx, 0, 0.55, rx, ry); ctx.stroke();
  // wings for birds; mammals wave a paw forward at chest height, under the head
  if (a.body === 'bird' || hover) {
    const flap = hover ? Math.sin(t * 40) * 0.5 : wv;
    if (hover) {
      ellipsePath(ctx, -0.05, 0.8 + flap * 0.15, 0.34, 0.12, 0.6 + flap); ctx.fillStyle = ANIMAL.wingBlur; ctx.fill(); ctx.stroke();
    } else {
      blob(ctx, -0.05, 0.62 + flap * 0.1, 0.32, 0.13, c.main, 0.35 + flap * 0.6);
    }
  } else {
    const hx = 0.62, hy = 0.66 + wv * 0.22;
    taper(ctx, [0.14, 0.62], [0.4, 0.56], [hx, hy], 0.12, 0.1);
    shadeFill(ctx, limb, 0.35, 0.62, 0.2);
    blob(ctx, hx, hy, 0.075, 0.075, paw);
  }
  drawAnimalHead(ctx, a, 0.34, 0.96, 0.25, 1);
  ctx.restore();
}

/** Upper body of the driver sitting in the car, below the head (car local frame). */
export function drawAnimalSeated(ctx: CanvasRenderingContext2D, a: AnimalSpec, headX: number, headY: number, headR: number, wheelX: number, wheelY: number): void {
  const c = a.colors;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = 0.045;
  // torso
  const tx = headX - 0.05, ty = headY - headR - 0.12;
  ellipsePath(ctx, tx, ty, 0.24, 0.26);
  shadeFill(ctx, a.body === 'shell' ? c.accent : c.main, tx - 0.08, ty + 0.12, 0.26, false);
  ctx.save(); ellipsePath(ctx, tx, ty, 0.24, 0.26); ctx.clip();
  ellipsePath(ctx, tx + 0.1, ty - 0.02, 0.14, 0.2); ctx.fillStyle = c.light; ctx.fill();
  ctx.restore();
  ellipsePath(ctx, tx, ty, 0.24, 0.26); ctx.stroke();
  // arm reaching the steering wheel (birds use a wing)
  const paw = a.body === 'shell' ? c.detail : c.ears ?? c.accent;
  if (a.body === 'bird' || a.body === 'hover') {
    blob(ctx, tx + 0.12, ty, 0.2, 0.08, c.main, -0.5);
  } else {
    taper(ctx, [tx + 0.05, ty + 0.06], [tx + 0.2, ty - 0.08], [wheelX - 0.02, wheelY], 0.1, 0.08);
    shadeFill(ctx, c.main, tx + 0.15, ty, 0.15);
    blob(ctx, wheelX - 0.02, wheelY, 0.06, 0.06, paw);
  }
  ctx.restore();
}
