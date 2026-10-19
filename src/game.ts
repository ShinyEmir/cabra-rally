// Main loop and game state machine: menu (home, modes, levels, characters), play, paused, crash, over.
// Physics runs at a fixed 1/240 s step inside updateRun(); drawing runs at the display rate.
import { ANIMALS, animalById, friendAnimal, type AnimalSpec } from './core/animals';
import { LEVELS, storyMode } from './core/levels';
import { clamp } from './core/math';
import { FREE_MODE, type ModeSpec } from './core/modes';
import { isUnlocked, recordWin, sanitizeProgress, type StoryProgress } from './core/progress';
import { CHALLENGES, challengeValue, sanitizeChallenges, updateChallenges, type ChallengeContext, type ChallengeProgress } from './core/challenges';
import { accessoryById, buy, equipAccessory, isOwned, sanitizeShop, SHOP_ITEMS, type ShopState } from './core/shop';
import { newCar } from './core/physics';
import { carShapeFor } from './core/vehicle';
import { loadGarage, saveGarage, type Garage } from './garage';
import { createRun, distance, updateRun, type DriveInput, type Run } from './core/run';
import type { Sfx } from './audio/sfx';
import type { KeyState } from './input/keyboard';
import type { TouchState } from './input/pedals';
import { combineHeld, heldFromKeys, loadControls, saveControls, toDriveInput, type ControlSettings } from './input/scheme';
import { followCar, measureScreen, type Camera, type Screen } from './render/camera';
import { drawAnimalHead, drawAnimalStanding } from './render/draw-animal';
import { CAR_COLORS, carColorById, drawCar } from './render/draw-car';
import { renderFrame, type SceneLook } from './render/draw-world';
import { worldById } from './render/worlds';
import { coinBurst, emitDriving, friendBurst, updateParticles, type Particle } from './render/particles';
import type { Screens, View } from './ui/screens';
import { ACCESSORY_NAMES, animalText, CAR_COLOR_NAMES, challengesSummaryText, challengeText, describeScore, friendsText, levelFacts, levelName, levelNumber, TEXT } from './ui/strings';

export type GameState = 'menu' | 'play' | 'paused' | 'crash' | 'over';

const GAME = {
  /** Longest frame the simulation accepts, in seconds. */
  maxFrame: 0.05,
  bestKey: 'cabra-rally-best',
  storyKey: 'cabra-rally-story',
  coinsKey: 'cabra-rally-coins',
  distanceKey: 'cabra-rally-best-distance',
  shopKey: 'cabra-rally-shop',
  challengesKey: 'cabra-rally-challenges',
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

/** A saved whole number that is never negative (coins, distance). */
function loadCount(key: string): number {
  try {
    const v = parseInt(localStorage.getItem(key) || '0', 10);
    return isNaN(v) || v < 0 ? 0 : v;
  } catch {
    return 0;
  }
}

function saveCount(key: string, n: number): void {
  try { localStorage.setItem(key, String(n)); } catch { /* storage may be unavailable */ }
}

/** Reads saved JSON through a sanitizer; broken or missing data gives the sanitizer's defaults. */
function loadJson<T>(key: string, sanitize: (raw: unknown) => T): T {
  try { return sanitize(JSON.parse(localStorage.getItem(key) || '{}')); } catch { return sanitize({}); }
}

function saveJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage may be unavailable */ }
}

/** Clears a menu canvas and returns its context, or null when canvas drawing is unavailable. */
function paintStart(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
  return ctx;
}

