// Renderer — manages a low-res pixel buffer that is scaled up pixel-perfect
// to fill the browser window (letterboxed, no interpolation).

import { PixelBuffer } from './pixelbuffer.js';
import { applyFullCRTEffect } from './postrender.js';

export const RENDER_W = 320;
export const RENDER_H = 200;

export function initRenderer(displayCanvas, palette, w = RENDER_W, h = RENDER_H) {
  const displayCtx = displayCanvas.getContext('2d');
  displayCtx.imageSmoothingEnabled = false;

  let rw = w, rh = h;
  let offscreen  = createOffscreen(rw, rh);
  let _palette   = palette;
  let _buffer    = new PixelBuffer(rw, rh, _palette);
  let _dw = 0, _dh = 0;

  // Sets display canvas dimensions only when they actually change — avoids
  // resetting the canvas backing store (expensive) every frame.
  function applyDisplaySize() {
    const { dw, dh } = getScaledSize(rw, rh);
    if (dw !== _dw || dh !== _dh) {
      displayCanvas.width  = dw;
      displayCanvas.height = dh;
      displayCtx.imageSmoothingEnabled = false;
      _dw = dw; _dh = dh;
    }
  }

  applyDisplaySize();
  applyScale(displayCanvas, rw, rh);
  window.addEventListener('resize', () => { applyDisplaySize(); applyScale(displayCanvas, rw, rh); });

  function present() {
    const offCtx = offscreen.getContext('2d');
    applyFullCRTEffect(_buffer.imageData);
    _buffer.flush(offCtx);
    displayCtx.drawImage(offscreen, 0, 0, _dw, _dh);
  }

  // Resize the buffer (e.g. when transitioning between demos).
  // Returns the new PixelBuffer. Uses the current palette (not the original constructor arg).
  function resize(newW, newH) {
    rw = newW; rh = newH;
    offscreen = createOffscreen(rw, rh);
    _buffer   = new PixelBuffer(rw, rh, _palette);
    applyDisplaySize();
    applyScale(displayCanvas, rw, rh);
    return _buffer;
  }

  return {
    get buffer() { return _buffer; },
    present,
    setPalette: p => { _palette = p; _buffer.setPalette(p); },
    resize,
  };
}

function createOffscreen(w, h) {
  const c = document.createElement('canvas');
  c.width  = w;
  c.height = h;
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
}

function getScaledSize(w, h) {
  const scaleX = window.innerWidth  / w;
  const scaleY = window.innerHeight / h;
  const scale  = Math.min(scaleX, scaleY);
  return {
    dw: Math.floor(w * scale),
    dh: Math.floor(h * scale),
  };
}

function applyScale(canvas, w, h) {
  const { dw, dh } = getScaledSize(w, h);
  canvas.style.width  = `${dw}px`;
  canvas.style.height = `${dh}px`;
}

export function startLoop(initialUpdate) {
  let update = initialUpdate;
  let last = null;
  function tick(timestamp) {
    const dt = last === null ? 0 : (timestamp - last) / 1000;
    last = timestamp;
    update(dt);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return { setUpdate: fn => { update = fn; } };
}
