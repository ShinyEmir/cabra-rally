// Provisional goat from the prototype. Replaced by the AnimalSpec characters in phase 5.
import { TAU } from '../core/math';
import { INK } from './shapes';

const GOAT = {
  horn: '#8a5a34',
  muzzle: '#f7c9a0',
  eye: '#fff',
} as const;

/** Goat head centered at (cx, cy) with radius r, in world units (y up). look shifts the pupil forward. */
export function drawGoatHead(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fur: string, look = 0): void {
  const u = r / 0.3;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // horns
  ctx.strokeStyle = GOAT.horn; ctx.lineWidth = 0.1 * u;
  ctx.beginPath(); ctx.moveTo(cx - 0.05 * u, cy + 0.24 * u); ctx.quadraticCurveTo(cx - 0.18 * u, cy + 0.62 * u, cx + 0.08 * u, cy + 0.7 * u); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 0.1 * u, cy + 0.24 * u); ctx.quadraticCurveTo(cx + 0.05 * u, cy + 0.6 * u, cx + 0.28 * u, cy + 0.62 * u); ctx.stroke();
  // ear
  ctx.fillStyle = fur; ctx.strokeStyle = INK; ctx.lineWidth = 0.05 * u;
  ctx.save(); ctx.translate(cx - 0.22 * u, cy + 0.12 * u); ctx.rotate(0.5);
  ctx.beginPath(); ctx.ellipse(0, 0, 0.2 * u, 0.09 * u, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
  // head
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.stroke();
  // muzzle
  ctx.fillStyle = GOAT.muzzle;
  ctx.beginPath(); ctx.ellipse(cx + 0.2 * u, cy - 0.08 * u, 0.13 * u, 0.1 * u, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // eye
  ctx.fillStyle = GOAT.eye;
  ctx.beginPath(); ctx.arc(cx + 0.07 * u, cy + 0.07 * u, 0.075 * u, 0, TAU); ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(cx + 0.09 * u + look * 0.02, cy + 0.07 * u, 0.04 * u, 0, TAU); ctx.fill();
  // beard
  ctx.fillStyle = fur;
  ctx.beginPath(); ctx.moveTo(cx + 0.12 * u, cy - 0.17 * u); ctx.lineTo(cx + 0.2 * u, cy - 0.36 * u); ctx.lineTo(cx + 0.27 * u, cy - 0.17 * u); ctx.closePath(); ctx.fill(); ctx.stroke();
}
