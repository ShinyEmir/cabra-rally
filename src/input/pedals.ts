// Touch buttons (pedals and arrows) with pointer events. Each button tracks its own pointers, so
// several thumbs work at once, and pointer capture makes sure lifting a finger outside the
// button still releases it.
import type { HeldControls } from './scheme';

export interface TouchState {
  readonly held: Readonly<HeldControls>;
  /** Releases every button, for example when the window loses focus. */
  release(): void;
}

export type TouchButtons = Record<keyof HeldControls, HTMLElement>;

export function createTouchControls(buttons: TouchButtons): TouchState {
  const held: HeldControls = { gas: false, brake: false, tiltBack: false, tiltForward: false };
  const releasers: Array<() => void> = [];

  for (const name of Object.keys(buttons) as Array<keyof HeldControls>) {
    const el = buttons[name];
    const active = new Set<number>();
    const sync = () => {
      const on = active.size > 0;
      held[name] = on;
      el.classList.toggle('on', on);
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      active.add(e.pointerId);
      try { el.setPointerCapture(e.pointerId); } catch { /* capture is best effort */ }
      sync();
    });
    const up = (e: PointerEvent) => { active.delete(e.pointerId); sync(); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    releasers.push(() => { active.clear(); sync(); });
  }

  return { held, release() { for (const r of releasers) r(); } };
}
