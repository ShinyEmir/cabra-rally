import './style.css';
import { Game } from './game';
import { createKeyboard } from './input/keyboard';
import { createPedals } from './input/pedals';
import { Screens } from './ui/screens';
import { isTuningEnabled, setupTuning } from './ui/tuning';

const ui = new Screens();
const pedals = createPedals(ui.gasPedal, ui.brakePedal);
// the actions only run on key presses, after game exists
const keys = createKeyboard(window, {
  restart: () => game.restart(),
  togglePause: () => game.togglePause(),
});
const game = new Game(ui, keys, pedals);

ui.btnFree.addEventListener('click', () => game.startRun());
ui.btnRetry.addEventListener('click', () => game.startRun());
ui.btnMenu.addEventListener('click', () => game.showMenu());
ui.btnPause.addEventListener('click', () => game.setPause(true));
ui.btnResume.addEventListener('click', () => game.setPause(false));
ui.btnQuit.addEventListener('click', () => game.showMenu());

window.addEventListener('resize', () => game.resize());
window.addEventListener('blur', () => game.suspend());
document.addEventListener('visibilitychange', () => { if (document.hidden) game.suspend(); });
// no long-press menu and no double-tap zoom while playing
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

if (isTuningEnabled()) {
  setupTuning({ onChange: () => game.resize(), onOpen: () => game.setPause(true) });
}

game.start();
