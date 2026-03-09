// Music player — off by default, hidden until the ticker phase starts.
// Config: { src, volume (0..1), visible (show the button at all) }
// Returns { scheduleReveal(delaySecs), fadeVolume(t) }.
export function createMusicPlayer({ src, volume = 0.5, visible = false } = {}) {
  const audio  = new Audio(src);
  audio.loop   = true;
  audio.volume = volume;

  const el = document.createElement('div');
  el.textContent = '\u266a off';
  el.style.cssText = 'position:fixed;top:8px;right:8px;font:bold 16px monospace;'
    + 'color:#666;background:rgba(0,0,0,.55);padding:4px 10px;cursor:pointer;'
    + 'z-index:9999;user-select:none;display:none';
  document.body.appendChild(el);

  const baseVolume = volume;
  let playing = false;

  function play()  { playing = true;  audio.play();  el.textContent = '\u266a on';  el.style.color = '#0f0'; }
  function pause() { playing = false; audio.pause(); el.textContent = '\u266a off'; el.style.color = '#666'; }

  el.addEventListener('click', () => { playing ? pause() : play(); });

  return {
    // Reveal the button after delaySecs (user still has to click to play).
    scheduleReveal(delaySecs) {
      if (!visible) return;
      setTimeout(() => { el.style.display = 'block'; }, delaySecs * 1000);
    },
    // Scale volume by (1 - t) — call with t 0→1 during fade-out.
    fadeVolume(t) { audio.volume = baseVolume * (1 - t); },
  };
}
