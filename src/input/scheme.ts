// Control schemes the player can choose from, how buttons and keys map to the car's input,
// and where the choice is saved. No DOM here, so the mapping can be tested directly.
import { pedalsOnly, type DriveInput } from '../core/run';

/**
 * classic: two pedals; in the air the same pedals turn the car (the prototype's controls).
 * arrows: gas and brake only drive; two arrows tilt the car, in the air and on the ground.
 */
export type ControlScheme = 'classic' | 'arrows';

export interface ControlSettings {
  scheme: ControlScheme;
  /** Mirror the layout: in classic, gas on the left; in arrows, the arrows on the left. */
  swapSides: boolean;
}

export const DEFAULT_CONTROLS: Readonly<ControlSettings> = { scheme: 'classic', swapSides: false };

/** What the player is holding, from touch buttons and keys combined. */
export interface HeldControls {
  gas: boolean;
  brake: boolean;
  /** Arrow that tilts the nose up. */
  tiltBack: boolean;
  /** Arrow that tilts the nose down. */
  tiltForward: boolean;
}

export const NOTHING_HELD: Readonly<HeldControls> = { gas: false, brake: false, tiltBack: false, tiltForward: false };

export function toDriveInput(settings: Readonly<ControlSettings>, held: Readonly<HeldControls>): DriveInput {
  const thr = (held.gas ? 1 : 0) - (held.brake ? 1 : 0);
  if (settings.scheme === 'classic') return pedalsOnly(thr);
  const tilt = (held.tiltBack ? 1 : 0) - (held.tiltForward ? 1 : 0);
  return { thr, spin: tilt, lean: tilt };
}

/** Keyboard layout per scheme, by KeyboardEvent.key in lower case. */
export const KEYMAP: Readonly<Record<ControlScheme, Readonly<Record<keyof HeldControls, readonly string[]>>>> = {
  classic: {
    gas: ['arrowright', 'd', 'arrowup', ' '],
    brake: ['arrowleft', 'a', 'arrowdown'],
    tiltBack: [],
    tiltForward: [],
  },
  arrows: {
    gas: ['arrowup', 'w', ' '],
    brake: ['arrowdown', 's'],
    tiltBack: ['arrowleft', 'a'],
    tiltForward: ['arrowright', 'd'],
  },
};

/** Every key any scheme uses, so the page does not scroll when they are pressed. */
export const GAME_KEYS: ReadonlySet<string> = new Set(
  Object.values(KEYMAP).flatMap((m) => Object.values(m).flat()),
);

export function heldFromKeys(settings: Readonly<ControlSettings>, pressed: ReadonlySet<string>): HeldControls {
  const map = KEYMAP[settings.scheme];
  const any = (keys: readonly string[]) => keys.some((k) => pressed.has(k));
  return { gas: any(map.gas), brake: any(map.brake), tiltBack: any(map.tiltBack), tiltForward: any(map.tiltForward) };
}

export function combineHeld(a: Readonly<HeldControls>, b: Readonly<HeldControls>): HeldControls {
  return { gas: a.gas || b.gas, brake: a.brake || b.brake, tiltBack: a.tiltBack || b.tiltBack, tiltForward: a.tiltForward || b.tiltForward };
}

const STORAGE_KEY = 'cabra-rally-controls';

export function loadControls(): ControlSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<ControlSettings>;
    return {
      scheme: saved.scheme === 'arrows' ? 'arrows' : 'classic',
      swapSides: saved.swapSides === true,
    };
  } catch {
    return { ...DEFAULT_CONTROLS };
  }
}

export function saveControls(settings: Readonly<ControlSettings>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* storage may be unavailable */ }
}
