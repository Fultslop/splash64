// Retro-style loading overlay — shown during async init, hidden when the demo is ready.
// Uses only system monospace font so it works before any assets are loaded.
export function createLoadingScreen() {
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'background:#000',
    'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center',
    'z-index:9999',
  ].join(';');

  const label = document.createElement('div');
  label.textContent = '// FS SPLASH //';
  label.style.cssText = 'color:#888;font:bold 13px monospace;letter-spacing:0.35em;margin-bottom:28px';

  const barWrap = document.createElement('div');
  barWrap.style.cssText = 'width:200px;height:12px;border:1px solid #444;padding:2px';

  const bar = document.createElement('div');
  bar.style.cssText = 'width:0%;height:100%;background:#aaa;transition:width 80ms linear';

  const pct = document.createElement('div');
  pct.textContent = '0%';
  pct.style.cssText = 'color:#444;font:11px monospace;letter-spacing:0.1em;margin-top:10px';

  barWrap.appendChild(bar);
  overlay.appendChild(label);
  overlay.appendChild(barWrap);
  overlay.appendChild(pct);
  document.body.appendChild(overlay);

  return {
    setProgress(p) {
      const v = Math.round(Math.min(p, 1) * 100);
      bar.style.width = v + '%';
      pct.textContent = v + '%';
    },
    hide() {
      overlay.remove();
    },
  };
}
