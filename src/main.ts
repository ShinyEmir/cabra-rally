import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { Sfx } from './audio/sfx';
import { Game } from './game';
import { createKeyboard } from './input/keyboard';
import { createTouchControls } from './input/pedals';
import { Screens } from './ui/screens';
import { setupInstall } from './ui/install';
import { isTuningEnabled, setupTuning } from './ui/tuning';

const ui = new Screens();
const touch = createTouchControls(ui.touchButtons);
// the actions only run on key presses, after game exists
const keys = createKeyboard(window, {
  restart: () => game.restart(),
  togglePause: () => game.togglePause(),
});
const sfx = new Sfx();
const game = new Game(ui, keys, touch, sfx);
// browsers only allow sound after the player touches or presses something
window.addEventListener('pointerdown', () => sfx.unlock(), { capture: true });
window.addEventListener('keydown', () => sfx.unlock(), { capture: true });

ui.btnPlay.addEventListener('click', () => game.showModes());
ui.btnModesBack.addEventListener('click', () => game.showMenu());
ui.btnHomeStory.addEventListener('click', () => game.showLevels());
ui.btnProfile.addEventListener('click', () => game.showCharacters());
ui.btnFree.addEventListener('click', () => game.startFree());
ui.btnStory.addEventListener('click', () => game.showLevels());
ui.btnLevelsBack.addEventListener('click', () => game.showModes());
ui.btnCharacters.addEventListener('click', () => game.showCharacters());
ui.btnCharactersDone.addEventListener('click', () => game.showMenu());
ui.btnNext.addEventListener('click', () => game.nextLevel());
ui.btnRetry.addEventListener('click', () => game.startRun());
ui.btnMenu.addEventListener('click', () => game.leaveRun());
ui.btnPause.addEventListener('click', () => game.setPause(true));
ui.btnResume.addEventListener('click', () => game.setPause(false));
ui.btnQuit.addEventListener('click', () => game.leaveRun());
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
document.addEventListener('visibilitychange', () => { if (document.hidden) { game.suspend(); sfx.sleep(); } });
ui.btnSound.addEventListener('click', () => game.toggleSound());
ui.btnMenuSound.addEventListener('click', () => game.toggleSound());
// no long-press menu and no double-tap zoom while playing
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

if (isTuningEnabled()) {
  // every story level open, for testing
  game.unlockAll = true;
  // lets test scripts in the browser read the game state
  (window as unknown as { cerroDebug: Game }).cerroDebug = game;
  setupTuning({ onChange: () => game.resize(), onOpen: () => game.setPause(true) });
}

game.start();
setupInstall(document.getElementById('btnInstall') as HTMLButtonElement, document.getElementById('iosInstallHint') as HTMLElement);
// offline support and installation (the service worker only exists in the production build)
registerSW({ immediate: true });
