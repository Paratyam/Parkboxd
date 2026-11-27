// "Add to home screen". Chrome, Edge and Android give us a real install prompt; elsewhere
// (iPhones especially) the best we can do is say where the button is.
import { toast } from './ui.js?v=20261127122229';

let promptEvent = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptEvent = e; });

const installed = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isApple = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Put the button in the footer (not when we're already running as an installed app). */
export function addInstallButton(container) {
  if (!container || installed()) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'link-button';
  b.textContent = '📱 Add to home screen';
  b.addEventListener('click', async () => {
    if (promptEvent) {
      const e = promptEvent;
      promptEvent = null; // each prompt only works once
      await e.prompt();
      return;
    }
    toast(isApple()
      ? 'Tap the Share button in your browser, then "Add to Home Screen".'
      : 'Open your browser menu and choose "Install app" or "Add to Home screen".', 8000);
  });
  container.append(b);
}
