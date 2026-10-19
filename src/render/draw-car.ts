// The game's own car: a rounded buggy with a roll bar, fenders, visible shocks over the wheels and
// a bed for passengers. Drawn in the car's local frame (meters, y up). It keeps the body size
// used by the collision shape in core/vehicle.ts (x about -1.35 to 1.35, y -0.38 to 0.40).
import { friendAnimal, type AnimalSpec } from '../core/animals';
import { TAU } from '../core/math';
import { PHY, type Car } from '../core/physics';
import type { CarShape, Circle } from '../core/vehicle';
import { drawAnimalHead, drawAnimalSeated } from './draw-animal';
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
  tireSide: '#3a4147',
  tread: '#4b535a',
  bolt: '#e9ecea',
  shock: '#c9ccc8',
  spring: '#f0c24a',
  rollBar: '#4a5257',
  seat: '#353b40',
  glass: '#bfe6ee',
  glare: 'rgba(255, 255, 255, 0.75)',
  light: '#ffe27a',
  glow: 'rgba(255, 226, 122, 0.35)',
  tail: '#e8574d',
  decal: '#fff',
  decalHill: '#3f8f4a',
  metal: '#2f363b',
  exhaust: '#8b9297',
  shine: 'rgba(255, 255, 255, 0.5)',
  topLight: 'rgba(255, 255, 255, 0.32)',
  bottomShade: 'rgba(10, 20, 25, 0.22)',
} as const;

/** Where the driver's hands go. */
const STEERING = { x: 0.43, y: 0.44 } as const;

export interface CarLook {
  driver: AnimalSpec;
  color: CarColor;
}

/** Outline of the car body, from the rear bottom corner going forward. */
function bodyPath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(-1.18, -0.36);
  ctx.lineTo(1.02, -0.36);
  ctx.quadraticCurveTo(1.42, -0.34, 1.4, -0.06);
  ctx.quadraticCurveTo(1.38, 0.14, 1.1, 0.18);
  ctx.lineTo(0.56, 0.26);
  ctx.quadraticCurveTo(0.42, 0.29, 0.28, 0.25);
  ctx.lineTo(-0.3, 0.25);
  ctx.lineTo(-0.34, 0.37);
  ctx.lineTo(-1.24, 0.37);
  ctx.quadraticCurveTo(-1.4, 0.37, -1.4, 0.2);
  ctx.lineTo(-1.4, -0.2);
  ctx.quadraticCurveTo(-1.4, -0.36, -1.18, -0.36);
  ctx.closePath();
}

function drawWheel(ctx: CanvasRenderingContext2D, rot: number, color: CarColor): void {
  const R = PHY.r;
  ctx.save();
  ctx.rotate(-rot);
  ctx.strokeStyle = INK; ctx.lineWidth = 0.05;
  // tire with a lighter sidewall ring
  ctx.fillStyle = PARTS.tire;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
  ctx.fillStyle = PARTS.tireSide;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.78, 0, TAU); ctx.fill();
  // chunky treads on the outer edge
  ctx.fillStyle = PARTS.tread;
  for (let k = 0; k < 12; k++) {
    ctx.save(); ctx.rotate(k * TAU / 12); ctx.fillRect(R * 0.82, -0.045, R * 0.2, 0.09); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
  // rim with a darker lip, five bolts and a cap
  ctx.fillStyle = color.dark;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.56, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color.body;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.44, 0, TAU); ctx.fill();
  ctx.fillStyle = PARTS.bolt;
  for (let k = 0; k < 5; k++) {
    const an = k * TAU / 5;
    ctx.beginPath(); ctx.arc(Math.cos(an) * R * 0.29, Math.sin(an) * R * 0.29, R * 0.055, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = color.light;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.12, 0, TAU); ctx.fill(); ctx.lineWidth = 0.03; ctx.stroke();
  ctx.restore();
  // fixed shine on the tire (does not spin)
  ctx.strokeStyle = PARTS.shine; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.9, 2.0, 2.7); ctx.stroke();
}

/** Coil shock from the body down to the wheel hub, drawn over the wheel so the travel shows. */
function drawShock(ctx: CanvasRenderingContext2D, x: number, hubY: number): void {
  const top = -0.2, coils = 4, w = 0.07;
  ctx.strokeStyle = PARTS.shock; ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, hubY); ctx.stroke();
  ctx.strokeStyle = PARTS.spring; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(x, top);
  for (let i = 1; i <= coils * 2; i++) {
    const y = top + (hubY - top) * i / (coils * 2);
    ctx.lineTo(x + (i % 2 ? w : -w), y);
  }
  ctx.stroke();
  ctx.fillStyle = PARTS.shock; ctx.strokeStyle = INK; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.arc(x, hubY, 0.06, 0, TAU); ctx.fill(); ctx.stroke();
}

