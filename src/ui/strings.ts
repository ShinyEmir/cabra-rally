// Every player-facing text lives here (Spanish, Mexico), so the game can be translated later.
import type { ScoreEvent } from '../core/scoring';

export const TEXT = {
  title: 'Cabra Rally',
  tagline: 'Maneja por las colinas, haz vueltas en el aire y junta puntos.',
  freeMode: 'Modo libre',
  freeModeHint: 'Infinito. Solo tú y los puntos.',
  storyMode: 'Historia',
  storyModeHint: 'Muy pronto.',
  howTo: 'Mantén GAS para avanzar y FRENO para frenar o ir en reversa. En el aire, GAS y FRENO hacen girar el carro. Cada vuelta completa suma puntos. Teclado: flechas o A y D.',
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
