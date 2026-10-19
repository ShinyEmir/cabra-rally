// Main loop and game state machine: menu (main menu or level select), play, paused, crash, over.
// Physics runs at a fixed 1/240 s step inside updateRun(); drawing runs at the display rate.
import { ANIMALS, animalById } from './core/animals';
import { LEVELS, storyMode } from './core/levels';
import { clamp } from './core/math';
import { FREE_MODE, type ModeSpec } from './core/modes';
import { isUnlocked, recordWin, sanitizeProgress, type StoryProgress } from './core/progress';
import { newCar } from './core/physics';
import { carShapeFor } from './core/vehicle';
import { loadGarage, saveGarage, type Garage } from './garage';
import { createRun, distance, updateRun, type DriveInput, type Run } from './core/run';
import type { Sfx } from './audio/sfx';
import type { KeyState } from './input/keyboard';
import type { TouchState } from './input/pedals';
import { combineHeld, heldFromKeys, loadControls, saveControls, toDriveInput, type ControlSettings } from './input/scheme';
import { followCar, measureScreen, type Camera, type Screen } from './render/camera';
import { drawAnimalStanding } from './render/draw-animal';
import { CAR_COLORS, carColorById, drawCar } from './render/draw-car';
import { renderFrame, type SceneLook } from './render/draw-world';
import { worldById } from './render/worlds';
import { coinBurst, emitDriving, friendBurst, updateParticles, type Particle } from './render/particles';
import type { Screens, View } from './ui/screens';
import { animalText, CAR_COLOR_NAMES, describeScore, friendsText, levelFacts, levelName, levelNumber, TEXT } from './ui/strings';

export type GameState = 'menu' | 'play' | 'paused' | 'crash' | 'over';

