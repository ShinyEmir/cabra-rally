// Loads the prototype's game code (physics, coins, scoring, frame loop) so tests can run it
// next to the port. The DOM is replaced by minimal fakes and pop() is overridden to record
// floating texts; drawing and input wiring are not loaded.
import prototypeHtml from '../reference/prototype.html?raw';
import type { Car } from '../src/core/physics';
import type { TerrainConfig } from '../src/core/terrain';

export interface ProtoPop {
  text: string;
  pts: number;
  small: boolean;
}

export interface ProtoGame {
  G: {
    state: string;
    car: Car;
    score: number;
    coins: number;
    items: Array<{ x: number; y: number; got: boolean }>;
    acc: number;
  };
  keys: { gas: boolean; brake: boolean };
  TD: TerrainConfig;
  /** The prototype's own PHY object; tests copy the port's values into it. */
  PHY: Record<string, number>;
  pops: ProtoPop[];
  startGame(mode: 'free' | 'story'): void;
  frameUpdate(dt: number): void;
  newCar(x: number): Car;
  stepCar(car: Car, thr: number, dt: number, noCrash: boolean): boolean;
}

function section(from: string, to: string): string {
  const start = prototypeHtml.indexOf(from);
  const end = prototypeHtml.indexOf(to, start);
  if (start < 0 || end < 0) throw new Error(`markers not found in prototype.html: ${from} .. ${to}`);
  return prototypeHtml.slice(start, end);
}

/** Only the PHYSICS-START..PHYSICS-END block. */
export function loadPrototypePhysics(): Pick<ProtoGame, 'TD' | 'PHY' | 'newCar' | 'stepCar'> {
  const code = section('// PHYSICS-START', '// PHYSICS-END');
  return new Function(`'use strict';\n${code}\nreturn { TD: TD, PHY: PHY, newCar: newCar, stepCar: stepCar };`)() as Pick<ProtoGame, 'TD' | 'PHY' | 'newCar' | 'stepCar'>;
}

/** Physics, setup and game flow, up to the drawing section. */
export function loadPrototypeGame(): ProtoGame {
  const code = section('// PHYSICS-START', '// ---------------------------------------------------------------- drawing');
  const elements = new Map<string, Record<string, unknown>>();
  const document = {
    getElementById(id: string) {
      let el = elements.get(id);
      if (!el) {
        el = { hidden: false, textContent: '', style: {}, getContext: () => ({}) };
        elements.set(id, el);
      }
      return el;
    },
  };
  const localStorage = { getItem: () => null, setItem: () => undefined };
  const pops: ProtoPop[] = [];
  const body = `'use strict';\n${code}\n` +
    // a later function declaration replaces the prototype's DOM-based pop()
    'function pop(text, pts, small) { __pops.push({ text: text, pts: pts || 0, small: !!small }); }\n' +
    'return { G: G, keys: keys, TD: TD, PHY: PHY, startGame: startGame, frameUpdate: frameUpdate, newCar: newCar, stepCar: stepCar };';
  const api = new Function('document', 'localStorage', '__pops', body)(document, localStorage, pops) as Omit<ProtoGame, 'pops'>;
  return { ...api, pops };
}
