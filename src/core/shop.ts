// The coin shop, as data and pure rules. Everything sold is cosmetic: nothing changes the physics.
// Accessories are worn by the driver; paints are extra car colors (render/draw-car.ts).
// Names live in ui/strings.ts.

export type AccessoryStyle = 'sombrero' | 'glasses' | 'bandana' | 'cap' | 'flowers' | 'bow';

export interface AccessorySpec {
  id: string;
  style: AccessoryStyle;
  main: string;
  accent: string;
}

export const ACCESSORIES: readonly AccessorySpec[] = [
  { id: 'sombrero', style: 'sombrero', main: '#e8c46a', accent: '#b5462f' },
  { id: 'lentes', style: 'glasses', main: '#22272b', accent: '#5fd0e8' },
  { id: 'paliacate', style: 'bandana', main: '#2f6fb5', accent: '#ffffff' },
  { id: 'gorra', style: 'cap', main: '#3fa95a', accent: '#f4f0e0' },
  { id: 'flores', style: 'flowers', main: '#ff7aa8', accent: '#ffd23f' },
  { id: 'mono', style: 'bow', main: '#8a5cc2', accent: '#f2c037' },
];

export function accessoryById(id: string | null): AccessorySpec | null {
  return ACCESSORIES.find((a) => a.id === id) ?? null;
}

export interface ShopItem {
  id: string;
  kind: 'accessory' | 'paint';
  price: number;
}

/** For sale, in the order shown. Paint ids match car color ids in render/draw-car.ts. */
export const SHOP_ITEMS: readonly ShopItem[] = [
  { id: 'lentes', kind: 'accessory', price: 150 },
  { id: 'gorra', kind: 'accessory', price: 200 },
  { id: 'paliacate', kind: 'accessory', price: 250 },
  { id: 'mono', kind: 'accessory', price: 300 },
  { id: 'flores', kind: 'accessory', price: 400 },
  { id: 'sombrero', kind: 'accessory', price: 600 },
  { id: 'turquesa', kind: 'paint', price: 200 },
  { id: 'arena', kind: 'paint', price: 250 },
  { id: 'rosa', kind: 'paint', price: 350 },
  { id: 'obsidiana', kind: 'paint', price: 500 },
];

export interface ShopState {
  /** Ids of everything bought. */
  owned: string[];
  /** Accessory the driver wears, or null. */
  accessory: string | null;
}

export const EMPTY_SHOP: Readonly<ShopState> = { owned: [], accessory: null };

export function isOwned(state: Readonly<ShopState>, id: string): boolean {
  return state.owned.includes(id);
}

/** Buys an item if there are enough coins and it is not owned yet; returns null otherwise. */
export function buy(state: Readonly<ShopState>, item: Readonly<ShopItem>, coins: number): { state: ShopState; coins: number } | null {
  if (isOwned(state, item.id) || coins < item.price) return null;
  return { state: { ...state, owned: [...state.owned, item.id] }, coins: coins - item.price };
}

/** Wears an owned accessory, or takes it off with null. */
export function equipAccessory(state: Readonly<ShopState>, id: string | null): ShopState {
  if (id !== null && !isOwned(state, id)) return { ...state };
  return { ...state, accessory: id };
}

/** Turns whatever was saved (possibly old or broken) into a valid state. */
export function sanitizeShop(raw: unknown): ShopState {
  const saved = (typeof raw === 'object' && raw !== null ? raw : {}) as { owned?: unknown; accessory?: unknown };
  const known = new Set(SHOP_ITEMS.map((i) => i.id));
  const owned = Array.isArray(saved.owned) ? [...new Set(saved.owned.filter((o): o is string => typeof o === 'string' && known.has(o)))] : [];
  const accessory = typeof saved.accessory === 'string' && owned.includes(saved.accessory) ? saved.accessory : null;
  return { owned, accessory };
}
