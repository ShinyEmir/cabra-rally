import { describe, expect, it } from 'vitest';
import { ANIMALS, animalById, DEFAULT_DRIVER_ID, friendAnimal } from '../src/core/animals';
import { LEVELS } from '../src/core/levels';
import { FREE_MODE } from '../src/core/modes';
import { carShapeFor, DEFAULT_CAR_SHAPE } from '../src/core/vehicle';
import { DEFAULT_GARAGE, sanitizeGarage } from '../src/garage';
import { drawAnimalHead, drawAnimalStanding } from '../src/render/draw-animal';
import { CAR_COLORS } from '../src/render/draw-car';
import { WORLDS } from '../src/render/worlds';
import { ANIMAL_TEXT, CAR_COLOR_NAMES } from '../src/ui/strings';

/** A canvas context that accepts every call and counts them, to run drawing code without a browser. */
function fakeContext(): { ctx: CanvasRenderingContext2D; calls: () => number } {
  let calls = 0;
  const ctx = new Proxy({}, {
    get: (_t, prop) => (prop === 'canvas' ? {} : (...args: unknown[]) => {
      calls++;
      void args;
      // gradients need an object to add color stops to
      return String(prop).startsWith('create') ? { addColorStop: () => { calls++; } } : undefined;
    }),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls: () => calls };
}

describe('the cast', () => {
  it('has the seven animals of the plan with unique ids, and the axolotl drives by default', () => {
    expect(ANIMALS.map((a) => a.id)).toEqual(['ajolote', 'armadillo', 'tlacuache', 'coati', 'jaguar', 'tucan', 'colibri']);
    expect(DEFAULT_DRIVER_ID).toBe('ajolote');
    expect(animalById('nadie').id).toBe('ajolote');
  });

  it('has a name and a trait in strings.ts for every animal', () => {
    for (const a of ANIMALS) {
      expect(ANIMAL_TEXT[a.id]?.name, a.id).toBeTruthy();
      expect(ANIMAL_TEXT[a.id]?.trait, a.id).toBeTruthy();
    }
  });

  it('draws every animal, head and standing, from its data alone', () => {
    for (const a of ANIMALS) {
      const head = fakeContext();
      drawAnimalHead(head.ctx, a, 0, 0, 0.3);
      expect(head.calls(), a.id).toBeGreaterThan(10);
      const body = fakeContext();
      drawAnimalStanding(body.ctx, a, 0, 0, 1);
      expect(body.calls(), a.id).toBeGreaterThan(head.calls());
    }
  });

  it('uses each driver head as the crash zone, on the same chassis', () => {
    for (const a of ANIMALS) {
      const shape = carShapeFor(a);
      expect(shape.head.r).toBe(a.headR);
      expect(shape.body).toBe(DEFAULT_CAR_SHAPE.body);
      expect(a.headR).toBeGreaterThanOrEqual(0.22);
      expect(a.headR).toBeLessThanOrEqual(0.32);
    }
  });

  it('fills story levels with friends that are not the default driver', () => {
    for (let i = 0; i < 12; i++) expect(friendAnimal(i).id).not.toBe(DEFAULT_DRIVER_ID);
  });
});

describe('worlds and paint', () => {
  it('every mode and level points to a world that exists', () => {
    const ids = new Set(WORLDS.map((w) => w.id));
    expect(ids.has(FREE_MODE.world)).toBe(true);
    for (const level of LEVELS) expect(ids.has(level.world), level.id).toBe(true);
  });

  it('every car color has a name, and none is the prototype orange', () => {
    for (const c of CAR_COLORS) {
      expect(CAR_COLOR_NAMES[c.id], c.id).toBeTruthy();
      expect(c.body.toLowerCase()).not.toBe('#ee6a2b');
    }
  });

  it('repairs a broken saved garage', () => {
    expect(sanitizeGarage(undefined)).toEqual(DEFAULT_GARAGE);
    expect(sanitizeGarage({ driver: 'tucan', carColor: 'mango' })).toEqual({ driver: 'tucan', carColor: 'mango' });
    expect(sanitizeGarage({ driver: 'cabra', carColor: 'rojo' })).toEqual(DEFAULT_GARAGE);
  });
});