const GAME = {
  /** Longest frame the simulation accepts, in seconds. */
  maxFrame: 0.05,
  bestKey: 'cabra-rally-best',
  storyKey: 'cabra-rally-story',
  coinsKey: 'cabra-rally-coins',
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

function loadCoins(): number {
  try {
    const v = parseInt(localStorage.getItem(GAME.coinsKey) || '0', 10);
    return isNaN(v) || v < 0 ? 0 : v;
  } catch {
    return 0;
  }
}

function saveCoins(n: number): void {
  try { localStorage.setItem(GAME.coinsKey, String(n)); } catch { /* storage may be unavailable */ }
}

function loadProgress(): StoryProgress {
  try { return sanitizeProgress(JSON.parse(localStorage.getItem(GAME.storyKey) || '{}')); } catch { return {}; }
}

function saveProgress(progress: StoryProgress): void {
  try { localStorage.setItem(GAME.storyKey, JSON.stringify(progress)); } catch { /* storage may be unavailable */ }
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
  private mode: Readonly<ModeSpec> = FREE_MODE;
  /** Position in LEVELS of the story level being played, or -1 in free mode. */
  private levelIndex = -1;
  private progress: StoryProgress = loadProgress();
  /** Opens every level (set from the ?ajuste panel, for testing). */
  unlockAll = false;
  private garage: Garage = loadGarage();
  /** Coins kept across runs; there is no shop yet. */
  private savedCoins = loadCoins();
  /** Screen to go back to when the controls screen closes. */
  private controlsReturn: View = 'menu';

  /** Air time on the previous frame, to hear landings. */
  private prevAir = 0;

  constructor(private readonly ui: Screens, private readonly keys: KeyState, private readonly touch: TouchState, private readonly sfx: Sfx) {
    const ctx = ui.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    // attract mode: the car settles on the first hill behind the menu
    this.run = createRun(FREE_MODE, 'idle', 0, carShapeFor(animalById(this.garage.driver)));
    this.cam.x = GAME.camStartX;
    this.cam.y = this.run.car.y + GAME.camStartY;
  }

  start(): void {
    this.ui.applyControls(this.controls);
    this.ui.setMuted(this.sfx.muted);
    this.resize();
    this.showMenu();
    requestAnimationFrame(this.frame);
  }

  resize(): void {
    this.screen = measureScreen(this.ui.canvas);
  }

  startFree(): void {
    this.mode = FREE_MODE;
    this.levelIndex = -1;
    this.startRun();
  }

  startLevel(index: number): void {
    const level = LEVELS[index];
    if (!level) return;
    this.mode = storyMode(level);
    this.levelIndex = index;
    this.startRun();
  }

  nextLevel(): void {
    this.startLevel(this.levelIndex + 1);
  }

  /** Plays the current mode or level again from the start. */
  startRun(): void {
    this.run = createRun(this.mode, 'play', this.run.acc, carShapeFor(animalById(this.garage.driver)));
    this.parts = [];
    this.cam.x = this.run.car.x + GAME.camStartX;
    this.cam.y = this.run.car.y + GAME.camStartY;
    this.ui.clearPops();
    this.ui.setHud(0, 0, 0);
    this.updateStoryHud();
    this.state = 'play';
    this.ui.show('play');
  }

  showMenu(): void {
    this.state = 'menu';
    // the last car stays on screen and settles with no control
    this.run.phase = 'idle';
    this.best = loadBest();
    this.ui.setBest(this.best);
    this.ui.setCoinTotal(this.savedCoins);
    this.ui.show('menu');
  }

  showLevels(): void {
    this.state = 'menu';
    this.run.phase = 'idle';
    this.ui.showLevels(LEVELS.map((level, i) => {
      const p = this.progress[level.id];
      const unlocked = this.unlockAll || isUnlocked(LEVELS, this.progress, i);
      return {
        number: levelNumber(i),
        name: levelName(level.id, i),
        facts: levelFacts(level.length, level.friends.length),
        unlocked,
        done: p?.done === true,
        status: !unlocked ? TEXT.levelLocked : p?.done ? TEXT.levelDone + ' · ' + friendsText(p.bestFriends, level.friends.length) : '',
      };
    }), (i) => this.startLevel(i));
    this.ui.show('levels');
  }

  /** Leaves a run: story runs go back to the level list, free runs to the main menu. */
  leaveRun(): void {
    if (this.levelIndex >= 0) this.showLevels(); else this.showMenu();
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
    const run = this.run, score = run.score;
    this.savedCoins += run.coins;
    saveCoins(this.savedCoins);
    let newBest = false;
    let story: Parameters<Screens['showResults']>[0]['story'] = null;
    if (this.levelIndex < 0) {
      if (score > this.best) { this.best = score; saveBest(score); newBest = score > 0; }
    } else {
      const level = LEVELS[this.levelIndex];
      if (run.won) { this.progress = recordWin(this.progress, level.id, run.friendsAboard, score); saveProgress(this.progress); }
      story = { won: run.won, friends: run.friendsAboard, total: run.friends.length, hasNext: this.levelIndex + 1 < LEVELS.length };
    }
    this.ui.showResults({ score, distance: distance(run), coins: run.coins, newBest, story });
    this.state = 'over';
    this.ui.show('over');
  }

  toggleSound(): void {
    this.sfx.unlock();
    this.sfx.setMuted(!this.sfx.muted);
    this.ui.setMuted(this.sfx.muted);
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
      if (ev.crashed) { this.state = 'crash'; this.ui.pop(TEXT.ouch, 0, true); this.sfx.crash(); }
      for (const c of ev.coins) { coinBurst(this.parts, c.x, c.y); this.sfx.coin(); }
      // thump on touchdown after a real jump, louder when falling faster
      if (this.prevAir > 0.3 && run.car.air === 0) this.sfx.land(-run.car.vy / 8);
      this.prevAir = run.car.air;
      for (const fr of ev.friends) {
        this.ui.pop(TEXT.friendAboard, 0, true);
        this.sfx.friend();
        friendBurst(this.parts, fr.x, fr.y);
      }
      for (const e of ev.score) {
        const p = describeScore(e);
        this.ui.pop(p.text, e.points, p.small);
        if (e.kind === 'flip') this.sfx.flip(e.count);
        else if (e.kind === 'landing') this.sfx.cleanLanding();
        else if (e.kind === 'airtime') this.sfx.airtime();
        else this.sfx.wheelie();
      }
      if (ev.won) this.sfx.win();
      if (ev.finished) this.finishRun();
      emitDriving(this.parts, run.car, dt, input.thr > 0 && this.state === 'play');
      this.ui.setHud(run.score, distance(run), run.coins);
      this.updateStoryHud();
    }
    updateParticles(this.parts, dt);
    followCar(this.cam, run.car, dt);
  }

  get currentGarage(): Readonly<Garage> {
    return this.garage;
  }

  /** Changes the driver or the paint; the car behind the menu updates at once. */
  setGarage(change: Partial<Garage>): void {
    this.garage = { ...this.garage, ...change };
    saveGarage(this.garage);
    if (this.state === 'menu') this.run.shape = carShapeFor(animalById(this.garage.driver));
  }

  showCharacters(): void {
    if (this.state !== 'menu') return;
    this.refreshCharacters();
    this.ui.show('characters');
  }

  private refreshCharacters(): void {
    this.ui.showCharacters({
      drivers: ANIMALS.map((a) => ({ id: a.id, ...animalText(a.id) })),
      colors: CAR_COLORS.map((c) => ({ id: c.id, name: CAR_COLOR_NAMES[c.id] ?? c.id, swatch: c.body })),
      driver: this.garage.driver,
      color: this.garage.carColor,
      coins: this.savedCoins,
      paintDriver: (canvas, id) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const S = canvas.height / 1.9;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(S, 0, 0, -S, canvas.width * 0.5, canvas.height * 0.92);
        drawAnimalStanding(ctx, animalById(id), 0, 0, 0.3);
      },
      paintCar: (canvas) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const S = canvas.height / 2.1, car = newCar(0);
        car.x = 0; car.y = 0;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(S, 0, 0, -S, canvas.width * 0.5, canvas.height * 0.6);
        const driver = animalById(this.garage.driver);
        drawCar(ctx, car, [0.4, 0.4], carShapeFor(driver), { driver, color: carColorById(this.garage.carColor) });
      },
      pickDriver: (id) => { this.setGarage({ driver: id }); this.refreshCharacters(); },
      pickColor: (id) => { this.setGarage({ carColor: id }); this.refreshCharacters(); },
    });
  }

  private look(): SceneLook {
    return {
      world: worldById(this.run.mode.world),
      car: { driver: animalById(this.garage.driver), color: carColorById(this.garage.carColor) },
    };
  }

  private updateStoryHud(): void {
    const run = this.run, finish = run.mode.finish;
    this.ui.setStoryHud(finish ? {
      friends: run.friendsAboard,
      total: run.friends.length,
      progress: clamp((run.car.x - run.startX) / (finish.x - run.startX), 0, 1),
    } : null);
  }

  private readonly frame = (now: number): void => {
    const dt = Math.min(GAME.maxFrame, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (this.state !== 'paused') this.update(dt);
    const car = this.run.car;
    this.sfx.engine(Math.hypot(car.vx, car.vy), this.state === 'play' ? this.input().thr : 0, this.state === 'play' || this.state === 'crash');
    renderFrame(this.ctx, this.screen, this.cam, this.run, this.parts, now / 1000, this.look());
    requestAnimationFrame(this.frame);
  };
}
