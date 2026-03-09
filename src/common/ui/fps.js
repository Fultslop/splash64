// FPS counter — DOM overlay, sampled at 2 Hz, toggled by pressing 'f'.
// Zero cost when hidden: the sample() fn returns immediately.
export function createFpsCounter() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:8px;left:8px;font:bold 13px monospace;'
    + 'color:#0f0;background:rgba(0,0,0,.55);padding:2px 8px;display:none;z-index:9999';
  document.body.appendChild(el);

  let visible = false, frames = 0, accum = 0;

  window.addEventListener('keydown', e => {
    if (e.key === 'f') {
      visible = !visible;
      el.style.display = visible ? 'block' : 'none';
      frames = 0; accum = 0;  // fresh reading on each toggle-on
    }
  });

  return function sample(dt) {
    if (!visible) return;
    frames++;
    accum += dt;
    if (accum >= 0.5) {
      el.textContent = `${Math.round(frames / accum)} fps`;
      frames = 0;
      accum  = 0;
    }
  };
}
