import './style.css';
import { Game } from './game';
import { createKeyboard } from './input/keyboard';
import { createTouchControls } from './input/pedals';
import { Screens } from './ui/screens';
import { isTuningEnabled, setupTuning } from './ui/tuning';

const ui = new Screens();
const touch = createTouchControls(ui.touchButtons);
// the actions only run on key presses, after game exists
const keys = createKeyboard(window, {
  restart: () => game.restart(),
  togglePause: () => game.togglePause(),
});
const game = new Game(ui, keys, touch);

ui.btnFree.addEventListener('click', () => game.startRun());
ui.btnRetry.addEventListener('click', () => game.startRun());
ui.btnMenu.addEventListener('click', () => game.showMenu());
ui.btnPause.addEventListener('click', () => game.setPause(true));
ui.btnResume.addEventListener('click', () => game.setPause(false));
ui.btnQuit.addEventListener('click', () => game.showMenu());
ui.btnControls.addEventListener('click', () => game.openControls());
ui.btnPauseControls.addEventListener('click', () => game.openControls());
ui.btnControlsDone.addEventListener('click', () => game.closeControls());
ui.optClassic.addEventListener('click', () => game.setControls({ scheme: 'classic' }));
ui.optArrows.addEventListener('click', () => game.setControls({ scheme: 'arrows' }));
ui.optSideNormal.addEventListener('click', () => game.setControls({ swapSides: false }));
ui.optSideSwap.addEventListener('click', () => game.setControls({ swapSides: true }));
ui.optSize.small.addEventListener('click', () => game.setControls({ size: 'small' }));
ui.optSize.medium.addEventListener('click', () => game.setControls({ size: 'medium' }));
ui.optSize.large.addEventListener('click', () => game.setControls({ size: 'large' }));
ui.optOpacity.addEventListener('input', () => game.setControls({ opacity: Number(ui.optOpacity.value) }));

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
