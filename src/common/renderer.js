// Renderer — manages a low-res pixel buffer that is scaled up pixel-perfect
// to fill the browser window (letterboxed, no interpolation).

import { PixelBuffer } from './pixelbuffer.js';

export const RENDER_W = 320;
export const RENDER_H = 200;

export function initRenderer(displayCanvas, palette) {
  // The display canvas fills the window (sized via CSS, letterboxed).
  const displayCtx = displayCanvas.getContext('2d');
  displayCtx.imageSmoothingEnabled = false;

  // Offscreen canvas at render resolution — all drawing happens here.
  const offscreen = document.createElement('canvas');
  offscreen.width  = RENDER_W;
  offscreen.height = RENDER_H;
  const offCtx = offscreen.getContext('2d');
  offCtx.imageSmoothingEnabled = false;

  const buffer = new PixelBuffer(RENDER_W, RENDER_H, palette);

  applyScale(displayCanvas);
  window.addEventListener('resize', () => applyScale(displayCanvas));

  function present() {
    // 1. Flush pixel buffer to offscreen canvas.
    buffer.flush(offCtx, RENDER_W, RENDER_H);
    // 2. Scale offscreen up to display canvas (nearest-neighbour via CSS + drawImage).
    const { dw, dh } = getScaledSize();
    displayCanvas.width  = dw;
    displayCanvas.height = dh;
    displayCtx.imageSmoothingEnabled = false;
    displayCtx.drawImage(offscreen, 0, 0, dw, dh);
  }

  return { buffer, present, width: RENDER_W, height: RENDER_H };
}

function getScaledSize() {
  const scaleX = window.innerWidth  / RENDER_W;
  const scaleY = window.innerHeight / RENDER_H;
  const scale  = Math.min(scaleX, scaleY);
  return {
    dw: Math.floor(RENDER_W * scale),
    dh: Math.floor(RENDER_H * scale),
  };
}

function applyScale(canvas) {
  const { dw, dh } = getScaledSize();
  canvas.style.width  = `${dw}px`;
  canvas.style.height = `${dh}px`;
}

export function startLoop(update) {
  let last = null;
  function tick(timestamp) {
    const dt = last === null ? 0 : (timestamp - last) / 1000;
    last = timestamp;
    update(dt);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
