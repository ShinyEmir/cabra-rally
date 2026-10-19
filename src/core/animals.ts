// The cast, as data: each animal is a combination of drawing parts, colors and its head size for
// the crash zone. One function (render/draw-animal.ts) draws any of them, so a new animal needs no
// new drawing code. Names and descriptions live in ui/strings.ts.

export type EarStyle = 'none' | 'round' | 'small' | 'tall' | 'pointed';
export type SnoutStyle = 'smile' | 'long' | 'longUp' | 'pointed' | 'muzzle' | 'beakBig' | 'beakThin';
export type MarkStyle = 'none' | 'gills' | 'shield' | 'spots' | 'mask' | 'face' | 'eyeRing' | 'throat';
export type TailStyle = 'none' | 'fin' | 'cone' | 'long' | 'ringed' | 'feather';
export type BodyStyle = 'chubby' | 'slim' | 'shell' | 'bird' | 'hover';
export type EyeStyle = 'big' | 'dot';

export interface AnimalColors {
  /** Fur, skin or feathers. */
  main: string;
  /** Belly, face or muzzle. */
  light: string;
  /** Gills, beak, nose, tail or stripes, depending on the parts. */
  accent: string;
  /** Spots, mask, shell lines, eye ring or throat. */
  detail: string;
  /** Ears, when they differ from main. */
  ears?: string;
}

export interface AnimalSpec {
  /** Stable id, used to save the chosen driver. */
  id: string;
  colors: AnimalColors;
  /** Head ellipse as multiples of the head radius: wider than 1 is a flat, wide head. */
  head: { w: number; h: number };
  ears: EarStyle;
  snout: SnoutStyle;
  marks: MarkStyle;
  tail: TailStyle;
  body: BodyStyle;
  eye: EyeStyle;
  /** Head radius while driving, in meters; it is also the crash zone. */
  headR: number;
}

export const ANIMALS: readonly AnimalSpec[] = [
  {
    id: 'ajolote',
    colors: { main: '#f4a6c0', light: '#fcd6e2', accent: '#e0567f', detail: '#c2446c' },
    head: { w: 1.15, h: 0.9 }, ears: 'none', snout: 'smile', marks: 'gills', tail: 'fin', body: 'chubby', eye: 'dot',
    headR: 0.3,
  },
  {
    id: 'armadillo',
    colors: { main: '#b49a7f', light: '#e3d3bd', accent: '#8a7259', detail: '#5e4d3c' },
    head: { w: 0.95, h: 0.85 }, ears: 'tall', snout: 'long', marks: 'shield', tail: 'cone', body: 'shell', eye: 'big',
    headR: 0.28,
  },
  {
    id: 'tlacuache',
    colors: { main: '#bdb8b4', light: '#f8f5f0', accent: '#f2a3ae', detail: '#4a4448', ears: '#2c2a2e' },
    head: { w: 0.95, h: 0.95 }, ears: 'round', snout: 'pointed', marks: 'face', tail: 'long', body: 'slim', eye: 'big',
    headR: 0.28,
  },
  {
    id: 'coati',
    colors: { main: '#ad6c3f', light: '#ecd6b8', accent: '#5f3820', detail: '#3a2417' },
    head: { w: 0.95, h: 0.9 }, ears: 'small', snout: 'longUp', marks: 'mask', tail: 'ringed', body: 'slim', eye: 'big',
    headR: 0.28,
  },
  {
    id: 'jaguar',
    colors: { main: '#f0b43c', light: '#fff1d0', accent: '#4a3020', detail: '#3a2616' },
    head: { w: 1, h: 0.95 }, ears: 'round', snout: 'muzzle', marks: 'spots', tail: 'long', body: 'chubby', eye: 'big',
    headR: 0.3,
  },
  {
    id: 'tucan',
    colors: { main: '#22272b', light: '#fff1c4', accent: '#f39a2b', detail: '#46b0de' },
    head: { w: 0.95, h: 0.95 }, ears: 'none', snout: 'beakBig', marks: 'eyeRing', tail: 'feather', body: 'bird', eye: 'big',
    headR: 0.27,
  },
  {
    id: 'colibri',
    colors: { main: '#2fae7a', light: '#d8f3e5', accent: '#1f2422', detail: '#d93a74' },
    head: { w: 0.95, h: 0.9 }, ears: 'none', snout: 'beakThin', marks: 'throat', tail: 'feather', body: 'hover', eye: 'big',
    headR: 0.25,
  },
];

export const DEFAULT_DRIVER_ID = 'ajolote';

export function animalById(id: string): AnimalSpec {
  return ANIMALS.find((a) => a.id === id) ?? ANIMALS[0];
}

/** Friends in story mode, by their order along a level: everyone but the default driver, in turn. */
export function friendAnimal(i: number): AnimalSpec {
  const friends = ANIMALS.filter((a) => a.id !== DEFAULT_DRIVER_ID);
  return friends[i % friends.length];
}
