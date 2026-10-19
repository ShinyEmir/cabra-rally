// Plays story mode level 1 frame by frame with the prototype's game code and with the port, and
// checks score, coins, friends, floating texts, car state and game state on every frame.
import { describe, expect, it } from 'vitest';
import { LEVELS, storyMode } from '../src/core/levels';
import { PHY, PROTOTYPE_SHAPE } from '../src/core/physics';
import { createRun, updateRun } from '../src/core/run';
import { describeScore, TEXT } from '../src/ui/strings';
import { holdGas, jittery, leveler, mixed, type Driver } from './drivers';
import { loadPrototypeGame, type ProtoPop } from './prototype';

interface Scenario {
  name: string;
  input: Driver;
  dt: (f: number) => number;
}

const SCENARIOS: Scenario[] = [
  { name: 'gas sostenido a 60 Hz', input: holdGas, dt: () => 1 / 60 },
  { name: 'nivelador a 60 Hz', input: leveler(0.1), dt: () => 1 / 60 },
  { name: 'nivelador con cuadros irregulares', input: leveler(0.2), dt: jittery(21) },
  { name: 'mixto a 60 Hz', input: mixed(31, 12), dt: () => 1 / 60 },
];

describe('story parity with reference/prototype.html (level 1)', () => {
  for (const sc of SCENARIOS) {
    it(`matches frame by frame: ${sc.name}`, () => {
      const proto = loadPrototypeGame();
      Object.assign(proto.PHY, PHY);
      proto.startGame('story');
      const run = createRun(storyMode(LEVELS[0]), 'play', proto.G.acc, PROTOTYPE_SHAPE);
      const ours: ProtoPop[] = [];
      let frames = 0;
      for (let f = 0; f < 60 * 120 && proto.G.state !== 'over'; f++) {
        const thr = sc.input(f, proto.G.car), dt = sc.dt(f);
        proto.keys.gas = thr > 0;
        proto.keys.brake = thr < 0;
        proto.frameUpdate(dt);

        const ev = updateRun(run, dt, thr);
        if (ev.crashed) ours.push({ text: TEXT.ouch, pts: 0, small: true });
        for (let i = 0; i < ev.friends.length; i++) ours.push({ text: TEXT.friendAboard, pts: 0, small: true });
        for (const e of ev.score) {
          const p = describeScore(e);
          ours.push({ text: p.text, pts: e.points, small: p.small });
        }

        const g = proto.G;
        const where = `frame ${f}`;
        expect(run.phase, where).toBe(g.state);
        expect(run.score, where).toBe(g.score);
        expect(run.coins, where).toBe(g.coins);
        expect(run.friendsAboard, where).toBe(g.friends);
        expect(run.field.items.length, where).toBe(g.items.length);
        expect(run.car, where).toEqual(g.car);
        frames = f + 1;
      }
      expect(ours).toEqual(proto.pops);
      console.log(`[historia, ${sc.name}] ${frames} cuadros, estado ${proto.G.state}, x ${proto.G.car.x.toFixed(0)}, puntos ${proto.G.score}, cabritos ${proto.G.friends}, gano ${run.won}`);
    });
  }
});
