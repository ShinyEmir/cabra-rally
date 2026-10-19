// DOM side of the interface: menu, level select, HUD, floating texts, pause, results and controls.
import type { TouchButtons } from '../input/pedals';
import type { ButtonSize, ControlSettings } from '../input/scheme';
import { bestLine, coinsText, formatNumber, friendsText, metersText, savedCoinsText, TEXT, type TextKey } from './strings';

export type View = 'menu' | 'levels' | 'characters' | 'play' | 'pause' | 'over' | 'controls';

/** Scale of the touch buttons for each size option; large is the original size. */
const BUTTON_SCALE: Readonly<Record<ButtonSize, number>> = { small: 0.72, medium: 0.85, large: 1 };

const POPS = {
  /** At most this many floating texts at once. */
  max: 4,
  lifeMs: 1300,
} as const;

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el as T;
}

export interface Results {
  score: number;
  distance: number;
  coins: number;
  newBest: boolean;
  /** Story runs only. */
  story: { won: boolean; friends: number; total: number; hasNext: boolean } | null;
}

/** What the characters screen shows; painting is done by the caller (the game owns drawing). */
export interface GarageView {
  drivers: ReadonlyArray<{ id: string; name: string; trait: string }>;
  colors: ReadonlyArray<{ id: string; name: string; swatch: string }>;
  driver: string;
  color: string;
  coins: number;
  paintDriver(canvas: HTMLCanvasElement, id: string): void;
  paintCar(canvas: HTMLCanvasElement): void;
  pickDriver(id: string): void;
  pickColor(id: string): void;
}

/** One card in the level select screen. */
export interface LevelCard {
  number: string;
  name: string;
  facts: string;
  unlocked: boolean;
  /** Shown under the facts, for example the best result. */
  status: string;
  done: boolean;
}

export class Screens {
  readonly canvas = byId<HTMLCanvasElement>('world');
  readonly touchButtons: TouchButtons = {
    gas: byId('padGas'),
    brake: byId('padBrake'),
    tiltBack: byId('padBack'),
    tiltForward: byId('padForward'),
  };
  readonly btnFree = byId<HTMLButtonElement>('btnFree');
  readonly btnStory = byId<HTMLButtonElement>('btnStory');
  readonly btnNext = byId<HTMLButtonElement>('btnNext');
  readonly btnLevelsBack = byId<HTMLButtonElement>('btnLevelsBack');
  readonly btnCharacters = byId<HTMLButtonElement>('btnCharacters');
  readonly btnSound = byId<HTMLButtonElement>('btnSound');
  readonly btnMenuSound = byId<HTMLButtonElement>('btnMenuSound');
  readonly btnCharactersDone = byId<HTMLButtonElement>('btnCharactersDone');
  readonly btnPause = byId<HTMLButtonElement>('btnPause');
  readonly btnResume = byId<HTMLButtonElement>('btnResume');
  readonly btnQuit = byId<HTMLButtonElement>('btnQuit');
  readonly btnRetry = byId<HTMLButtonElement>('btnRetry');
  readonly btnMenu = byId<HTMLButtonElement>('btnMenu');
  readonly btnControls = byId<HTMLButtonElement>('btnControls');
  readonly btnPauseControls = byId<HTMLButtonElement>('btnPauseControls');
  readonly btnControlsDone = byId<HTMLButtonElement>('btnControlsDone');
  readonly optClassic = byId<HTMLButtonElement>('optClassic');
  readonly optArrows = byId<HTMLButtonElement>('optArrows');
  readonly optSideNormal = byId<HTMLButtonElement>('optSideNormal');
  readonly optSideSwap = byId<HTMLButtonElement>('optSideSwap');
  readonly optSize: Readonly<Record<ButtonSize, HTMLButtonElement>> = {
    small: byId<HTMLButtonElement>('optSizeSmall'),
    medium: byId<HTMLButtonElement>('optSizeMedium'),
    large: byId<HTMLButtonElement>('optSizeLarge'),
  };
  readonly optOpacity = byId<HTMLInputElement>('optOpacity');
  private readonly opacityValue = byId('opacityValue');

  private readonly menu = byId('menu');
  private readonly over = byId('over');
  private readonly pauseView = byId('pauseView');
  private readonly controlsView = byId('controlsView');
  private readonly levelsView = byId('levelsView');
  private readonly charactersView = byId('charactersView');
  private readonly driverList = byId('driverList');
  private readonly colorList = byId('colorList');
  private readonly carPreview = byId<HTMLCanvasElement>('carPreview');
  private readonly garageCoins = byId('garageCoins');
  private readonly coinTotal = byId('coinTotal');
  private readonly levelList = byId('levelList');
  private readonly progBox = byId('progBox');
  private readonly progFill = byId('progFill');
  private readonly overExtra = byId('overExtra');
  private readonly howTo = byId('howTo');
  private readonly controlsHow = byId('controlsHow');
  private readonly sideNormalText = byId('sideNormalText');
  private readonly sideSwapText = byId('sideSwapText');
  private readonly layoutPreview = byId('layoutPreview');
  private readonly hud = byId('hud');
  private readonly pads = byId('pads');
  private readonly pops = byId('pops');
  private readonly bestEl = byId('bestLine');
  private readonly newBestEl = byId('newBest');
  private readonly lastShown = new Map<HTMLElement, string>();
  private readonly fields = {
    score: byId('score'),
    dist: byId('dist'),
    coins: byId('coins'),
    overTitle: byId('overTitle'),
    overScore: byId('overScore'),
    overDist: byId('overDist'),
    overCoins: byId('overCoins'),
    overFriends: byId('overFriends'),
    friendTxt: byId('friendTxt'),
  };

