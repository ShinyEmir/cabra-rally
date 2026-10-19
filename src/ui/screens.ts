// DOM side of the interface: home, mode select, level select, profile and characters, HUD,
// floating texts, pause, results and controls. Drawing on the small canvases is done by the
// caller through paint callbacks, because the game owns the drawing code.
import type { TouchButtons } from '../input/pedals';
import type { ButtonSize, ControlSettings } from '../input/scheme';
import { bestLine, coinsText, formatNumber, freeBestText, friendsText, metersText, starsText, storyProgressText, TEXT, type TextKey } from './strings';

export type View = 'menu' | 'modes' | 'levels' | 'characters' | 'shop' | 'challenges' | 'play' | 'pause' | 'over' | 'controls';

/** One card in the shop. */
export interface ShopCard {
  id: string;
  name: string;
  price: number;
  owned: boolean;
  /** Worn (accessory) or chosen (paint) right now. */
  inUse: boolean;
  affordable: boolean;
}

export interface ShopView {
  tab: 'accessory' | 'paint';
  cards: readonly ShopCard[];
  paint(canvas: HTMLCanvasElement, id: string): void;
  pickTab(tab: 'accessory' | 'paint'): void;
  /** Buy, wear, take off or choose, depending on the card's state. */
  act(id: string): void;
}

export interface ChallengeRow {
  text: string;
  reward: number;
  value: number;
  target: number;
  done: boolean;
}

/** Scale of the touch buttons for each size option; large is the original size. */
const BUTTON_SCALE: Readonly<Record<ButtonSize, number>> = { small: 0.72, medium: 0.85, large: 1 };

const POPS = {
  /** At most this many floating texts at once. */
  max: 4,
  lifeMs: 1300,
} as const;

const SVG_NS = 'http://www.w3.org/2000/svg';
const STAR_PATH = 'M12 2.2l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.2l-6.1 3.5 1.5-6.8-5.2-4.7 6.9-.7z';

/** A star drawn in SVG, filled when earned. */
function starIcon(on: boolean): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('star', on ? 'on' : 'off');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', STAR_PATH);
  svg.append(path);
  return svg;
}

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el as T;
}

export type Painter = (canvas: HTMLCanvasElement) => void;

export interface Results {
  score: number;
  distance: number;
  coins: number;
  newBest: boolean;
  /** Story runs only. */
  story: { won: boolean; friends: number; total: number; hasNext: boolean; stars: readonly StarLine[] } | null;
  /** Challenges met during this run, already worded. */
  challenges: ReadonlyArray<{ text: string; reward: number }>;
}

/** One of a level's stars in the results: what it asks for and whether it is earned. */
export interface StarLine {
  text: string;
  on: boolean;
  /** Earned in this run for the first time. */
  isNew: boolean;
}

export interface HomeView {
  driverName: string;
  best: number;
  paintAvatar: Painter;
}

export interface ModesView {
  levelsDone: number;
  levelsTotal: number;
  stars: number;
  starsTotal: number;
  best: number;
  paintStory: Painter;
  paintFree: Painter;
}

/** What the profile and characters screen shows. */
export interface GarageView {
  drivers: ReadonlyArray<{ id: string; name: string; trait: string }>;
  colors: ReadonlyArray<{ id: string; name: string; swatch: string }>;
  driver: string;
  color: string;
  best: number;
  bestDistance: number;
  paintDriver(canvas: HTMLCanvasElement, id: string): void;
  paintAvatar(canvas: HTMLCanvasElement, id: string): void;
  paintCar: Painter;
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
  /** Sky and hill colors of the level's world, for the band on top of the card. */
  tint: readonly [string, string];
  /** Earned stars, in order; empty for locked levels. */
  stars: readonly boolean[];
  /** What the stars ask for, read aloud and shown on hover. */
  goals: string;
}

/** Sizes a canvas to its displayed size times the device pixel ratio, for crisp drawings. */
export function fitCanvas(canvas: HTMLCanvasElement): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round((canvas.clientWidth || canvas.width) * dpr), h = Math.round((canvas.clientHeight || canvas.height) * dpr);
  if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; }
}

