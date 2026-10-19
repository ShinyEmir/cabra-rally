// Install prompts. Android and desktop Chrome offer installation through an event the page can
// keep and fire from a button; iPhone has no prompt, so the home screen explains the two taps.

/** The event Chrome fires when the app can be installed (not in the standard DOM types yet). */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || nav.standalone === true;
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, so also check for touch
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function setupInstall(button: HTMLButtonElement, iosHint: HTMLElement): void {
  if (isStandalone()) return;
  if (isIos()) iosHint.hidden = false;
  let pending: InstallPromptEvent | null = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pending = e as InstallPromptEvent;
    button.hidden = false;
  });
  button.addEventListener('click', () => {
    if (!pending) return;
    const ev = pending;
    pending = null;
    button.hidden = true;
    void ev.prompt().catch(() => { /* the player can still install from the browser menu */ });
  });
  window.addEventListener('appinstalled', () => { button.hidden = true; pending = null; });
}
