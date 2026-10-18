// Touch pedals with pointer events. Each pedal tracks its own pointers, so two thumbs work at once,
// and pointer capture makes sure lifting a finger outside the button still releases it.

export interface PedalState {
  gas: boolean;
  brake: boolean;
  /** Releases both pedals, for example when the window loses focus. */
  release(): void;
}

type PedalName = 'gas' | 'brake';

export function createPedals(gasEl: HTMLElement, brakeEl: HTMLElement): PedalState {
  const releasers: Array<() => void> = [];
  const state: PedalState = {
    gas: false,
    brake: false,
    release() { for (const r of releasers) r(); },
  };

  function bind(el: HTMLElement, name: PedalName): void {
    const active = new Set<number>();
    const sync = () => {
      const on = active.size > 0;
      state[name] = on;
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

  bind(gasEl, 'gas');
  bind(brakeEl, 'brake');
  return state;
}