/** passengers: friends riding in the bed, in pickup order. */
export function drawCar(ctx: CanvasRenderingContext2D, car: Car, wheelRot: readonly [number, number], shape: Readonly<CarShape>, look: CarLook, passengers = 0): void {
  const color = look.color;
  ctx.save();
  ctx.translate(car.x, car.y); ctx.rotate(car.a);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // roll bar and seat behind the driver
  ctx.strokeStyle = INK; ctx.lineWidth = 0.13;
  ctx.beginPath(); ctx.moveTo(-0.34, 0.3); ctx.lineTo(-0.3, 1.0); ctx.quadraticCurveTo(-0.26, 1.13, -0.1, 1.12); ctx.stroke();
  ctx.strokeStyle = PARTS.rollBar; ctx.lineWidth = 0.08;
  ctx.stroke();
  ctx.strokeStyle = PARTS.shine; ctx.lineWidth = 0.02;
  ctx.beginPath(); ctx.moveTo(-0.33, 0.35); ctx.lineTo(-0.3, 0.98); ctx.stroke();
  ctx.fillStyle = PARTS.seat; ctx.strokeStyle = INK; ctx.lineWidth = 0.04;
  roundRect(ctx, -0.24, 0.2, 0.2, 0.62, 0.08); ctx.fill(); ctx.stroke();

  // passengers in the bed, three per row (the body rim hides their lower half)
  for (let p = 0; p < passengers; p++) {
    drawAnimalHead(ctx, friendAnimal(p), -1.08 + (p % 3) * 0.3, 0.54 + Math.floor(p / 3) * 0.26, 0.15, 0);
  }
  // driver's body and arm, steering column
  ctx.strokeStyle = PARTS.metal; ctx.lineWidth = 0.04;
  ctx.beginPath(); ctx.moveTo(0.52, 0.26); ctx.lineTo(STEERING.x, STEERING.y); ctx.stroke();
  drawAnimalSeated(ctx, look.driver, shape.head.x, shape.head.y, shape.head.r, STEERING.x, STEERING.y);

  // body with light from above
  ctx.strokeStyle = INK; ctx.lineWidth = 0.06;
  bodyPath(ctx);
  ctx.fillStyle = color.body; ctx.fill();
  ctx.save();
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0.37, 0, -0.36);
  g.addColorStop(0, PARTS.topLight); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, PARTS.bottomShade);
  ctx.fillStyle = g; ctx.fillRect(-1.5, -0.4, 3, 0.8);
  // fender wells over both wheels
  ctx.fillStyle = color.dark;
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * PHY.wx, -0.36, 0.5, 0, Math.PI); ctx.fill(); }
  // bed interior
  ctx.fillStyle = color.dark; ctx.fillRect(-1.3, 0.25, 0.94, 0.1);
  ctx.restore();
  bodyPath(ctx); ctx.stroke();
  // fender flares and a long shine along the side
  ctx.strokeStyle = INK; ctx.lineWidth = 0.13;
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * PHY.wx, -0.36, 0.5, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke(); }
  ctx.strokeStyle = color.dark; ctx.lineWidth = 0.08;
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * PHY.wx, -0.36, 0.5, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke(); }
  ctx.strokeStyle = PARTS.shine; ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(-1.25, 0.2); ctx.lineTo(-0.45, 0.2); ctx.moveTo(0.3, 0.15); ctx.quadraticCurveTo(0.8, 0.13, 1.18, 0.07); ctx.stroke();
  // door line
  ctx.strokeStyle = color.dark; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.moveTo(-0.32, 0.2); ctx.quadraticCurveTo(-0.36, -0.05, -0.3, -0.12); ctx.moveTo(0.28, 0.2); ctx.lineTo(0.28, -0.12); ctx.stroke();

  // windshield with frame and glare
  ctx.strokeStyle = INK; ctx.lineWidth = 0.05;
  ctx.fillStyle = PARTS.glass;
  ctx.beginPath(); ctx.moveTo(0.48, 0.28); ctx.lineTo(0.6, 0.28); ctx.lineTo(0.8, 0.68); ctx.lineTo(0.69, 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = PARTS.glare; ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.moveTo(0.57, 0.36); ctx.lineTo(0.67, 0.58); ctx.stroke();
  // steering wheel
  ctx.strokeStyle = INK; ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.ellipse(STEERING.x + 0.02, STEERING.y, 0.035, 0.11, 0.35, 0, TAU); ctx.stroke();

  // driver's head
  drawAnimalHead(ctx, look.driver, shape.head.x, shape.head.y, shape.head.r, 1);

  // round decal with a hill on the door
  ctx.strokeStyle = INK; ctx.fillStyle = PARTS.decal; ctx.lineWidth = 0.04;
  ctx.beginPath(); ctx.arc(-0.02, -0.04, 0.16, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PARTS.decalHill;
  ctx.beginPath(); ctx.moveTo(-0.15, -0.1); ctx.lineTo(-0.04, 0.06); ctx.lineTo(0.03, -0.02); ctx.lineTo(0.09, 0.02); ctx.lineTo(0.12, -0.1); ctx.closePath(); ctx.fill();

  // front: headlight with a glow, grille and bumper
  ctx.fillStyle = PARTS.glow;
  ctx.beginPath(); ctx.arc(1.25, 0.02, 0.2, 0, TAU); ctx.fill();
  ctx.fillStyle = PARTS.light; ctx.lineWidth = 0.04;
  ctx.beginPath(); ctx.arc(1.25, 0.02, 0.09, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(1.23, 0.04, 0.035, 0, TAU); ctx.fill();
  ctx.strokeStyle = color.dark; ctx.lineWidth = 0.03;
  for (const y of [-0.12, -0.18, -0.24]) { ctx.beginPath(); ctx.moveTo(1.3, y); ctx.lineTo(1.4, y); ctx.stroke(); }
  ctx.fillStyle = PARTS.metal; ctx.strokeStyle = INK; ctx.lineWidth = 0.03;
  roundRect(ctx, 1.12, -0.42, 0.36, 0.13, 0.06); ctx.fill(); ctx.stroke();
  // back: tail light, bumper and exhaust
  ctx.fillStyle = PARTS.tail;
  roundRect(ctx, -1.44, 0.02, 0.08, 0.16, 0.04); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PARTS.metal;
  roundRect(ctx, -1.48, -0.34, 0.2, 0.12, 0.05); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PARTS.exhaust;
  roundRect(ctx, -1.56, -0.3, 0.14, 0.06, 0.03); ctx.fill(); ctx.stroke();

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