  constructor() {
    // static texts come from strings.ts
    for (const el of document.querySelectorAll<HTMLElement>('[data-t]')) el.textContent = TEXT[el.dataset.t as TextKey];
    for (const el of document.querySelectorAll<HTMLElement>('[data-t-label]')) el.setAttribute('aria-label', TEXT[el.dataset.tLabel as TextKey]);
  }

  show(view: View): void {
    this.menu.hidden = view !== 'menu';
    this.over.hidden = view !== 'over';
    this.pauseView.hidden = view !== 'pause';
    this.controlsView.hidden = view !== 'controls';
    this.levelsView.hidden = view !== 'levels';
    this.charactersView.hidden = view !== 'characters';
    const playing = view === 'play' || view === 'pause';
    this.hud.hidden = !playing;
    // the buttons stay visible behind the controls screen, so changes show live
    this.pads.hidden = !playing && view !== 'controls';
  }

  /** Lays out the touch buttons and updates every text that depends on the control settings. */
  applyControls(c: Readonly<ControlSettings>): void {
    const arrows = c.scheme === 'arrows';
    this.pads.classList.toggle('classic', !arrows);
    this.pads.classList.toggle('with-arrows', arrows);
    this.pads.classList.toggle('swapped', c.swapSides);
    const how = arrows ? TEXT.howToArrows : TEXT.howTo;
    this.howTo.textContent = how;
    this.controlsHow.textContent = how;
    this.sideNormalText.textContent = arrows ? TEXT.sideArrowsNormal : TEXT.sideClassicNormal;
    this.sideSwapText.textContent = arrows ? TEXT.sideArrowsSwapped : TEXT.sideClassicSwapped;
    const mark = (el: HTMLButtonElement, on: boolean) => { el.classList.toggle('selected', on); el.setAttribute('aria-checked', String(on)); };
    mark(this.optClassic, !arrows);
    mark(this.optArrows, arrows);
    mark(this.optSideNormal, !c.swapSides);
    mark(this.optSideSwap, c.swapSides);
    for (const size of Object.keys(this.optSize) as ButtonSize[]) mark(this.optSize[size], c.size === size);
    this.pads.style.setProperty('--pad-scale', String(BUTTON_SCALE[c.size]));
    this.pads.style.setProperty('--pad-opacity', String(c.opacity));
    this.optOpacity.value = String(c.opacity);
    this.opacityValue.textContent = Math.round(c.opacity * 100) + '%';
    // small left-to-right sketch of where each button sits
    const pedals = [TEXT.brake, TEXT.gas];
    let order: string[];
    if (!arrows) order = c.swapSides ? [TEXT.gas, '', TEXT.brake] : [TEXT.brake, '', TEXT.gas];
    else order = c.swapSides ? ['<', '>', '', ...pedals] : [...pedals, '', '<', '>'];
    this.layoutPreview.replaceChildren(...order.map((t) => {
      const chip = document.createElement('span');
      chip.className = t === '' ? 'gap' : t.length === 1 ? 'chip arrow-chip' : 'chip';
      chip.textContent = t;
      return chip;
    }));
  }

  setBest(best: number): void {
    this.bestEl.hidden = best <= 0;
    this.bestEl.textContent = bestLine(best);
  }

  /** Only touches the DOM when a value changes. */
  private set(el: HTMLElement, v: string): void {
    if (this.lastShown.get(el) !== v) { this.lastShown.set(el, v); el.textContent = v; }
  }

  setHud(score: number, distance: number, coins: number): void {
    this.set(this.fields.score, formatNumber(score));
    this.set(this.fields.dist, metersText(distance));
    this.set(this.fields.coins, coinsText(coins));
  }

