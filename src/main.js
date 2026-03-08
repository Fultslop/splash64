import { initRenderer, startLoop, RENDER_W, RENDER_H } from './common/renderer.js';
import { C64_PALETTE }                    from './common/palette.js';
import { rasterizeText }                  from './common/font.js';
import { loadTickerText, createTicker }   from './common/ticker.js';
import { createSunsetDemo }               from './demo/sunset/sunset.js';
import { generateSunsetConfig }           from './demo/sunset/config.js';
import { createC64Demo }                  from './demo/c64/c64.js';
import { generateC64Config }              from './demo/c64/config.js';
import { buildCharset }                   from './demo/c64/charset.js';

// C64 buffer includes the authentic border area around the 320×200 active display.
const C64_W = 384;
const C64_H = 272;

// FPS counter — DOM overlay, sampled at 2 Hz, toggled by pressing 'f'.
// Zero cost when hidden: the sample() fn returns immediately.
function createFpsCounter() {
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

// Music player — off by default, click to toggle. Starts on first click (browser policy).
// Config: { src, volume (0..1), visible (show the button at all) }
function createMusicPlayer({ src, volume = 0.5, visible = false } = {}) {
  const audio  = new Audio(src);
  audio.loop   = true;
  audio.volume = volume;

  const el = document.createElement('div');
  el.textContent = '\u266a off';
  el.style.cssText = 'position:fixed;top:8px;right:8px;font:bold 16px monospace;'
    + 'color:#666;background:rgba(0,0,0,.55);padding:4px 10px;cursor:pointer;'
    + `z-index:9999;user-select:none;display:${visible ? 'block' : 'none'}`;
  document.body.appendChild(el);

  let playing = false;
  el.addEventListener('click', () => {
    playing = !playing;
    if (playing) { audio.play();  el.textContent = '\u266a on';  el.style.color = '#0f0'; }
    else         { audio.pause(); el.textContent = '\u266a off'; el.style.color = '#666'; }
  });
}

// Choose a demo name, never repeating the previous session's choice.
function chooseDemoName() {
  const DEMOS   = ['sunset', 'c64'];
  const last    = localStorage.getItem('lastDemo') ?? '';
  const choices = DEMOS.filter(d => d !== last);
  const name    = choices[Math.floor(Math.random() * choices.length)];
  localStorage.setItem('lastDemo', name);
  return name;
}

// Set up and start the sunset demo, swapping in the new palette and update fn.
async function startSunset(buffer, present, setPalette, setUpdate, sampleFps) {
  const titleSprite = rasterizeText('// Fultslop //', 'Shojumaru', 36);
  const config      = generateSunsetConfig(titleSprite);

  setPalette(config.palette);

  const tickerText   = await loadTickerText('./doc/agent/devlog.md', 10);
  const tickerSprite = rasterizeText(tickerText, 'Press Start 2P', 10, 1, 1);
  const ticker       = createTicker(tickerSprite, 40);

  const demo = createSunsetDemo(buffer, { titleSprite, ticker, config });
  setUpdate(dt => { sampleFps(dt); demo.update(dt); present(); });
}

async function init() {
  await document.fonts.ready;

  const canvas    = document.getElementById('screen');
  const demoName  = chooseDemoName();

  // Each demo gets its own buffer size; the renderer is sized up front.
  const [rw, rh]  = demoName === 'c64' ? [C64_W, C64_H] : [RENDER_W, RENDER_H];
  const renderer  = initRenderer(canvas, C64_PALETTE, rw, rh);
  const { setUpdate } = startLoop(() => {});  // noop until first demo is ready
  const sampleFps = createFpsCounter();
  createMusicPlayer({ src: './music/very-superbeep.mp3', volume: 0.5, visible: demoName === 'c64' });

  if (demoName === 'c64') {
    renderer.setPalette(C64_PALETTE);

    // Force-load the local @font-face font — document.fonts.ready only guarantees
    // fonts already in the loading queue (i.e. linked via <link> or used in CSS).
    // A @font-face font that isn't used in any CSS rule is never fetched until here.
    await document.fonts.load('8px "C64 Pro Mono"');

    const charset = buildCharset('C64 Pro Mono', 8);
    const config  = await generateC64Config();

    const onComplete = () => {
      // Shrink to the standard render resolution for the sunset demo.
      const newBuffer = renderer.resize(RENDER_W, RENDER_H);
      startSunset(newBuffer, renderer.present, renderer.setPalette, setUpdate, sampleFps);
    };
    const demo = createC64Demo(renderer.buffer, { charset, config, onComplete });
    setUpdate(dt => { sampleFps(dt); demo.update(dt); renderer.present(); });

  } else {
    await startSunset(renderer.buffer, renderer.present, renderer.setPalette, setUpdate, sampleFps);
  }
}

init();