/** A round portrait: the animal's head, a bit left of center so snouts and beaks fit. */
function paintHead(canvas: HTMLCanvasElement, a: AnimalSpec, accessory: ReturnType<typeof accessoryById> = null): void {
  const ctx = paintStart(canvas);
  if (!ctx) return;
  const big = a.snout === 'beakBig';
  const S = canvas.height / (big ? 1.25 : 0.95);
  ctx.setTransform(S, 0, 0, -S, canvas.width * (big ? 0.36 : 0.44), canvas.height * 0.54);
  drawAnimalHead(ctx, a, 0, 0, 0.3, 1, accessory);
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
  /** Coins kept across runs, spent in the shop. */
  private savedCoins = loadCount(GAME.coinsKey);
  private shop: ShopState = loadJson(GAME.shopKey, sanitizeShop);
  private challenges: ChallengeProgress = loadJson(GAME.challengesKey, sanitizeChallenges);
  /** Challenges met during the current run, for the results screen. */
  private runChallenges: Array<{ text: string; reward: number }> = [];
  private shopTab: 'accessory' | 'paint' = 'accessory';
  /** Longest free mode run, in meters. */
  private bestDistance = loadCount(GAME.distanceKey);
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
    this.runChallenges = [];
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
    this.ui.setCoins(this.savedCoins);
    this.ui.show('menu');
    const driver = animalById(this.garage.driver);
    this.ui.setHome({ driverName: animalText(driver.id).name, best: this.best, paintAvatar: (c) => paintHead(c, driver, accessoryById(this.shop.accessory)) });
  }

  /** Mode select: story or free mode, each with a drawing and the player's progress. */
  showModes(): void {
    this.state = 'menu';
    this.run.phase = 'idle';
    this.ui.setCoins(this.savedCoins);
    this.ui.show('modes');
    this.ui.showModes({
      levelsDone: LEVELS.filter((l) => this.progress[l.id]?.done).length,
      levelsTotal: LEVELS.length,
      best: this.best,
      paintStory: (canvas) => {
        const ctx = paintStart(canvas);
        if (!ctx) return;
        const S = canvas.height / 2.1;
        for (let i = 0; i < 3; i++) {
          ctx.setTransform(S, 0, 0, -S, canvas.width * (0.24 + i * 0.27), canvas.height * 0.86);
          drawAnimalStanding(ctx, friendAnimal(i), 0, 0, 0.6 + i);
        }
      },
      paintFree: (canvas) => {
        const ctx = paintStart(canvas);
        if (!ctx) return;
        const S = canvas.height / 2.2, car = newCar(0);
        car.x = 0; car.y = 0;
        ctx.setTransform(S, 0, 0, -S, canvas.width * 0.5, canvas.height * 0.62);
        const driver = animalById(this.garage.driver);
        drawCar(ctx, car, [0.4, 0.4], carShapeFor(driver), { driver, color: carColorById(this.garage.carColor), accessory: accessoryById(this.shop.accessory) });
      },
    });
  }

  showLevels(): void {
    this.state = 'menu';
    this.run.phase = 'idle';
    this.ui.setCoins(this.savedCoins);
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
        tint: [worldById(level.world).sky[0], worldById(level.world).hills[2]],
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
    saveCount(GAME.coinsKey, this.savedCoins);
    let newBest = false;
    let story: Parameters<Screens['showResults']>[0]['story'] = null;
    if (this.levelIndex < 0) {
      if (score > this.best) { this.best = score; saveBest(score); newBest = score > 0; }
      if (distance(run) > this.bestDistance) { this.bestDistance = distance(run); saveCount(GAME.distanceKey, this.bestDistance); }
    } else {
      const level = LEVELS[this.levelIndex];
      if (run.won) { this.progress = recordWin(this.progress, level.id, run.friendsAboard, score); saveProgress(this.progress); }
      story = { won: run.won, friends: run.friendsAboard, total: run.friends.length, hasNext: this.levelIndex + 1 < LEVELS.length };
    }
    // story totals only change here, after the win is recorded
    this.checkChallenges(false);
    this.ui.showResults({ score, distance: distance(run), coins: run.coins, newBest, story, challenges: this.runChallenges });
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
      if (this.state === 'play') this.checkChallenges(true);
      if (ev.finished) this.finishRun();
      emitDriving(this.parts, run.car, dt, input.thr > 0 && this.state === 'play');
      this.ui.setHud(run.score, distance(run), run.coins);
      this.updateStoryHud();
    }
    updateParticles(this.parts, dt);
    followCar(this.cam, run.car, dt);
  }

  private challengeContext(): ChallengeContext {
    const run = this.run;
    return {
      mode: this.levelIndex < 0 ? 'free' : 'story',
      distance: distance(run),
      coins: run.coins,
      maxFlips: run.stats.maxFlips,
      maxJump: run.stats.maxJump,
      maxWheelie: run.stats.maxWheelie,
      levelsDone: LEVELS.filter((l) => this.progress[l.id]?.done).length,
      levelsWithAllFriends: LEVELS.filter((l) => (this.progress[l.id]?.bestFriends ?? 0) >= l.friends.length).length,
    };
  }

  /** Pays challenges met for the first time; during a run it also announces them. */
  private checkChallenges(announce: boolean): void {
    const r = updateChallenges(CHALLENGES, this.challenges, this.challengeContext());
    if (r.completed.length === 0) {
      // keep the best values even without a completion
      this.challenges = r.progress;
      return;
    }
    this.challenges = r.progress;
    saveJson(GAME.challengesKey, this.challenges);
    for (const c of r.completed) {
      this.savedCoins += c.reward;
      this.runChallenges.push({ text: challengeText(c.kind, c.target), reward: c.reward });
      if (announce) this.ui.pop(TEXT.challengeDone, c.reward, false);
    }
    saveCount(GAME.coinsKey, this.savedCoins);
    if (announce) this.sfx.cleanLanding();
  }

  showChallenges(): void {
    if (this.state !== 'menu') return;
    saveJson(GAME.challengesKey, this.challenges);
    this.ui.setCoins(this.savedCoins);
    this.ui.show('challenges');
    const done = new Set(this.challenges.done);
    this.ui.showChallenges(CHALLENGES.map((c) => ({
      text: challengeText(c.kind, c.target),
      reward: c.reward,
      value: Math.max(this.challenges.best[c.id] ?? 0, c.kind === 'levelsDone' || c.kind === 'allFriends' ? challengeValue(c, this.challengeContext()) : 0),
      target: c.target,
      done: done.has(c.id),
    })), challengesSummaryText(done.size, CHALLENGES.length));
  }

  showShop(tab: 'accessory' | 'paint' = this.shopTab): void {
    if (this.state !== 'menu') return;
    this.shopTab = tab;
    this.ui.setCoins(this.savedCoins);
    this.ui.show('shop');
    const driver = animalById(this.garage.driver);
    this.ui.showShop({
      tab,
      cards: SHOP_ITEMS.filter((i) => i.kind === tab).map((i) => ({
        id: i.id,
        name: (tab === 'accessory' ? ACCESSORY_NAMES[i.id] : CAR_COLOR_NAMES[i.id]) ?? i.id,
        price: i.price,
        owned: isOwned(this.shop, i.id),
        inUse: tab === 'accessory' ? this.shop.accessory === i.id : this.garage.carColor === i.id,
        affordable: this.savedCoins >= i.price,
      })),
      paint: (canvas, id) => {
        const ctx = paintStart(canvas);
        if (!ctx) return;
        if (tab === 'accessory') {
          const S = canvas.height / 1.15;
          ctx.setTransform(S, 0, 0, -S, canvas.width * 0.46, canvas.height * 0.62);
          drawAnimalHead(ctx, driver, 0, 0, 0.3, 1, accessoryById(id));
        } else {
          const S = canvas.height / 2.2, car = newCar(0);
          car.x = 0; car.y = 0;
          ctx.setTransform(S, 0, 0, -S, canvas.width * 0.5, canvas.height * 0.62);
          drawCar(ctx, car, [0.4, 0.4], carShapeFor(driver), { driver, color: carColorById(id), accessory: accessoryById(this.shop.accessory) });
        }
      },
      pickTab: (t) => this.showShop(t),
      act: (id) => this.shopAction(id),
    });
  }

  /** Buys the item, or wears/takes off an accessory, or chooses a paint. */
  private shopAction(id: string): void {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    if (!item) return;
    if (!isOwned(this.shop, id)) {
      const r = buy(this.shop, item, this.savedCoins);
      if (!r) return;
      this.shop = r.state;
      this.savedCoins = r.coins;
      saveCount(GAME.coinsKey, this.savedCoins);
      this.sfx.coin();
      // wear or use what was just bought
      if (item.kind === 'accessory') this.shop = equipAccessory(this.shop, id);
      else this.setGarage({ carColor: id });
    } else if (item.kind === 'accessory') {
      this.shop = equipAccessory(this.shop, this.shop.accessory === id ? null : id);
    } else {
      this.setGarage({ carColor: id });
    }
    saveJson(GAME.shopKey, this.shop);
    this.showShop(item.kind);
  }

  /** Car paints the player can use: the free ones plus those bought. */
  private availableColors(): typeof CAR_COLORS[number][] {
    return CAR_COLORS.filter((c) => !SHOP_ITEMS.some((i) => i.id === c.id) || isOwned(this.shop, c.id));
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
    this.ui.setCoins(this.savedCoins);
    this.ui.show('characters');
    this.refreshCharacters();
  }

  private refreshCharacters(): void {
    this.ui.showCharacters({
      drivers: ANIMALS.map((a) => ({ id: a.id, ...animalText(a.id) })),
      colors: this.availableColors().map((c) => ({ id: c.id, name: CAR_COLOR_NAMES[c.id] ?? c.id, swatch: c.body })),
      driver: this.garage.driver,
      color: this.garage.carColor,
      best: this.best,
      bestDistance: this.bestDistance,
      paintAvatar: (canvas, id) => paintHead(canvas, animalById(id), accessoryById(this.shop.accessory)),
      paintDriver: (canvas, id) => {
        const ctx = paintStart(canvas);
        if (!ctx) return;
        const S = canvas.height / 1.75;
        ctx.setTransform(S, 0, 0, -S, canvas.width * 0.54, canvas.height * 0.9);
        drawAnimalStanding(ctx, animalById(id), 0, 0, 0.3, accessoryById(this.shop.accessory));
      },
      paintCar: (canvas) => {
        const ctx = paintStart(canvas);
        if (!ctx) return;
        const S = canvas.height / 2.15, car = newCar(0);
        car.x = 0; car.y = 0;
        ctx.setTransform(S, 0, 0, -S, canvas.width * 0.5, canvas.height * 0.6);
        const driver = animalById(this.garage.driver);
        drawCar(ctx, car, [0.4, 0.4], carShapeFor(driver), { driver, color: carColorById(this.garage.carColor), accessory: accessoryById(this.shop.accessory) });
      },
      pickDriver: (id) => { this.setGarage({ driver: id }); this.refreshCharacters(); },
      pickColor: (id) => { this.setGarage({ carColor: id }); this.refreshCharacters(); },
    });
  }

  private look(): SceneLook {
    return {
      world: worldById(this.run.mode.world),
      car: { driver: animalById(this.garage.driver), color: carColorById(this.garage.carColor), accessory: accessoryById(this.shop.accessory) },
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
