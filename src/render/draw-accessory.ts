// Draws a shop accessory on any animal's head, from its data. Called inside the head's own frame:
// origin at the head center, y up, facing right, W and H the head ellipse radii, r the head radius.
import type { AccessorySpec } from '../core/shop';
import { TAU } from '../core/math';
import { INK } from './shapes';

const ACCESSORY = {
  glare: 'rgba(255, 255, 255, 0.7)',
  shade: 'rgba(20, 30, 28, 0.18)',
} as const;

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}

export function drawAccessory(ctx: CanvasRenderingContext2D, acc: Readonly<AccessorySpec>, W: number, H: number, r: number): void {
  ctx.save();
  ctx.strokeStyle = INK; ctx.lineWidth = 0.1 * r; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  switch (acc.style) {
    case 'sombrero': {
      // wide brim, rounded crown and a colored band
      ellipse(ctx, -0.05 * W, 0.78 * H, 1.35 * W, 0.2 * r, -0.04); ctx.fillStyle = acc.main; ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.6 * W, 0.8 * H);
      ctx.quadraticCurveTo(-0.62 * W, 1.75 * H, -0.05 * W, 1.78 * H);
      ctx.quadraticCurveTo(0.52 * W, 1.75 * H, 0.48 * W, 0.8 * H);
      ctx.closePath(); ctx.fillStyle = acc.main; ctx.fill(); ctx.stroke();
      ctx.fillStyle = acc.accent; ctx.fillRect(-0.6 * W, 0.86 * H, 1.08 * W, 0.18 * r);
      ctx.strokeStyle = ACCESSORY.shade; ctx.lineWidth = 0.05 * r;
      ctx.beginPath(); ctx.moveTo(-0.3 * W, 1.6 * H); ctx.quadraticCurveTo(-0.05 * W, 1.45 * H, 0.2 * W, 1.6 * H); ctx.stroke();
      break;
    }
    case 'glasses': {
      // one round lens over the eye (side view), the arm going back
      ctx.beginPath(); ctx.moveTo(0.3 * W - 0.24 * r, 0.2 * H); ctx.lineTo(-0.45 * W, 0.28 * H); ctx.stroke();
      ellipse(ctx, 0.3 * W + 0.02 * r, 0.18 * H, 0.25 * r, 0.21 * r); ctx.fillStyle = acc.main; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = acc.accent; ctx.lineWidth = 0.06 * r;
      ctx.beginPath(); ctx.moveTo(0.3 * W - 0.1 * r, 0.18 * H + 0.08 * r); ctx.lineTo(0.3 * W + 0.06 * r, 0.18 * H + 0.12 * r); ctx.stroke();
      ctx.strokeStyle = ACCESSORY.glare; ctx.lineWidth = 0.04 * r;
      ctx.beginPath(); ctx.arc(0.3 * W + 0.02 * r, 0.18 * H, 0.15 * r, 2.2, 2.9); ctx.stroke();
      break;
    }
    case 'bandana': {
      // knotted scarf around the neck, a triangle hanging in front, white dots
      ctx.beginPath();
      ctx.moveTo(-0.7 * W, -0.62 * H);
      ctx.quadraticCurveTo(0, -0.95 * H, 0.62 * W, -0.62 * H);
      ctx.lineTo(0.5 * W, -0.86 * H);
      ctx.lineTo(0.12 * W, -1.3 * H);
      ctx.lineTo(-0.3 * W, -0.95 * H);
      ctx.lineTo(-0.72 * W, -0.82 * H);
      ctx.closePath(); ctx.fillStyle = acc.main; ctx.fill(); ctx.stroke();
      ctx.fillStyle = acc.accent;
      for (const [x, y] of [[-0.4, -0.86], [0.0, -0.98], [0.28, -0.9], [0.1, -1.12], [-0.15, -1.04]]) { ellipse(ctx, x * W, y * H, 0.045 * r, 0.045 * r); ctx.fill(); }
      ellipse(ctx, -0.78 * W, -0.72 * H, 0.1 * r, 0.08 * r); ctx.fillStyle = acc.main; ctx.fill(); ctx.stroke();
      break;
    }
    case 'cap': {
      // dome over the top of the head and a visor pointing forward
      ellipse(ctx, 0.62 * W, 0.6 * H, 0.52 * r, 0.11 * r, -0.08); ctx.fillStyle = acc.main; ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.88 * W, 0.42 * H);
      ctx.quadraticCurveTo(-0.85 * W, 1.32 * H, -0.05 * W, 1.32 * H);
      ctx.quadraticCurveTo(0.7 * W, 1.3 * H, 0.72 * W, 0.58 * H);
      ctx.quadraticCurveTo(-0.1 * W, 0.68 * H, -0.88 * W, 0.42 * H);
      ctx.closePath(); ctx.fillStyle = acc.main; ctx.fill(); ctx.stroke();
      ctx.fillStyle = acc.accent;
      ellipse(ctx, -0.05 * W, 0.98 * H, 0.2 * r, 0.16 * r); ctx.fill();
      ctx.fillStyle = acc.main; ellipse(ctx, -0.1 * W, 1.33 * H, 0.07 * r, 0.05 * r); ctx.fill(); ctx.stroke();
      break;
    }
    case 'flowers': {
      // a crown of small flowers along the top of the head
      ctx.lineWidth = 0.05 * r;
      for (let k = 0; k < 5; k++) {
        const an = Math.PI * (0.2 + 0.15 * k), x = Math.cos(an) * W * 0.98, y = Math.sin(an) * H * 0.98;
        ctx.fillStyle = k % 2 ? acc.accent : acc.main;
        for (let p = 0; p < 5; p++) {
          const pa = p * TAU / 5;
          ellipse(ctx, x + Math.cos(pa) * 0.09 * r, y + Math.sin(pa) * 0.09 * r, 0.075 * r, 0.075 * r); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = k % 2 ? acc.main : acc.accent;
        ellipse(ctx, x, y, 0.06 * r, 0.06 * r); ctx.fill();
      }
      break;
    }
    case 'bow': {
      // a big bow on the back of the head
      const bx = -0.45 * W, by = 0.82 * H;
      ctx.fillStyle = acc.main;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 0.42 * r, by + 0.28 * r); ctx.lineTo(bx - 0.42 * r, by - 0.22 * r); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 0.4 * r, by + 0.3 * r); ctx.lineTo(bx + 0.38 * r, by - 0.2 * r); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = acc.accent;
      for (const [x, y] of [[-0.28, 0.06], [0.24, 0.08]]) { ellipse(ctx, bx + x * r, by + y * r, 0.045 * r, 0.045 * r); ctx.fill(); }
      ellipse(ctx, bx, by, 0.1 * r, 0.1 * r); ctx.fillStyle = acc.main; ctx.fill(); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}
