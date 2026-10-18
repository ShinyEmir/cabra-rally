// Main loop and game state machine: menu, play, paused, crash, over.
// Physics runs at a fixed 1/240 s step inside updateRun(); drawing runs at the display rate.
import { FREE_MODE } from './core/modes';
import { createRun, distance, updateRun, type DriveInput, type Run } from './core/run';
import type { KeyState } from './input/keyboard';
import type { TouchState } from './input/pedals';
import { combineHeld, heldFromKeys, loadControls, saveControls, toDriveInput, type ControlSettings } from './input/scheme';
import { followCar, measureScreen, type Camera, type Screen } from './render/camera';
import { renderFrame } from './render/draw-world';
import { coinBurst, emitDriving, updateParticles, type Particle } from './render/particles';
import type { Screens, View } from './ui/screens';
import { describeScore, TEXT } from './ui/strings';

export type GameState = 'menu' | 'play' | 'paused' | 'crash' | 'over';

const GAME = {
  /** Longest frame the simulation accepts, in seconds. */
  maxFrame: 0.05,
  bestKey: 'cabra-rally-best',
  /** Camera offset from the car when a run starts. */
  camStartX: 3,
  camStartY: 1,
} as const;

function loadBest(): number {
  try {
    const v = parseInt(localStorage.getItem(GAME.bestKey) || '0', 10);
    return isNaN(v) ? 0 : v;
  } catch {
    return 0;
  }
}

function saveBest(best: number): void {
  try { localStorage.setItem(GAME.bestKey, String(best)); } catch { /* storage may be unavailable */ }
}

export class Game {
  state: GameState = 'menu';
  private run: Run;
  private readonly cam: Camera = { x: 0, y: 0 };
  private parts: Particle[] = [];
  private best = 0;
  private screen: Screen = { W: 1, H: 1, S: 20 };
  private last = performance.now();
  private readonly ctx: CanvasRenderingContext2D;
  private controls: ControlSettings = loadControls();
  /** Screen to go back to when the controls screen closes. */
  private controlsReturn: View = 'menu';

  constructor(private readonly ui: Screens, private readonly keys: KeyState, private readonly touch: TouchState) {
    const ctx = ui.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    // attract mode: the car settles on the first hill behind the menu
    this.run = createRun(FREE_MODE, 'idle');
    this.cam.x = GAME.camStartX;
    this.cam.y = this.run.car.y + GAME.camStartY;
  }

  start(): void {
    this.ui.applyControls(this.controls);
    this.resize();
    this.showMenu();
    requestAnimationFrame(this.frame);
  }

  resize(): void {
    this.screen = measureScreen(this.ui.canvas);
  }

  startRun(): void {
    this.run = createRun(FREE_MODE, 'play', this.run.acc);
    this.parts = [];
    this.cam.x = this.run.car.x + GAME.camStartX;
    this.cam.y = this.run.car.y + GAME.camStartY;
    this.ui.clearPops();
    this.ui.setHud(0, 0, 0);
    this.state = 'play';
    this.ui.show('play');
  }

  showMenu(): void {
    this.state = 'menu';
    // the last car stays on screen and settles with no control
    this.run.phase = 'idle';
    this.best = loadBest();
    this.ui.setBest(this.best);
    this.ui.show('menu');
  }

  setPause(on: boolean): void {
    if (on && this.state === 'play') { this.state = 'paused'; this.ui.show('pause'); }
    else if (!on && this.state === 'paused') { this.state = 'play'; this.ui.show('play'); this.last = performance.now(); }
  }

  togglePause(): void {
    if (this.state === 'play') this.setPause(true);
    else if (this.state === 'paused') this.setPause(false);
  }

  restart(): void {
    if (this.state === 'play' || this.state === 'crash' || this.state === 'over') this.startRun();
  }

  /** Window lost focus: release every control and pause. */
  suspend(): void {
    this.keys.release();
    this.touch.release();
    this.setPause(true);
  }

  private finishRun(): void {
    const score = this.run.score;
    let newBest = false;
    if (score > this.best) { this.best = score; saveBest(score); newBest = score > 0; }
    this.ui.showResults({ score, distance: distance(this.run), coins: this.run.coins, newBest });
    this.state = 'over';
    this.ui.show('over');
  }

  /** Opens the controls screen from the menu or the pause screen. */
  openControls(): void {
    if (this.state !== 'menu' && this.state !== 'paused') return;
    this.controlsReturn = this.state === 'menu' ? 'menu' : 'pause';
    this.ui.show('controls');
  }

  closeControls(): void {
    this.ui.show(this.controlsReturn);
  }

  setControls(change: Partial<ControlSettings>): void {
    this.controls = { ...this.controls, ...change };
    saveControls(this.controls);
    this.touch.release();
    this.ui.applyControls(this.controls);
  }

  private input(): DriveInput {
    const held = combineHeld(heldFromKeys(this.controls, this.keys.pressed), this.touch.held);
    return toDriveInput(this.controls, held);
  }

  private update(dt: number): void {
    const run = this.run;
    if (this.state === 'menu') updateRun(run, dt, 0);
    if (this.state === 'play' || this.state === 'crash') {
      const input = this.input();
      const ev = updateRun(run, dt, input);
      if (ev.crashed) { this.state = 'crash'; this.ui.pop(TEXT.ouch, 0, true); }
      for (const c of ev.coins) coinBurst(this.parts, c.x, c.y);
      for (const e of ev.score) {
        const p = describeScore(e);
        this.ui.pop(p.text, e.points, p.small);
      }
      if (ev.finished) this.finishRun();
      emitDriving(this.parts, run.car, dt, input.thr > 0 && this.state === 'play');
      this.ui.setHud(run.score, distance(run), run.coins);
    }
    updateParticles(this.parts, dt);
    followCar(this.cam, run.car, dt);
  }

  private readonly frame = (now: number): void => {
    const dt = Math.min(GAME.maxFrame, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (this.state !== 'paused') this.update(dt);
    renderFrame(this.ctx, this.screen, this.cam, this.run, this.parts, now / 1000);
    requestAnimationFrame(this.frame);
  };
}