export class Screens {
  readonly canvas = byId<HTMLCanvasElement>('world');
  readonly touchButtons: TouchButtons = {
    gas: byId('padGas'),
    brake: byId('padBrake'),
    tiltBack: byId('padBack'),
    tiltForward: byId('padForward'),
  };
  readonly btnPlay = byId<HTMLButtonElement>('btnPlay');
  readonly btnProfile = byId<HTMLButtonElement>('btnProfile');
  readonly btnHomeStory = byId<HTMLButtonElement>('btnHomeStory');
  readonly btnModesBack = byId<HTMLButtonElement>('btnModesBack');
  readonly btnFree = byId<HTMLButtonElement>('btnFree');
  readonly btnStory = byId<HTMLButtonElement>('btnStory');
  readonly btnNext = byId<HTMLButtonElement>('btnNext');
  readonly btnLevelsBack = byId<HTMLButtonElement>('btnLevelsBack');
  readonly btnCharacters = byId<HTMLButtonElement>('btnCharacters');
  readonly btnShop = byId<HTMLButtonElement>('btnShop');
  readonly btnShopBack = byId<HTMLButtonElement>('btnShopBack');
  readonly btnChallenges = byId<HTMLButtonElement>('btnChallenges');
  readonly btnChallengesBack = byId<HTMLButtonElement>('btnChallengesBack');
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

