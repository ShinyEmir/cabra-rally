// Runs the prototype's own physics code next to the TypeScript port and checks that both
// produce exactly the same state on every step for the same inputs. Tuned parameters are
// copied into the prototype first, so only the code is compared, not the numbers.
import { describe, expect, it } from 'vitest';
import { newCar, PHY, stepCar, type Car } from '../src/core/physics';
import { hash01 } from '../src/core/rng';
import type { TerrainConfig } from '../src/core/terrain';
import { loadPrototypePhysics } from './prototype';

/**
 * Every physics parameter that differs from the prototype, as [prototype, port].
 * Update this together with the parameter table in docs/PLAN.md.
 */
const TUNED: Record<string, [number, number]> = {
  c: [11, 16],
  airTorque: [11, 9],
};

describe('tuned physics parameters', () => {
  it('differ from the prototype only where listed', () => {
    const proto = loadPrototypePhysics();
    const diff: Record<string, [number, number]> = {};
    const ours = PHY as Record<string, number>;
    for (const key of Object.keys(proto.PHY)) {
      if (!Object.is(proto.PHY[key], ours[key])) diff[key] = [proto.PHY[key], ours[key]];
    }
    expect(Object.keys(ours).sort()).toEqual(Object.keys(proto.PHY).sort());
    expect(diff).toEqual(TUNED);
  });
});

type Input = (step: number) => number;

interface Scenario {
  name: string;
  td: TerrainConfig;
  input: Input;
}

const FREE: TerrainConfig = { amp: 1, kick: 1, kickH: 1, flatFrom: 1e9 };
const STORY: TerrainConfig = { amp: 0.75, kick: 1, kickH: 0.7, flatFrom: 300 - 40 };
const FLAT: TerrainConfig = { amp: 0, kick: 0, kickH: 1, flatFrom: 1e9 };

// gas mostly, with taps of brake and coasting, changing every quarter second
function mixed(seed: number): Input {
  return (step) => {
    const r = hash01(seed * 1000 + Math.floor(step / 60));
    return r < 0.6 ? 1 : r < 0.8 ? 0 : -1;
  };
}

const SCENARIOS: Scenario[] = [
  { name: 'libre, gas sostenido', td: FREE, input: () => 1 },
  { name: 'libre, mixto', td: FREE, input: mixed(1) },
  { name: 'historia, mixto', td: STORY, input: mixed(2) },
  { name: 'plano, mixto', td: FLAT, input: mixed(3) },
];

const STEPS = 60 * Math.round(1 / PHY.dt);

function snapshot(car: Car): number[] {
  return [car.x, car.y, car.a, car.vx, car.vy, car.w, car.air, car.stuck,
    car.wheels[0].ext, +car.wheels[0].c, car.wheels[1].ext, +car.wheels[1].c];
}

describe('physics parity with reference/prototype.html', () => {
  const proto = loadPrototypePhysics();
  Object.assign(proto.PHY, PHY);

  for (const sc of SCENARIOS) {
    it(`matches the prototype for 60 s: ${sc.name}`, () => {
      Object.assign(proto.TD, sc.td);
      const a = proto.newCar(0);
      const b = newCar(0, sc.td);
      // Same flow as the prototype loop: after a crash, no control and no more crash checks.
      let crashedA = false, crashedB = false, crashStep = -1;
      for (let i = 0; i < STEPS; i++) {
        const thr = sc.input(i);
        const ra = proto.stepCar(a, crashedA ? 0 : thr, PHY.dt, crashedA);
        const rb = stepCar(b, crashedB ? 0 : thr, PHY.dt, crashedB, sc.td);
        if (ra && !crashedA) { crashedA = true; crashStep = i; }
        if (rb) crashedB = true;
        expect(rb).toBe(ra);
        const sa = snapshot(a), sb = snapshot(b);
        for (let j = 0; j < sa.length; j++) {
          if (!Object.is(sa[j], sb[j])) throw new Error(`state differs at step ${i}, field ${j}: ${sa[j]} vs ${sb[j]}`);
        }
      }
      const crash = crashStep >= 0 ? `choque a los ${(crashStep * PHY.dt).toFixed(2)} s` : 'sin choque';
      console.log(`[${sc.name}] x final prototipo ${a.x} | port ${b.x} | ${crash}`);
      expect(b.x).toBe(a.x);
    });
  }
});
