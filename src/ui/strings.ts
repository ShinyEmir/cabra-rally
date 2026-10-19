// Every player-facing text lives here (Spanish, Mexico), so the game can be translated later.
import type { ScoreEvent } from '../core/scoring';

export const TEXT = {
  title: 'Cerro Arriba',
  tagline: 'Maneja por las colinas, haz vueltas en el aire y junta puntos.',
  freeMode: 'Modo libre',
  freeModeHint: 'Recorre el cerro sin fin y rompe tu récord.',
  play: '¡A correr!',
  install: 'Instalar',
  shop: 'Tienda',
  challenges: 'Retos',
  accessoriesTab: 'Accesorios',
  paintsTab: 'Pinturas',
  buy: 'Comprar',
  equip: 'Usar',
  equipped: 'En uso',
  remove: 'Quitar',
  challengeDone: 'Reto cumplido',
  challengesEarned: 'Retos cumplidos',
  iosInstallHint: 'Para instalarlo en iPhone: toca Compartir y luego Agregar a pantalla de inicio.',
  home: 'Inicio',
  modes: 'Modos',
  back: 'Atrás',
  bestScoreLabel: 'Mejor puntaje',
  bestDistanceLabel: 'Distancia máxima',
  previous: 'Anterior',
  next: 'Siguiente',
  selected: 'Seleccionado',
  paintCar: 'Pinta tu carro',
  storyMode: 'Historia',
  storyModeHint: 'Recoge a tus amigos y llévalos al estadio.',
  levelsTitle: 'Historia',
  levelsBack: 'Menú',
  levelLocked: 'Termina el nivel anterior',
  levelBest: 'Récord:',
  starsLabel: 'Estrellas',
  newStar: 'Nueva',
  friendAboard: 'Amigo a bordo',
  friendsLabel: 'Amigos',
  wonTitle: 'Llegaron al estadio',
  bonusLabel: 'Bono por amigos',
  nextLevel: 'Siguiente nivel',
  levelsButton: 'Niveles',
  howTo: 'Mantén GAS para avanzar y FRENO para frenar o ir en reversa. En el aire, GAS y FRENO hacen girar el carro. Cada vuelta completa suma puntos. Teclado: flechas o A y D.',
  howToArrows: 'Mantén GAS para avanzar y FRENO para frenar o ir en reversa. Las flechas inclinan el carro: en el aire lo hacen girar y en el suelo ayudan a subir o a hacer caballitos. Cada vuelta completa suma puntos. Teclado: arriba y abajo o W y S para gas y freno; izquierda y derecha o A y D para inclinar.',
  controls: 'Controles',
  characters: 'Personajes',
  soundOn: 'Sonido: sí',
  soundOff: 'Sonido: no',
  muteLabel: 'Silenciar',
  unmuteLabel: 'Activar sonido',
  driverLabel: 'Conductor',
  carColorLabel: 'Color del carro',
  schemeLabel: 'Esquema',
  schemeClassic: 'Clásico',
  schemeClassicHint: 'Dos pedales. En el aire, los mismos pedales giran el carro.',
  schemeArrows: 'Pedales y flechas',
  schemeArrowsHint: 'Gas y freno solo avanzan. Las flechas inclinan el carro.',
  sideLabel: 'Lados',
  sideClassicNormal: 'Freno a la izquierda',
  sideClassicSwapped: 'Gas a la izquierda',
  sideArrowsNormal: 'Pedales a la izquierda',
  sideArrowsSwapped: 'Flechas a la izquierda',
  sizeLabel: 'Tamaño de los botones',
  sizeSmall: 'Pequeño',
  sizeMedium: 'Mediano',
  sizeLarge: 'Grande',
  opacityLabel: 'Opacidad de los botones',
  done: 'Listo',
  tiltBackLabel: 'Inclinar hacia atrás',
  tiltForwardLabel: 'Inclinar hacia adelante',
  rotateHint: 'Se juega mejor con el teléfono en horizontal.',
  canvasLabel: 'Juego de carrito sobre colinas',
  scoreLabel: 'Puntos',
  pause: 'Pausa',
  resume: 'Seguir',
  quit: 'Salir',
  gas: 'GAS',
  brake: 'FRENO',
  gasLabel: 'Gas',
  brakeLabel: 'Freno',
  crashedTitle: 'Te volteaste',
  pointsLabel: 'puntos',
  distanceLabel: 'Distancia',
  coinsLabel: 'Monedas',
  newBest: 'Nuevo récord',
  retry: 'Otra vez',
  menu: 'Menú',
  ouch: 'Ay no',
  flipBack: 'Voltereta atrás',
  flipFront: 'Voltereta adelante',
  double: 'Doble',
  triple: 'Triple',
  airtime: 'Tiempo en el aire',
  landing: 'Aterrizaje limpio',
  wheelie: 'Caballito',
} as const;

export type TextKey = keyof typeof TEXT;