  private readonly views: Readonly<Record<string, HTMLElement>> = {
    menu: byId('menu'),
    modes: byId('modesView'),
    levels: byId('levelsView'),
    characters: byId('charactersView'),
    shop: byId('shopView'),
    challenges: byId('challengesView'),
    over: byId('over'),
    pause: byId('pauseView'),
    controls: byId('controlsView'),
  };
  private readonly coinEls = ['homeCoins', 'modesCoins', 'levelsCoins', 'garageCoins', 'shopCoins', 'challengesCoins'].map((id) => byId(id));
  private readonly shopEls = { items: byId('shopItems'), tabAccessories: byId<HTMLButtonElement>('tabAccessories'), tabPaints: byId<HTMLButtonElement>('tabPaints') };
  /** The last shop shown, so the tabs know whom to tell. */
  private shopView: ShopView | null = null;
  private readonly challengeEls = { list: byId('challengeList'), summary: byId('challengeSummary') };
  private readonly overChallenges = byId('overChallenges');
  private readonly home = { avatar: byId<HTMLCanvasElement>('homeAvatar'), driver: byId('homeDriver'), best: byId('bestLine') };
  private readonly modes = {
    story: byId<HTMLCanvasElement>('storyArt'), free: byId<HTMLCanvasElement>('freeArt'),
    progress: byId('storyProgress'), best: byId('freeBest'),
  };
  private readonly profile = {
    avatar: byId<HTMLCanvasElement>('profileAvatar'), name: byId('profileName'),
    best: byId('statBest'), dist: byId('statDist'),
    art: byId<HTMLCanvasElement>('driverArt'), driverName: byId('driverName'), trait: byId('driverTrait'),
    dots: byId('driverDots'), prev: byId<HTMLButtonElement>('driverPrev'), next: byId<HTMLButtonElement>('driverNext'),
    colors: byId('colorList'), car: byId<HTMLCanvasElement>('carPreview'), colorName: byId('colorName'),
  };
  /** The last garage shown, so the carousel arrows know where to go. */
  private garage: GarageView | null = null;
  private readonly levelList = byId('levelList');
  private readonly levelsStars = byId('levelsStars');
  private readonly overStars = byId('overStars');
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
    // driver carousel arrows cycle through the cast
    const step = (dir: number) => {
      const g = this.garage;
      if (!g) return;
      const i = g.drivers.findIndex((d) => d.id === g.driver);
      g.pickDriver(g.drivers[(i + dir + g.drivers.length) % g.drivers.length].id);
    };
    this.profile.prev.addEventListener('click', () => step(-1));
    this.profile.next.addEventListener('click', () => step(1));
    this.shopEls.tabAccessories.addEventListener('click', () => this.shopView?.pickTab('accessory'));
    this.shopEls.tabPaints.addEventListener('click', () => this.shopView?.pickTab('paint'));
  }

  /** Fills the shop. Call after show('shop') so the drawings get their real size. */
  showShop(v: ShopView): void {
    this.shopView = v;
    const tabs: Array<[HTMLButtonElement, boolean]> = [[this.shopEls.tabAccessories, v.tab === 'accessory'], [this.shopEls.tabPaints, v.tab === 'paint']];
    for (const [el, on] of tabs) { el.classList.toggle('selected', on); el.setAttribute('aria-selected', String(on)); }
    this.shopEls.items.replaceChildren(...v.cards.map((c) => {
      const card = document.createElement('div');
      card.className = 'shop-card' + (c.inUse ? ' in-use' : '');
      const canvas = document.createElement('canvas');
      canvas.width = 200; canvas.height = 150;
      canvas.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'shop-name';
      name.textContent = c.name;
      const button = document.createElement('button');
      button.className = 'shop-btn';
      if (!c.owned) {
        button.classList.add('buy');
        button.disabled = !c.affordable;
        const coin = document.createElement('i');
        coin.className = 'coin-icon';
        coin.setAttribute('aria-hidden', 'true');
        button.append(TEXT.buy + ' ', coin, ' ' + formatNumber(c.price));
      } else if (c.inUse) {
        button.textContent = v.tab === 'accessory' ? TEXT.remove : TEXT.equipped;
        button.classList.add('in-use');
        button.disabled = v.tab === 'paint';
      } else {
        button.textContent = TEXT.equip;
      }
      button.addEventListener('click', () => this.shopView?.act(c.id));
      card.append(canvas, name, button);
      return card;
    }));
    requestAnimationFrame(() => {
      v.cards.forEach((c, i) => {
        const canvas = this.shopEls.items.children[i]?.querySelector('canvas');
        if (canvas) { fitCanvas(canvas); v.paint(canvas, c.id); }
      });
    });
  }

  showChallenges(rows: readonly ChallengeRow[], summary: string): void {
    this.challengeEls.summary.textContent = summary;
    this.challengeEls.list.replaceChildren(...rows.map((r) => {
      const row = document.createElement('div');
      row.className = 'challenge' + (r.done ? ' done' : '');
      const text = document.createElement('span');
      text.className = 'challenge-text';
      text.textContent = r.text;
      const bar = document.createElement('div');
      bar.className = 'challenge-bar';
      const fill = document.createElement('i');
      fill.style.width = Math.min(100, (r.done ? 1 : r.value / r.target) * 100).toFixed(0) + '%';
      bar.append(fill);
      const reward = document.createElement('span');
      reward.className = 'challenge-reward';
      const coin = document.createElement('i');
      coin.className = 'coin-icon';
      coin.setAttribute('aria-hidden', 'true');
      reward.append(coin, (r.done ? '' : '+') + formatNumber(r.reward));
      row.append(text, reward, bar);
      return row;
    }));
  }

  show(view: View): void {
    for (const [name, el] of Object.entries(this.views)) el.hidden = name !== view;
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

  /** Only touches the DOM when a value changes. */
  private set(el: HTMLElement, v: string): void {
    if (this.lastShown.get(el) !== v) { this.lastShown.set(el, v); el.textContent = v; }
  }

  /** Saved coins, shown in the top bar of every menu screen. */
  setCoins(n: number): void {
    for (const el of this.coinEls) this.set(el, formatNumber(n));
  }

  setHome(h: HomeView): void {
    this.home.driver.textContent = h.driverName;
    this.home.best.hidden = h.best <= 0;
    this.home.best.textContent = bestLine(h.best);
    fitCanvas(this.home.avatar);
    h.paintAvatar(this.home.avatar);
  }

  /** Fills the mode select screen. Call after show('modes') so the drawings get their real size. */
  showModes(m: ModesView): void {
    this.modes.progress.textContent = storyProgressText(m.levelsDone, m.levelsTotal, m.stars, m.starsTotal);
    this.modes.best.textContent = freeBestText(m.best);
    fitCanvas(this.modes.story); m.paintStory(this.modes.story);
    fitCanvas(this.modes.free); m.paintFree(this.modes.free);
  }

  setHud(score: number, distance: number, coins: number): void {
    this.set(this.fields.score, formatNumber(score));
    this.set(this.fields.dist, metersText(distance));
    this.set(this.fields.coins, coinsText(coins));
  }

  /** Fills the level select screen; onPick receives the level's position in the list. */
  showLevels(cards: readonly LevelCard[], stars: { got: number; total: number }, onPick: (index: number) => void): void {
    this.levelsStars.textContent = starsText(stars.got, stars.total);
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
      const band = document.createElement('i');
      band.className = 'level-band';
      band.style.background = `linear-gradient(180deg, ${c.tint[0]} 0 55%, ${c.tint[1]} 55%)`;
      const row = document.createElement('span');
      row.className = 'level-stars';
      row.append(...c.stars.map((on) => starIcon(on)));
      if (c.goals) { b.title = c.goals; b.setAttribute('aria-label', c.number + ', ' + c.name + '. ' + c.facts + '. ' + c.goals); }
      b.append(band, num, name, facts, row, status);
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
    for (const b of [this.btnSound, this.btnMenuSound]) {
      b.classList.toggle('muted', muted);
      b.setAttribute('aria-label', muted ? TEXT.unmuteLabel : TEXT.muteLabel);
    }
  }

  /** Fills the profile and characters screen. Call again after a pick to refresh it. */
  showCharacters(g: GarageView): void {
    this.garage = g;
    const p = this.profile;
    const driver = g.drivers.find((d) => d.id === g.driver) ?? g.drivers[0];
    p.name.textContent = driver.name;
    p.driverName.textContent = driver.name;
    p.trait.textContent = driver.trait;
    p.best.textContent = formatNumber(g.best);
    p.dist.textContent = metersText(g.bestDistance);
    if (p.dots.children.length !== g.drivers.length) {
      p.dots.replaceChildren(...g.drivers.map(() => document.createElement('i')));
    }
    g.drivers.forEach((d, i) => p.dots.children[i].classList.toggle('on', d.id === g.driver));
    if (p.colors.children.length === 0) {
      p.colors.replaceChildren(...g.colors.map((c) => {
        const b = document.createElement('button');
        b.className = 'swatch';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-label', c.name);
        b.title = c.name;
        b.dataset.id = c.id;
        b.style.setProperty('--swatch', c.swatch);
        b.addEventListener('click', () => this.garage?.pickColor(c.id));
        return b;
      }));
    }
    for (const el of p.colors.children) {
      const on = (el as HTMLElement).dataset.id === g.color;
      el.classList.toggle('selected', on); el.setAttribute('aria-checked', String(on));
    }
    p.colorName.textContent = g.colors.find((c) => c.id === g.color)?.name ?? '';
    fitCanvas(p.avatar); g.paintAvatar(p.avatar, g.driver);
    fitCanvas(p.art); g.paintDriver(p.art, g.driver);
    fitCanvas(p.car); g.paintCar(p.car);
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
    this.overStars.hidden = r.story === null;
    this.overStars.replaceChildren(...(r.story?.stars ?? []).map((st) => {
      const item = document.createElement('span');
      item.className = 'over-star' + (st.on ? ' on' : '') + (st.isNew ? ' new' : '');
      const caption = document.createElement('small');
      caption.textContent = st.text;
      item.append(starIcon(st.on), caption);
      if (st.isNew) {
        const badge = document.createElement('b');
        badge.textContent = TEXT.newStar;
        item.append(badge);
      }
      return item;
    }));
    this.btnMenu.textContent = r.story ? TEXT.levelsButton : TEXT.home;
    this.set(this.fields.overScore, formatNumber(r.score));
    this.set(this.fields.overDist, metersText(r.distance));
    this.set(this.fields.overCoins, String(r.coins));
    this.newBestEl.hidden = !r.newBest;
    this.overChallenges.hidden = r.challenges.length === 0;
    const title = document.createElement('small');
    title.textContent = TEXT.challengesEarned;
    this.overChallenges.replaceChildren(title, ...r.challenges.map((c) => {
      const line = document.createElement('span');
      line.textContent = c.text + ' ';
      const b = document.createElement('b');
      b.textContent = '+' + formatNumber(c.reward);
      line.append(b);
      return line;
    }));
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
