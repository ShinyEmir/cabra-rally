// Look of each world, as data: sky, sun, three hill layers, ground, grass and the silhouettes on
// the near hills. Story levels and modes refer to a world by id (core data); unknown ids fall
// back to the first world.

export type PropKind = 'tree' | 'jungle' | 'palm' | 'cactus' | 'maguey' | 'pine' | 'corn' | 'house' | 'rock';

/** What fills the far layer: rolling hills, a flat sea, sharp peaks or hills with a smoking volcano. */
export type FarKind = 'hills' | 'sea' | 'peaks' | 'volcano';

export interface WorldSpec {
  id: string;
  /** Top, middle and bottom of the sky gradient. */
  sky: readonly [string, string, string];
  sun: string;
  /** Far, middle and near hill colors. */
  hills: readonly [string, string, string];
  /** The far layer; hills when missing. */
  far?: FarKind;
  /** Night sky: stars, and the sun color is used for a moon. */
  night?: boolean;
  /** Snow on peak tops and on pine branches, when present. */
  snow?: string;
  /** Ground bands from the surface down. */
  ground: readonly [string, string, string, string];
  /** Dark and light grass strokes on the surface. */
  grass: readonly [string, string];
  prop: PropKind;
  propColor: string;
  /** Second prop color: lit windows on houses, cobs on corn, snow on pines. */
  propLight?: string;
}

export const WORLDS: readonly WorldSpec[] = [
  {
    id: 'valle',
    sky: ['#6fc4cc', '#cfe8c8', '#f6e4b5'], sun: '#fff3b8',
    hills: ['#9ed3b5', '#74b98a', '#559c58'],
    ground: ['#8a5c36', '#7a4f2e', '#6b4427', '#5d3a21'], grass: ['#4c8f3f', '#7cc152'],
    prop: 'tree', propColor: '#3f7f45',
  },
  {
    id: 'selva',
    sky: ['#5db6a6', '#bde2bd', '#e6efc0'], sun: '#fdf6c4',
    hills: ['#79b58a', '#4a9662', '#2f7a48'],
    ground: ['#6b4a2e', '#5c3f27', '#4e3521', '#412c1b'], grass: ['#2e7a36', '#52a84b'],
    prop: 'jungle', propColor: '#24603a',
  },
  {
    id: 'costa',
    sky: ['#64bfe4', '#bce8f2', '#fbe8bf'], sun: '#fff8d6',
    hills: ['#3aa3c8', '#e6cf96', '#cdb370'], far: 'sea',
    ground: ['#d7b679', '#c8a565', '#b79253', '#a48045'], grass: ['#5fae5a', '#8fcf6a'],
    prop: 'palm', propColor: '#3f8a4f',
  },
  {
    id: 'desierto',
    sky: ['#f0b06a', '#f7d8a0', '#fbeccb'], sun: '#fff6d8',
    hills: ['#e5ac7b', '#cc8a60', '#ad6c4e'],
    ground: ['#c47a4a', '#b06b3f', '#9a5c36', '#854e2e'], grass: ['#8f8a38', '#bfb04c'],
    prop: 'cactus', propColor: '#4a8a4c',
  },
  {
    id: 'atardecer',
    sky: ['#7b6cb6', '#e3998a', '#f6c889'], sun: '#ffd9a0',
    hills: ['#8c7ca8', '#6c6090', '#504a75'],
    ground: ['#7a5238', '#6a4630', '#5b3b28', '#4d3122'], grass: ['#4b7a45', '#6f9f52'],
    prop: 'maguey', propColor: '#33504a',
  },
  {
    id: 'sierra',
    sky: ['#6fb3d6', '#c7e2e6', '#eef0d6'], sun: '#fff6cc',
    hills: ['#8aa6c2', '#5f9478', '#3f7a55'], far: 'peaks', snow: '#f4f8fa',
    ground: ['#7d5638', '#6d4a30', '#5e3f29', '#4f3522'], grass: ['#3c7a45', '#62a35a'],
    prop: 'pine', propColor: '#2b5e40',
  },
  {
    id: 'milpa',
    sky: ['#86c7d8', '#e2ecc4', '#f8e2a6'], sun: '#fff1b0',
    hills: ['#c4cf8c', '#a3b862', '#7f9f45'],
    ground: ['#9a6a3e', '#8a5d35', '#7a512e', '#6a4627'], grass: ['#5f9437', '#9cc75a'],
    prop: 'corn', propColor: '#557f30', propLight: '#f2c84b',
  },
  {
    id: 'noche',
    sky: ['#1b2150', '#3a3d78', '#74608f'], sun: '#f6f1d4', night: true,
    hills: ['#3d4176', '#2f3563', '#252a52'],
    ground: ['#5a4238', '#4c3830', '#3f2f29', '#332621'], grass: ['#2f6048', '#4b8460'],
    prop: 'house', propColor: '#1c2142', propLight: '#ffd27a',
  },
  {
    id: 'nevado',
    sky: ['#8ec3e6', '#d8eaf4', '#f5f7f3'], sun: '#ffffff',
    hills: ['#93abc4', '#aec3d4', '#c6d6e3'], far: 'peaks', snow: '#ffffff',
    ground: ['#f2f6f8', '#9a8d84', '#83776f', '#6c625b'], grass: ['#8aa3b8', '#ffffff'],
    prop: 'pine', propColor: '#2e5a4c', propLight: '#ffffff',
  },
  {
    id: 'volcan',
    sky: ['#b8786a', '#e3ab88', '#f3d2a4'], sun: '#ffe7b8',
    hills: ['#7d5d5e', '#5f4749', '#4a3739'], far: 'volcano',
    ground: ['#4d3d3b', '#413432', '#362b2a', '#2b2221'], grass: ['#66733d', '#8f9a4f'],
    prop: 'rock', propColor: '#33282a',
  },
];

export function worldById(id: string): WorldSpec {
  return WORLDS.find((w) => w.id === id) ?? WORLDS[0];
}
