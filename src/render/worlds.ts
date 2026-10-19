// Look of each world, as data: sky, sun, three hill layers, ground, grass and the silhouettes on
// the near hills. Story levels and modes refer to a world by id (core data); unknown ids fall
// back to the first world.

export type PropKind = 'tree' | 'jungle' | 'palm' | 'cactus' | 'maguey';

export interface WorldSpec {
  id: string;
  /** Top, middle and bottom of the sky gradient. */
  sky: readonly [string, string, string];
  sun: string;
  /** Far, middle and near hill colors. */
  hills: readonly [string, string, string];
  /** The far layer is a flat sea instead of hills. */
  sea?: boolean;
  /** Ground bands from the surface down. */
  ground: readonly [string, string, string, string];
  /** Dark and light grass strokes on the surface. */
  grass: readonly [string, string];
  prop: PropKind;
  propColor: string;
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
    hills: ['#3aa3c8', '#e6cf96', '#cdb370'], sea: true,
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
];

export function worldById(id: string): WorldSpec {
  return WORLDS.find((w) => w.id === id) ?? WORLDS[0];
}
