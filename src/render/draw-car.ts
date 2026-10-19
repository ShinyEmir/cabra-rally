// Provisional car from the prototype, drawn in the car's local frame. Redesigned in phase 5.
import { TAU } from '../core/math';
import { PHY, type Car } from '../core/physics';
import type { CarShape, Circle } from '../core/vehicle';
import { drawGoatHead, friendFur } from './draw-animal';
import { INK, roundRect } from './shapes';

const CAR = {
  tire: '#2a2f33',
  hub: '#e7e2d2',
  spoke: '#8c8a80',
  body: '#ee6a2b',
  stripe: '#fff6dc',
  bed: '#b4441a',
  glass: '#bfe6ee',
  light: '#ffe27a',
  bumper: '#2a2f33',
  driverFur: '#fff1d6',
} as const;

/** passengers: friends riding in the bed, in pickup order. */
export function drawCar(ctx: CanvasRenderingContext2D, car: Car, wheelRot: readonly [number, number], shape: Readonly<CarShape>, passengers = 0): void {
  ctx.save();
  ctx.translate(car.x, car.y); ctx.rotate(car.a);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // wheels
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1, wh = car.wheels[i];
    ctx.save();
    ctx.translate(side * PHY.wx, -PHY.wy - wh.ext);
    ctx.rotate(-wheelRot[i]);
    ctx.fillStyle = CAR.tire; ctx.strokeStyle = INK; ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.arc(0, 0, PHY.r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = CAR.hub;
    ctx.beginPath(); ctx.arc(0, 0, PHY.r * 0.55, 0, TAU); ctx.fill();
    ctx.strokeStyle = CAR.spoke; ctx.lineWidth = 0.05;
    for (let s = 0; s < 3; s++) {
      const an = s * Math.PI / 3;
      ctx.beginPath(); ctx.moveTo(Math.cos(an) * PHY.r * 0.5, Math.sin(an) * PHY.r * 0.5); ctx.lineTo(-Math.cos(an) * PHY.r * 0.5, -Math.sin(an) * PHY.r * 0.5); ctx.stroke();
    }
    ctx.restore();
  }
  // passengers in the bed, three per row
  for (let p = 0; p < passengers; p++) {
    drawGoatHead(ctx, -1.05 + (p % 3) * 0.32, 0.5 + Math.floor(p / 3) * 0.28, 0.15, friendFur(p), 0);
  }
  // body
  ctx.fillStyle = CAR.body; ctx.strokeStyle = INK; ctx.lineWidth = 0.06;
  roundRect(ctx, -1.35, -0.38, 2.7, 0.78, 0.22); ctx.fill(); ctx.stroke();
  // stripe
  ctx.fillStyle = CAR.stripe;
  ctx.fillRect(-1.2, -0.1, 2.4, 0.12);
  // bed wall
  ctx.fillStyle = CAR.bed;
  roundRect(ctx, -1.35, 0.1, 0.5, 0.3, 0.1); ctx.fill(); ctx.stroke();
  // windshield
  ctx.fillStyle = CAR.glass;
  ctx.beginPath(); ctx.moveTo(0.38, 0.38); ctx.lineTo(0.78, 0.38); ctx.lineTo(0.62, 0.78); ctx.lineTo(0.46, 0.78); ctx.closePath(); ctx.fill(); ctx.stroke();
  // driver
  drawGoatHead(ctx, shape.head.x, shape.head.y, shape.head.r, CAR.driverFur, 1);
  // front light and bumper
  ctx.fillStyle = CAR.light;
  ctx.beginPath(); ctx.arc(1.28, 0.12, 0.09, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = CAR.bumper;
  ctx.fillRect(1.3, -0.34, 0.1, 0.22);
  if (SHAPE_DEBUG.visible) drawShape(ctx, shape);
  ctx.restore();
}

/** Collision overlay, toggled from the ?ajuste panel: crash zones in red, chassis in blue. */
export const SHAPE_DEBUG = { visible: false };

function outline(ctx: CanvasRenderingContext2D, circles: readonly Circle[], color: string): void {
  ctx.strokeStyle = color; ctx.fillStyle = color + '33'; ctx.lineWidth = 0.04;
  for (const z of circles) { ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill(); ctx.stroke(); }
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Readonly<CarShape>): void {
  outline(ctx, shape.body.points, '#2b6cff');
  outline(ctx, [shape.head, ...shape.extraCrash], '#ff2b2b');
}
