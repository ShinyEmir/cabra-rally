// The game's own car: a rounded buggy with a roll bar, visible shocks over the wheels and a bed for
// passengers. Drawn in the car's local frame (meters, y up). It keeps the body size used by the
// collision shape in core/vehicle.ts (x from -1.35 to 1.35, y from -0.38 to 0.40).
import { friendAnimal, type AnimalSpec } from '../core/animals';
import { TAU } from '../core/math';
import { PHY, type Car } from '../core/physics';
import type { CarShape, Circle } from '../core/vehicle';
import { drawAnimalHead } from './draw-animal';
import { INK, roundRect } from './shapes';

export interface CarColor {
  /** Stable id, used to save the choice. */
  id: string;
  body: string;
  dark: string;
  light: string;
}

/** Paint options. None is orange or red, to stay away from the reference games. */
export const CAR_COLORS: readonly CarColor[] = [
  { id: 'laguna', body: '#2f8fd0', dark: '#1f6799', light: '#d9eefa' },
  { id: 'nopal', body: '#4fae5b', dark: '#357d3f', light: '#def3df' },
  { id: 'mango', body: '#f2c037', dark: '#c08f12', light: '#fdf1c8' },
  { id: 'jacaranda', body: '#8a5cc2', dark: '#62408f', light: '#ece2f8' },
];

export function carColorById(id: string): CarColor {
  return CAR_COLORS.find((c) => c.id === id) ?? CAR_COLORS[0];
}

const PARTS = {
  tire: '#2a2f33',
  tread: '#454c52',
  shock: '#c9ccc8',
  rollBar: '#4a5257',
  glass: '#bfe6ee',
  light: '#ffe27a',
  tail: '#e8574d',
  decal: '#fff',
  decalHill: '#3f8f4a',
  bumper: '#2f363b',
} as const;

export interface CarLook {
  driver: AnimalSpec;
  color: CarColor;
}

function drawWheel(ctx: CanvasRenderingContext2D, rot: number, color: CarColor): void {
  ctx.save();
  ctx.rotate(-rot);
  ctx.fillStyle = PARTS.tire; ctx.strokeStyle = INK; ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.arc(0, 0, PHY.r, 0, TAU); ctx.fill(); ctx.stroke();
  // chunky treads
  ctx.fillStyle = PARTS.tread;
  for (let k = 0; k < 10; k++) {
    ctx.save(); ctx.rotate(k * TAU / 10); ctx.fillRect(PHY.r * 0.72, -0.05, PHY.r * 0.24, 0.1); ctx.restore();
  }
  // colored rim with three spokes
  ctx.fillStyle = color.body;
  ctx.beginPath(); ctx.arc(0, 0, PHY.r * 0.52, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = color.light; ctx.lineWidth = 0.05;
  for (let s = 0; s < 3; s++) {
    const an = s * TAU / 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * PHY.r * 0.42, Math.sin(an) * PHY.r * 0.42); ctx.stroke();
  }
  ctx.restore();
}

/** Coil shock from the body down to the wheel hub, drawn over the wheel so the travel shows. */
function drawShock(ctx: CanvasRenderingContext2D, x: number, hubY: number): void {
  const top = -0.28, coils = 4, w = 0.07;
  ctx.strokeStyle = PARTS.shock; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(x, top);
  for (let i = 1; i <= coils * 2; i++) {
    const y = top + (hubY - top) * i / (coils * 2);
    ctx.lineTo(x + (i % 2 ? w : -w), y);
  }
  ctx.lineTo(x, hubY); ctx.stroke();
  ctx.fillStyle = PARTS.shock; ctx.strokeStyle = INK; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.arc(x, hubY, 0.06, 0, TAU); ctx.fill(); ctx.stroke();
}

/** passengers: friends riding in the bed, in pickup order. */
export function drawCar(ctx: CanvasRenderingContext2D, car: Car, wheelRot: readonly [number, number], shape: Readonly<CarShape>, look: CarLook, passengers = 0): void {
  const color = look.color;
  ctx.save();
  ctx.translate(car.x, car.y); ctx.rotate(car.a);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // roll bar behind the driver
  ctx.strokeStyle = PARTS.rollBar; ctx.lineWidth = 0.09;
  ctx.beginPath(); ctx.moveTo(-0.3, 0.2); ctx.lineTo(-0.27, 1.0); ctx.quadraticCurveTo(-0.22, 1.12, -0.08, 1.1); ctx.stroke();
  // passengers in the bed, three per row
  for (let p = 0; p < passengers; p++) {
    drawAnimalHead(ctx, friendAnimal(p), -1.05 + (p % 3) * 0.3, 0.52 + Math.floor(p / 3) * 0.26, 0.15, 0);
  }
  // lower body
  ctx.strokeStyle = INK; ctx.lineWidth = 0.06;
  ctx.fillStyle = color.body;
  roundRect(ctx, -1.35, -0.36, 2.7, 0.62, 0.3); ctx.fill(); ctx.stroke();
  // hood bump and bed tub
  ctx.beginPath(); ctx.ellipse(0.82, 0.2, 0.52, 0.16, -0.06, Math.PI, 0, true); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color.dark;
  roundRect(ctx, -1.3, 0.12, 0.98, 0.27, 0.12); ctx.fill(); ctx.stroke();
  // windshield
  ctx.fillStyle = PARTS.glass;
  ctx.beginPath(); ctx.moveTo(0.42, 0.3); ctx.lineTo(0.56, 0.3); ctx.lineTo(0.74, 0.66); ctx.lineTo(0.64, 0.68); ctx.closePath(); ctx.fill(); ctx.stroke();
  // driver
  drawAnimalHead(ctx, look.driver, shape.head.x, shape.head.y, shape.head.r, 1);
  // round decal with a hill
  ctx.fillStyle = PARTS.decal; ctx.lineWidth = 0.04;
  ctx.beginPath(); ctx.arc(-0.62, -0.06, 0.17, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PARTS.decalHill;
  ctx.beginPath(); ctx.moveTo(-0.76, -0.13); ctx.lineTo(-0.64, 0.04); ctx.lineTo(-0.57, -0.04); ctx.lineTo(-0.5, 0.0); ctx.lineTo(-0.48, -0.13); ctx.closePath(); ctx.fill();
  // lights and bumper
  ctx.lineWidth = 0.05;
  ctx.fillStyle = PARTS.light;
  ctx.beginPath(); ctx.arc(1.2, 0.02, 0.1, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PARTS.tail;
  roundRect(ctx, -1.38, -0.06, 0.09, 0.16, 0.04); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PARTS.bumper;
  roundRect(ctx, 1.12, -0.38, 0.32, 0.14, 0.06); ctx.fill();
  // wheels, then the shocks over them
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1, hubY = -PHY.wy - car.wheels[i].ext;
    ctx.save(); ctx.translate(side * PHY.wx, hubY); drawWheel(ctx, wheelRot[i], color); ctx.restore();
    drawShock(ctx, side * PHY.wx, hubY);
  }
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
