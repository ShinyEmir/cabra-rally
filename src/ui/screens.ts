// DOM side of the interface: menu, HUD, floating score texts, pause, results and controls.
import type { TouchButtons } from '../input/pedals';
import type { ControlSettings } from '../input/scheme';
import { bestLine, coinsText, formatNumber, metersText, TEXT, type TextKey } from './strings';

export type View = 'menu' | 'play' | 'pause' | 'over' | 'controls';

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

  private readonly menu = byId('menu');
  private readonly over = byId('over');
  private readonly pauseView = byId('pauseView');
  private readonly controlsView = byId('controlsView');
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
    const playing = view === 'play' || view === 'pause';
    this.hud.hidden = !playing;
    this.pads.hidden = !playing;
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

  showResults(r: Results): void {
    this.set(this.fields.overTitle, TEXT.crashedTitle);
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
