// Keyboard: tracks which keys are held (mapped to controls per scheme in scheme.ts),
// plus R to restart and Esc or P to toggle pause.
import { GAME_KEYS } from './scheme';

export interface KeyState {
  /** Held keys, by KeyboardEvent.key in lower case. */
  readonly pressed: ReadonlySet<string>;
  release(): void;
}

export interface KeyActions {
  restart(): void;
  togglePause(): void;
}

const RESTART_KEYS = new Set(['r']);
const PAUSE_KEYS = new Set(['escape', 'p']);

export function createKeyboard(target: Window, actions: KeyActions): KeyState {
  const pressed = new Set<string>();
  target.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (GAME_KEYS.has(k)) { pressed.add(k); e.preventDefault(); }
    else if (RESTART_KEYS.has(k)) actions.restart();
    else if (PAUSE_KEYS.has(k)) actions.togglePause();
  });
  target.addEventListener('keyup', (e) => { pressed.delete(e.key.toLowerCase()); });
  return { pressed, release() { pressed.clear(); } };
}
