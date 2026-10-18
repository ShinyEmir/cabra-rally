// DOM side of the interface: menu, HUD, floating score texts, pause and results.
import { bestLine, coinsText, formatNumber, metersText, TEXT, type TextKey } from './strings';

export type View = 'menu' | 'play' | 'pause' | 'over';

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
  readonly gasPedal = byId('padGas');
  readonly brakePedal = byId('padBrake');
  readonly btnFree = byId<HTMLButtonElement>('btnFree');
  readonly btnPause = byId<HTMLButtonElement>('btnPause');
  readonly btnResume = byId<HTMLButtonElement>('btnResume');
  readonly btnQuit = byId<HTMLButtonElement>('btnQuit');
  readonly btnRetry = byId<HTMLButtonElement>('btnRetry');
  readonly btnMenu = byId<HTMLButtonElement>('btnMenu');

  private readonly menu = byId('menu');
  private readonly over = byId('over');
  private readonly pauseView = byId('pauseView');
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
    const playing = view === 'play' || view === 'pause';
    this.hud.hidden = !playing;
    this.pads.hidden = !playing;
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