/** Thousands separator, as in 12,345. */
export function formatNumber(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Driver names and the trait that tells each one apart, by animal id. */
export const ANIMAL_TEXT: Readonly<Record<string, { name: string; trait: string }>> = {
  ajolote: { name: 'Ajolote', trait: 'Branquias rosas y sonrisa ancha' },
  armadillo: { name: 'Armadillo', trait: 'Casco de bandas y hocico largo' },
  tlacuache: { name: 'Tlacuache', trait: 'Cola larga y orejas redondas' },
  coati: { name: 'Coatí', trait: 'Nariz alargada y cola con anillos' },
  jaguar: { name: 'Jaguar', trait: 'Manchas y orejas pequeñas' },
  tucan: { name: 'Tucán', trait: 'Pico grande y colorido' },
  colibri: { name: 'Colibrí', trait: 'Pico fino y tamaño pequeño' },
};

export function animalText(id: string): { name: string; trait: string } {
  return ANIMAL_TEXT[id] ?? { name: id, trait: '' };
}

export const CAR_COLOR_NAMES: Readonly<Record<string, string>> = {
  laguna: 'Azul laguna',
  nopal: 'Verde nopal',
  mango: 'Amarillo mango',
  jacaranda: 'Morado jacaranda',
  turquesa: 'Turquesa',
  arena: 'Arena de playa',
  rosa: 'Rosa mexicano',
  obsidiana: 'Obsidiana',
};

export const ACCESSORY_NAMES: Readonly<Record<string, string>> = {
  sombrero: 'Sombrero',
  lentes: 'Lentes de sol',
  paliacate: 'Paliacate',
  gorra: 'Gorra',
  flores: 'Corona de flores',
  mono: 'Moño',
};

/** Text of a challenge, from its kind and target, so new challenges need no new text. */
export function challengeText(kind: string, target: number): string {
  switch (kind) {
    case 'flipsInJump': return target === 1 ? 'Haz una voltereta' : 'Haz ' + target + ' volteretas en un solo salto';
    case 'freeDistance': return 'Recorre ' + formatNumber(target) + ' m en modo libre';
    case 'coinsInRun': return 'Junta ' + target + ' monedas en una partida';
    case 'jumpTime': return 'Pasa ' + target + ' segundos en el aire en un salto';
    case 'wheelieTime': return 'Haz un caballito de ' + target + ' segundos';
    case 'levelsDone': return target === 1 ? 'Termina un nivel de historia' : 'Termina ' + target + ' niveles de historia';
    case 'allFriends': return target === 1 ? 'Lleva a todos los amigos al estadio en un nivel' : 'Lleva a todos los amigos en ' + target + ' niveles';
    case 'stars': return 'Consigue ' + target + ' estrellas en historia';
    default: return kind;
  }
}

export function challengesSummaryText(done: number, total: number): string {
  return done + ' de ' + total + ' retos cumplidos';
}

export function storyProgressText(done: number, total: number, stars: number, starsTotal: number): string {
  return done + ' de ' + total + ' niveles · ' + stars + ' de ' + starsTotal + ' estrellas';
}

export function starsText(got: number, total: number): string {
  return got + '/' + total;
}

/** What each star asks for, in STAR_KINDS order (core/stars.ts). */
export function starGoalTexts(friends: number, scoreGoal: number): string[] {
  return ['Llegar al estadio', 'Con los ' + friends + ' amigos', formatNumber(scoreGoal) + ' puntos'];
}

export function freeBestText(best: number): string {
  return best > 0 ? 'Récord: ' + formatNumber(best) : 'Sin récord todavía';
}

export function savedCoinsText(n: number): string {
  return formatNumber(n) + (n === 1 ? ' moneda guardada' : ' monedas guardadas');
}

/** Level names by id; a level without one is called by its number. */
export const LEVEL_NAMES: Readonly<Record<string, string>> = {
  l1: 'Primer paseo',
  l2: 'Lomas del arroyo',
  l3: 'Cerro del viento',
  l4: 'Las barrancas',
  l5: 'La gran subida',
  l6: 'Pinos de la sierra',
  l7: 'Entre milpas',
  l8: 'Pueblo de noche',
  l9: 'Paso nevado',
  l10: 'Faldas del volcán',
};

export function levelName(id: string, index: number): string {
  return LEVEL_NAMES[id] ?? 'Nivel ' + (index + 1);
}

export function levelNumber(index: number): string {
  return 'Nivel ' + (index + 1);
}

export function friendsText(got: number, total: number): string {
  return got + '/' + total;
}

export function levelFacts(length: number, friends: number): string {
  return length + ' m · ' + friends + ' amigos';
}

export function bestLine(best: number): string {
  return 'Récord en modo libre: ' + formatNumber(best);
}

export function metersText(m: number): string {
  return m + ' m';
}

export function coinsText(n: number): string {
  return n + (n === 1 ? ' moneda' : ' monedas');
}

export interface PopText {
  text: string;
  small: boolean;
}

/** Floating text for a score event. */
export function describeScore(e: ScoreEvent): PopText {
  switch (e.kind) {
    case 'flip': {
      let name: string = e.direction === 'back' ? TEXT.flipBack : TEXT.flipFront;
      if (e.count === 2) name = TEXT.double + ' ' + name.toLowerCase();
      else if (e.count >= 3) name = TEXT.triple + ' ' + name.toLowerCase();
      return { text: name, small: false };
    }
    case 'airtime': return { text: TEXT.airtime, small: true };
    case 'landing': return { text: TEXT.landing, small: true };
    case 'wheelie': return { text: TEXT.wheelie, small: true };
  }
}
