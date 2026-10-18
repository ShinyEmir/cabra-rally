// Keyboard controls: arrows, A/D and space drive; R restarts; Esc or P toggles pause.

export interface KeyState {
  gas: boolean;
  brake: boolean;
  release(): void;
}

export interface KeyActions {
  restart(): void;
  togglePause(): void;
}

const GAS_KEYS = new Set(['ArrowRight', 'd', 'D', ' ', 'ArrowUp']);
const BRAKE_KEYS = new Set(['ArrowLeft', 'a', 'A', 'ArrowDown']);
const RESTART_KEYS = new Set(['r', 'R']);
const PAUSE_KEYS = new Set(['Escape', 'p', 'P']);

export function createKeyboard(target: Window, actions: KeyActions): KeyState {
  const state: KeyState = {
    gas: false,
    brake: false,
    release() { state.gas = false; state.brake = false; },
  };
  const handler = (down: boolean) => (e: KeyboardEvent) => {
    const k = e.key;
    if (GAS_KEYS.has(k)) { state.gas = down; e.preventDefault(); }
    else if (BRAKE_KEYS.has(k)) { state.brake = down; e.preventDefault(); }
    else if (down && RESTART_KEYS.has(k)) actions.restart();
    else if (down && PAUSE_KEYS.has(k)) actions.togglePause();
  };
  target.addEventListener('keydown', handler(true));
  target.addEventListener('keyup', handler(false));
  return state;
}
