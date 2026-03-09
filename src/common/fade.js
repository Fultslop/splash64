// fade.js — auto-fade wrapper for demo update functions.
// Imports setFade from postrender so callers don't need to touch it directly.

import { setFade } from './postrender.js';

// Wrap an update function with a fade-to-black auto-reload after maxTime seconds.
// Handles both fade-in at start and fade-out before reload.
// Resets any in-progress fade from a previous demo when called.
export function wrapWithAutoFade(updateFn, maxTime, fadeDuration, fadeInDuration = 0, onFadeOut = null, onComplete = null) {
  setFade(1);  // start fully black; fade-in will clear it
  let elapsed = 0;
  let done = false;
  return function(dt) {
    if (done) return;
    elapsed += dt;
    if (elapsed < fadeInDuration) {
      setFade(1 - elapsed / fadeInDuration);
    } else if (elapsed > maxTime) {
      const t = Math.min(1, (elapsed - maxTime) / fadeDuration);
      setFade(t);
      onFadeOut?.(t);
      if (t >= 1) {
        done = true;
        if (onComplete) { onComplete(); } else { location.reload(); }
        return;
      }
    } else {
      setFade(0);
    }
    updateFn(dt);
  };
}