  /** Fills the level select screen; onPick receives the level's position in the list. */
  showLevels(cards: readonly LevelCard[], onPick: (index: number) => void): void {
    this.levelList.replaceChildren(...cards.map((c, i) => {
      const b = document.createElement('button');
      b.className = 'level' + (c.done ? ' done' : '') + (c.unlocked ? '' : ' locked');
      b.disabled = !c.unlocked;
      const num = document.createElement('small');
      num.textContent = c.number;
      const name = document.createElement('span');
      name.className = 'level-name';
      name.textContent = c.name;
      const facts = document.createElement('small');
      facts.textContent = c.facts;
      const status = document.createElement('em');
      status.textContent = c.status;
      b.append(num, name, facts, status);
      b.addEventListener('click', () => onPick(i));
      return b;
    }));
    // bring the next level to play into view (the first open one not done yet, else the last open one)
    const next = cards.findIndex((c) => c.unlocked && !c.done);
    const target = next >= 0 ? next : cards.map((c) => c.unlocked).lastIndexOf(true);
    requestAnimationFrame(() => {
      const list = this.levelList, el = list.children[target] as HTMLElement | undefined;
      if (el) list.scrollLeft = el.offsetLeft - (list.clientWidth - el.offsetWidth) / 2;
    });
  }

  setMuted(muted: boolean): void {
    this.btnSound.classList.toggle('muted', muted);
    this.btnSound.setAttribute('aria-label', muted ? TEXT.unmuteLabel : TEXT.muteLabel);
    this.btnMenuSound.textContent = muted ? TEXT.soundOff : TEXT.soundOn;
  }

  /** Saved coins under the menu buttons; hidden while there are none. */
  setCoinTotal(n: number): void {
    this.coinTotal.hidden = n <= 0;
    this.coinTotal.textContent = savedCoinsText(n);
  }

  /** Fills the characters screen. Call again after a pick to refresh the marks and the preview. */
  showCharacters(g: GarageView): void {
    const firstTime = this.driverList.children.length === 0;
    if (firstTime) {
      this.driverList.replaceChildren(...g.drivers.map((d) => {
        const b = document.createElement('button');
        b.className = 'driver';
        b.setAttribute('role', 'radio');
        b.dataset.id = d.id;
        const canvas = document.createElement('canvas');
        canvas.width = 220; canvas.height = 190;
        canvas.setAttribute('aria-hidden', 'true');
        const name = document.createElement('span');
        name.className = 'driver-name';
        name.textContent = d.name;
        const trait = document.createElement('small');
        trait.textContent = d.trait;
        b.append(canvas, name, trait);
        b.addEventListener('click', () => g.pickDriver(d.id));
        g.paintDriver(canvas, d.id);
        return b;
      }));
      this.colorList.replaceChildren(...g.colors.map((c) => {
        const b = document.createElement('button');
        b.className = 'swatch';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-label', c.name);
        b.title = c.name;
        b.dataset.id = c.id;
        b.style.setProperty('--swatch', c.swatch);
        b.addEventListener('click', () => g.pickColor(c.id));
        return b;
      }));
    }
    for (const el of this.driverList.children) {
      const on = (el as HTMLElement).dataset.id === g.driver;
      el.classList.toggle('selected', on); el.setAttribute('aria-checked', String(on));
    }
    for (const el of this.colorList.children) {
      const on = (el as HTMLElement).dataset.id === g.color;
      el.classList.toggle('selected', on); el.setAttribute('aria-checked', String(on));
    }
    this.garageCoins.textContent = savedCoinsText(g.coins);
    g.paintCar(this.carPreview);
    if (firstTime) {
      requestAnimationFrame(() => {
        const list = this.driverList, el = list.querySelector('.selected') as HTMLElement | null;
        if (el) list.scrollLeft = el.offsetLeft - (list.clientWidth - el.offsetWidth) / 2;
      });
    }
  }

  /** Friend counter and progress bar toward the stadium; null hides them (free mode). */
  setStoryHud(story: { friends: number; total: number; progress: number } | null): void {
    this.progBox.hidden = story === null;
    if (!story) return;
    this.set(this.fields.friendTxt, friendsText(story.friends, story.total));
    this.progFill.style.width = (story.progress * 100).toFixed(1) + '%';
  }

  showResults(r: Results): void {
    this.set(this.fields.overTitle, r.story?.won ? TEXT.wonTitle : TEXT.crashedTitle);
    this.overExtra.hidden = r.story === null;
    if (r.story) this.set(this.fields.overFriends, friendsText(r.story.friends, r.story.total));
    this.btnNext.hidden = !(r.story?.won && r.story.hasNext);
    this.btnMenu.textContent = r.story ? TEXT.levelsButton : TEXT.menu;
    this.set(this.fields.overScore, formatNumber(r.score));
    this.set(this.fields.overDist, metersText(r.distance));
    this.set(this.fields.overCoins, String(r.coins));
    this.newBestEl.hidden = !r.newBest;
  }

  pop(text: string, points: number, small: boolean): void {
    const box = this.pops;
    while (box.children.length > POPS.max - 1 && box.firstChild) box.removeChild(box.firstChild);
    const d = document.createElement('div');
    d.className = 'pop stroke' + (small ? ' small' : '');
    d.textContent = text;
    if (points) {
      const b = document.createElement('b');
      b.textContent = '+' + points;
      d.appendChild(b);
    }
    box.appendChild(d);
    setTimeout(() => d.remove(), POPS.lifeMs);
  }

  clearPops(): void {
    this.pops.textContent = '';
  }
}
