import { describe, expect, it } from 'vitest';
import { newCar, PHY, stepCar } from '../src/core/physics';
import { pedalsOnly } from '../src/core/run';
import { DEFAULT_TERRAIN, type TerrainConfig } from '../src/core/terrain';
import { DEFAULT_CAR_SHAPE } from '../src/core/vehicle';
import { combineHeld, heldFromKeys, NOTHING_HELD, toDriveInput, type ControlSettings } from '../src/input/scheme';

const CLASSIC: ControlSettings = { scheme: 'classic', swapSides: false };
const ARROWS: ControlSettings = { scheme: 'arrows', swapSides: false };
const FLAT: TerrainConfig = { amp: 0, kick: 0, kickH: 1, flatFrom: 1e9 };

describe('control schemes', () => {
  it('classic: the pedals also turn the car in the air, as in the prototype', () => {
    expect(toDriveInput(CLASSIC, { ...NOTHING_HELD, gas: true })).toEqual(pedalsOnly(1));
    expect(toDriveInput(CLASSIC, { ...NOTHING_HELD, brake: true })).toEqual(pedalsOnly(-1));
    // arrows do nothing in classic
    expect(toDriveInput(CLASSIC, { ...NOTHING_HELD, tiltBack: true })).toEqual(pedalsOnly(0));
  });

  it('arrows: gas only drives and the arrows tilt', () => {
    expect(toDriveInput(ARROWS, { ...NOTHING_HELD, gas: true })).toEqual({ thr: 1, spin: 0, lean: 0 });
    expect(toDriveInput(ARROWS, { ...NOTHING_HELD, tiltBack: true })).toEqual({ thr: 0, spin: 1, lean: 1 });
    expect(toDriveInput(ARROWS, { gas: true, brake: false, tiltBack: false, tiltForward: true })).toEqual({ thr: 1, spin: -1, lean: -1 });
  });

  it('swapping sides only moves buttons, never changes what they do', () => {
    const held = { gas: true, brake: false, tiltBack: true, tiltForward: false };
    expect(toDriveInput({ ...ARROWS, swapSides: true }, held)).toEqual(toDriveInput(ARROWS, held));
    expect(toDriveInput({ ...CLASSIC, swapSides: true }, held)).toEqual(toDriveInput(CLASSIC, held));
  });

  it('maps keys per scheme: in arrows, left and right tilt instead of driving', () => {
    const right = new Set(['arrowright']);
    expect(heldFromKeys(CLASSIC, right)).toEqual({ ...NOTHING_HELD, gas: true });
    expect(heldFromKeys(ARROWS, right)).toEqual({ ...NOTHING_HELD, tiltForward: true });
    expect(heldFromKeys(ARROWS, new Set(['w', 'a']))).toEqual({ ...NOTHING_HELD, gas: true, tiltBack: true });
    expect(combineHeld({ ...NOTHING_HELD, gas: true }, { ...NOTHING_HELD, tiltBack: true })).toEqual({ ...NOTHING_HELD, gas: true, tiltBack: true });
  });
});

describe('arrows physics', () => {
  it('holding gas over the first ramp no longer spins the car; the arrows do', () => {
    const rotation = (spin: number) => {
      const car = newCar(0);
      let a0 = 0, inAir = false, maxRot = 0;
      for (let i = 0; i < 30 * 240; i++) {
        stepCar(car, 1, PHY.dt, true, DEFAULT_TERRAIN, DEFAULT_CAR_SHAPE, car.air > 0 ? spin : 0, 0);
        if (car.x > 50 && car.air > 0 && !inAir) { inAir = true; a0 = car.a; }
        if (inAir) maxRot = Math.max(maxRot, Math.abs(car.a - a0));
        if (inAir && car.air === 0 && maxRot > 0.05) break;
      }
      return maxRot / (2 * Math.PI);
    };
    expect(rotation(0)).toBeLessThan(0.15);
    expect(rotation(1)).toBeGreaterThan(0.9);
  });

  it('a short tilt back with gas pops a wheelie the player can recover from', () => {
    const car = newCar(0, FLAT);
    for (let i = 0; i < 240; i++) stepCar(car, 1, PHY.dt, false, FLAT, DEFAULT_CAR_SHAPE, 0, 0);
    let wheelie = 0;
    for (let i = 0; i < 4 * 240; i++) {
      const lean = i < 0.6 * 240 ? 1 : 0;
      expect(stepCar(car, 1, PHY.dt, false, FLAT, DEFAULT_CAR_SHAPE, lean, lean)).toBe(false);
      if (car.wheels[0].c && !car.wheels[1].c) wheelie += PHY.dt;
    }
    expect(wheelie).toBeGreaterThan(0.5);
    expect(Math.abs(car.a)).toBeLessThan(0.1);
  });
});
