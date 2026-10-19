// The player's driver and car paint, saved on the device.
import { ANIMALS, DEFAULT_DRIVER_ID } from './core/animals';
import { CAR_COLORS } from './render/draw-car';

export interface Garage {
  driver: string;
  carColor: string;
}

export const DEFAULT_GARAGE: Readonly<Garage> = { driver: DEFAULT_DRIVER_ID, carColor: CAR_COLORS[0].id };

const STORAGE_KEY = 'cabra-rally-garage';

/** Turns whatever was saved (possibly old or broken) into a valid choice. */
export function sanitizeGarage(raw: unknown): Garage {
  const saved = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof Garage, unknown>>;
  return {
    driver: ANIMALS.some((a) => a.id === saved.driver) ? saved.driver as string : DEFAULT_GARAGE.driver,
    carColor: CAR_COLORS.some((c) => c.id === saved.carColor) ? saved.carColor as string : DEFAULT_GARAGE.carColor,
  };
}

export function loadGarage(): Garage {
  try { return sanitizeGarage(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); } catch { return { ...DEFAULT_GARAGE }; }
}

export function saveGarage(garage: Readonly<Garage>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(garage)); } catch { /* storage may be unavailable */ }
}
