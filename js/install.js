// "Add to home screen". Chrome, Edge and Android give us a real install prompt; elsewhere
// (iPhones especially) the best we can do is say where the button is.
import { toast } from './ui.js?v=20261127140208';

const AD_KEY = 'parkboxd-install-ad'; // set once the home page ad has been closed
let promptEvent = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptEvent = e; });
window.addEventListener('appinstalled', () => document.querySelector('.install-ad')?.remove());

const installed = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isApple = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

async function install() {
  if (promptEvent) {
    const e = promptEvent;
    promptEvent = null; // each prompt only works once
    await e.prompt();
    return;
  }
  toast(isApple()
    ? 'Tap the Share button in your browser, then "Add to Home Screen".'
    : 'Open your browser menu and choose "Install app" or "Add to Home screen".', 8000);
}

/** Put the button in the footer (not when we're already running as an installed app). */
export function addInstallButton(container) {
  if (!container || installed()) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'link-button';
  b.textContent = '📱 Add to home screen';
  b.addEventListener('click', install);
  container.append(b);
}

/** A small corner ad (home page). Floats over the page, and stays gone once closed. */
export function showInstallAd() {
  let closed = false;
  try { closed = localStorage.getItem(AD_KEY) === '1'; } catch { /* show it */ }
  if (closed || installed()) return;
  const ad = document.createElement('aside');
  ad.className = 'install-ad paper';
  ad.setAttribute('aria-label', 'Get the Parkboxd app');
  ad.innerHTML = `
    <img src="icons/icon-192.png" alt="" width="52" height="52">
    <div>
      <strong class="cut">Parkboxd, now an app!</strong>
      <span>Put it on your home screen.</span>
      <button type="button" class="btn btn-green">Get the app</button>
    </div>
    <button type="button" class="install-ad-close" aria-label="Close this ad">✕</button>`;
  ad.querySelector('.btn').addEventListener('click', install);
  ad.querySelector('.install-ad-close').addEventListener('click', () => {
    ad.remove();
    try { localStorage.setItem(AD_KEY, '1'); } catch { /* gone for this visit */ }
  });
  document.body.append(ad);
}
