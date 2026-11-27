// Half-star rating input. Click/tap or use arrow keys; Delete clears.

export function starInput(el, { value = null, size = 32, label = 'Rating', onChange } = {}) {
  let current = value;
  el.className = 'star-input';
  el.style.setProperty('--size', `${size}px`);
  el.tabIndex = 0;
  el.setAttribute('role', 'slider');
  el.setAttribute('aria-label', label);
  el.setAttribute('aria-valuemin', '0');
  el.setAttribute('aria-valuemax', '5');
  el.innerHTML = '<span class="base">★★★★★</span><span class="fill" aria-hidden="true">★★★★★</span>';
  const fill = el.querySelector('.fill');

  function paint(v, preview = false) {
    fill.style.width = `${((v ?? 0) / 5) * 100}%`;
    el.classList.toggle('preview', preview);
  }
  function sync() {
    paint(current);
    el.setAttribute('aria-valuenow', String(current ?? 0));
    el.setAttribute('aria-valuetext', current ? `${current} stars` : 'Not rated');
  }
  function fromEvent(e) {
    const r = el.getBoundingClientRect();
    const v = Math.ceil(((e.clientX - r.left) / r.width) * 10) / 2;
    return Math.min(5, Math.max(0.5, v));
  }
  function set(v) {
    current = v;
    sync();
    onChange?.(current);
  }

  el.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') paint(fromEvent(e), true); });
  el.addEventListener('pointerleave', () => paint(current));
  el.addEventListener('click', (e) => {
    const v = fromEvent(e);
    set(v === current ? null : v); // clicking the same value again clears it
  });
  el.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5 }[e.key];
    if (step) {
      e.preventDefault();
      const v = Math.min(5, Math.max(0, (current ?? 0) + step));
      set(v === 0 ? null : v);
    } else if (e.key === 'Delete' || e.key === 'Backspace' || e.key === '0') {
      e.preventDefault();
      set(null);
    } else if (/^[1-5]$/.test(e.key)) {
      e.preventDefault();
      set(Number(e.key));
    }
  });

  sync();
  return {
    get value() { return current; },
    set value(v) { current = v; sync(); },
  };
}
