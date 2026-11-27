// Phones: a bar along the bottom with Home, Book Club, + Log, Cage Match and Mystery, and the
// profile tabs as one swipeable row. The bar only shows when you're logged in.

const icon = (paths) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const ITEMS = [
  { href: 'index.html', label: 'Home', icon: icon('<path d="M3 11 12 4l9 7"/><path d="M6 10v10h12V10"/>') },
  { href: 'club.html', label: 'Club', icon: icon('<path d="M12 6C9 4 6 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z"/><path d="M12 6v14"/>') },
  { log: true, label: 'Log', icon: icon('<path d="M12 5v14M5 12h14"/>') },
  { href: 'cage.html', label: 'Cage', icon: icon('<path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v3M8 20h8"/>') },
  { href: 'mystery.html', label: 'Mystery', icon: icon('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.7-4.7"/><path d="M8.8 8.8a1.8 1.8 0 1 1 2.3 2.1c-.4.2-.6.4-.6.9M10.5 14h0"/>') },
];

export function renderTabBar({ current, onLog }) {
  if (document.querySelector('.tab-bar')) return;
  const bar = document.createElement('nav');
  bar.className = 'tab-bar';
  bar.setAttribute('aria-label', 'Quick links');
  bar.innerHTML = ITEMS.map((i) => (i.log
    ? `<button type="button" class="tab-log"><span>${i.icon}</span>${i.label}</button>`
    : `<a href="${i.href}"${i.href === current ? ' aria-current="page"' : ''}>${i.icon}${i.label}</a>`)).join('');
  bar.querySelector('.tab-log').addEventListener('click', onLog);
  document.body.append(bar);
  document.body.classList.add('has-tab-bar');
}

// Scroll the open profile tab into view whenever a row of tabs appears.
export function followProfileTabs() {
  const centre = () => document.querySelectorAll('.profile-tabs:not([data-centred])').forEach((row) => {
    const here = row.querySelector('[aria-current="page"]');
    if (!here || !row.clientWidth) return;
    row.dataset.centred = '1';
    const a = here.getBoundingClientRect();
    const b = row.getBoundingClientRect();
    row.scrollLeft += a.left - b.left - (b.width - a.width) / 2;
  });
  centre();
  new MutationObserver(centre).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-busy'] });
}
