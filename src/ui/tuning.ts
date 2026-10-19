// Developer tuning panel for phase 3. Only appears when the URL has ?ajuste.
// Sliders change PHY and CAMERA live; tried values are kept in localStorage (and only applied
// while ?ajuste is on), and the panel lists what differs from the defaults so it can be copied.
import { LEAN, PHY } from '../core/physics';
import { DEFAULT_CAR_SHAPE, HITBOX } from '../core/vehicle';
import { CAMERA } from '../render/camera';
import { SHAPE_DEBUG } from '../render/draw-car';

const TUNING = {
  queryFlag: 'ajuste',
  storageKey: 'cabra-rally-tuning',
} as const;

interface Knob {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  def: number;
  get(): number;
  set(v: number): void;
}

/** group keeps ids unique across objects, for example PHY.k and the chassis k. */
function knob<K extends string>(group: string, obj: Record<K, number>, field: K, label: string, min: number, max: number, step: number): Knob {
  return {
    id: group + '.' + field, label, min, max, step, def: obj[field],
    get: () => obj[field],
    set: (v) => { obj[field] = v; },
  };
}

// Panel labels are a developer tool, kept here instead of strings.ts.
const KNOBS: readonly Knob[] = [
  knob('PHY', PHY, 'airTorque', 'Giro en el aire: fuerza', 2, 20, 0.5),
  knob('PHY', PHY, 'airDamp', 'Giro en el aire: freno', 0.2, 4, 0.1),
  knob('PHY', PHY, 'inertia', 'Inercia al girar', 0.5, 2.5, 0.05),
  knob('LEAN', LEAN, 'torque', 'Flechas: inclinación en el suelo', 0, 20, 0.5),
  knob('PHY', PHY, 'engine', 'Motor', 3, 12, 0.1),
  knob('PHY', PHY, 'vmax', 'Velocidad máxima', 8, 25, 0.5),
  knob('PHY', PHY, 'brake', 'Freno', 2, 10, 0.1),
  knob('PHY', PHY, 'mu', 'Agarre', 0.5, 2, 0.05),
  knob('PHY', PHY, 'k', 'Suspensión: rigidez', 80, 300, 5),
  knob('PHY', PHY, 'c', 'Suspensión: amortiguación', 4, 25, 0.5),
  knob('HITBOX', HITBOX, 'headScale', 'Cabeza: tamaño de la zona de choque', 0.5, 1.5, 0.05),
  knob('body', DEFAULT_CAR_SHAPE.body, 'k', 'Carrocería: dureza contra el suelo', 200, 2000, 50),
  knob('body', DEFAULT_CAR_SHAPE.body, 'c', 'Carrocería: amortiguación', 5, 80, 1),
  knob('body', DEFAULT_CAR_SHAPE.body, 'mu', 'Carrocería: fricción al raspar', 0, 1.5, 0.05),
  knob('CAMERA', CAMERA, 'zoom', 'Cámara: alejar (1 = original)', 0.7, 1.8, 0.05),
];

function changed(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of KNOBS) if (k.get() !== k.def) out[k.id] = k.get();
  return out;
}

function load(): void {
  try {
    const saved = JSON.parse(localStorage.getItem(TUNING.storageKey) || '{}') as Record<string, unknown>;
    for (const k of KNOBS) {
      const v = saved[k.id];
      if (typeof v === 'number' && Number.isFinite(v)) k.set(v);
    }
  } catch { /* ignore broken or unavailable storage */ }
}

function save(): void {
  try { localStorage.setItem(TUNING.storageKey, JSON.stringify(changed())); } catch { /* storage may be unavailable */ }
}

function format(v: number, step: number): string {
  return step < 0.1 ? v.toFixed(2) : step < 1 ? v.toFixed(1) : String(v);
}

export interface TuningHooks {
  /** A value changed; camera values need the screen to be measured again. */
  onChange(): void;
  /** The panel opened. */
  onOpen(): void;
}

/** ?ajuste in the address, or #ajuste where the query string does not survive (hosted previews). */
export function isTuningEnabled(): boolean {
  return new URLSearchParams(window.location.search).has(TUNING.queryFlag) || window.location.hash === '#' + TUNING.queryFlag;
}

export function setupTuning(hooks: TuningHooks): void {
  load();

  const toggle = document.createElement('button');
  toggle.className = 'tune-toggle';
  toggle.textContent = 'Ajuste';

  const panel = document.createElement('div');
  panel.className = 'tune-panel';
  panel.hidden = true;

  const summary = document.createElement('pre');
  summary.className = 'tune-summary';
  const refreshSummary = () => {
    const c = changed();
    summary.textContent = Object.keys(c).length ? JSON.stringify(c, null, 1) : 'Sin cambios: valores originales.';
  };

  const rows: Array<() => void> = [];
  for (const k of KNOBS) {
    const row = document.createElement('label');
    row.className = 'tune-row';
    const name = document.createElement('span');
    name.textContent = k.label;
    const value = document.createElement('b');
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(k.min); input.max = String(k.max); input.step = String(k.step);
    const sync = () => {
      input.value = String(k.get());
      value.textContent = format(k.get(), k.step);
      row.classList.toggle('tune-changed', k.get() !== k.def);
    };
    input.addEventListener('input', () => {
      k.set(Number(input.value));
      sync(); save(); refreshSummary(); hooks.onChange();
    });
    sync();
    rows.push(sync);
    row.append(name, value, input);
    panel.appendChild(row);
  }

  const showRow = document.createElement('label');
  showRow.className = 'tune-row tune-check';
  const showBox = document.createElement('input');
  showBox.type = 'checkbox';
  showBox.checked = SHAPE_DEBUG.visible;
  showBox.addEventListener('change', () => { SHAPE_DEBUG.visible = showBox.checked; });
  const showText = document.createElement('span');
  showText.textContent = 'Ver zonas de choque (rojo) y carrocería (azul)';
  showRow.append(showText, showBox);
  panel.insertBefore(showRow, panel.firstChild);

  const actions = document.createElement('div');
  actions.className = 'tune-actions';
  const copy = document.createElement('button');
  copy.textContent = 'Copiar cambios';
  copy.addEventListener('click', async () => {
    const text = JSON.stringify(changed());
    try {
      await navigator.clipboard.writeText(text);
      copy.textContent = 'Copiado';
    } catch {
      // the clipboard needs https; over the local network, select the text instead
      const range = document.createRange();
      range.selectNodeContents(summary);
      const sel = window.getSelection();
      sel?.removeAllRanges(); sel?.addRange(range);
      copy.textContent = 'Seleccionado';
    }
    setTimeout(() => { copy.textContent = 'Copiar cambios'; }, 1500);
  });
  const reset = document.createElement('button');
  reset.textContent = 'Restablecer';
  reset.addEventListener('click', () => {
    for (const k of KNOBS) k.set(k.def);
    for (const sync of rows) sync();
    save(); refreshSummary(); hooks.onChange();
  });
  const close = document.createElement('button');
  close.textContent = 'Cerrar';
  close.addEventListener('click', () => { panel.hidden = true; });
  actions.append(copy, reset, close);
  panel.append(summary, actions);
  refreshSummary();

  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) hooks.onOpen();
  });
  document.body.append(toggle, panel);
  hooks.onChange();
}
