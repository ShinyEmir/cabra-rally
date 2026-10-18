// Plays whole free mode runs frame by frame with the prototype's game code and with the port
// (core/run plus the texts from ui/strings) and checks that score, coins, floating texts,
// car state and game state match exactly on every frame.
import { describe, expect, it } from 'vitest';
import { FREE_MODE } from '../src/core/modes';
import { PHY, PROTOTYPE_SHAPE } from '../src/core/physics';
import { createRun, updateRun } from '../src/core/run';
import { describeScore, TEXT } from '../src/ui/strings';
import { holdGas, jittery, leveler, mixed, type Driver } from './drivers';
import { loadPrototypeGame, type ProtoPop } from './prototype';

interface Scenario {
  name: string;
  input: Driver;
  /** Frame length for frame f, in seconds. */
  dt: (f: number) => number;
}

const MAX_FRAMES = 60 * 120;

const SCENARIOS: Scenario[] = [
  { name: 'gas sostenido a 60 Hz', input: holdGas, dt: () => 1 / 60 },
  { name: 'mixto a 60 Hz', input: mixed(11, 15), dt: () => 1 / 60 },
  { name: 'mixto a 120 Hz', input: mixed(12, 30), dt: () => 1 / 120 },
  { name: 'mixto con cuadros irregulares', input: mixed(13, 10), dt: jittery(13) },
  { name: 'mixto a 30 Hz', input: mixed(14, 8), dt: () => 1 / 30 },
  { name: 'nivelador en el aire a 60 Hz', input: leveler(0.1), dt: () => 1 / 60 },
  { name: 'nivelador con cuadros irregulares', input: leveler(0.2), dt: jittery(15) },
];

describe('game parity with reference/prototype.html (free mode)', () => {
  for (const sc of SCENARIOS) {
    it(`matches frame by frame: ${sc.name}`, () => {
      const proto = loadPrototypeGame();
      // compare the code with the same tuned numbers on both sides
      Object.assign(proto.PHY, PHY);
      proto.startGame('free');
      const run = createRun(FREE_MODE, 'play', proto.G.acc, PROTOTYPE_SHAPE);
      const ours: ProtoPop[] = [];
      let frames = 0;
      for (let f = 0; f < MAX_FRAMES && proto.G.state !== 'over'; f++) {
        // the car is identical on both sides, so either can feed the driver
        const thr = sc.input(f, proto.G.car), dt = sc.dt(f);
        proto.keys.gas = thr > 0;
        proto.keys.brake = thr < 0;
        proto.frameUpdate(dt);

        const ev = updateRun(run, dt, thr);
        if (ev.crashed) ours.push({ text: TEXT.ouch, pts: 0, small: true });
        for (const e of ev.score) {
          const p = describeScore(e);
          ours.push({ text: p.text, pts: e.points, small: p.small });
        }

        const g = proto.G;
        const where = `frame ${f}`;
        expect(run.phase, where).toBe(g.state);
        expect(run.score, where).toBe(g.score);
        expect(run.coins, where).toBe(g.coins);
        expect(run.field.items.length, where).toBe(g.items.length);
        expect(run.car, where).toEqual(g.car);
        expect(run.acc, where).toBe(g.acc);
        frames = f + 1;
      }
      expect(ours).toEqual(proto.pops);
      const kinds = [...new Set(proto.pops.map((p) => p.text))].join(', ');
      console.log(`[${sc.name}] ${frames} cuadros, estado ${proto.G.state}, puntos ${proto.G.score}, monedas ${proto.G.coins} | ${kinds}`);
    });
  }
});
