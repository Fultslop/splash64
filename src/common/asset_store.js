// asset_store.js — centralised asset registry, cache, and loader.
//
// Usage:
//   const store = createAssetStore();
//   store.addFont('C64 Pro Mono');
//   store.addSprite('palm1', './graphics/palm1.png');
//   store.addSpriteQuantized('car', './graphics/car.png', DRIVE_PALETTE);
//   store.addText('credits-raw', './README.md');
//   store.addMusic('music', { src: './music/foo.mp3', volume: 0.5, visible: true });
//
//   const onProgress = p => loadingBar.setProgress(p);
//   store.onProgress(onProgress);
//   await store.load();
//   store.offProgress(onProgress);
//
//   const palm1 = store.get('palm1');

import { loadSprite, loadSpriteQuantized, classifyPalmPixel, PALM_N_LAYERS } from './loadSprite.js';
import { createMusicPlayer } from './ui/music.js';

export function createAssetStore() {
  const cache     = new Map();
  const pending   = []; // { key, loader: () => Promise<value> }
  const listeners = new Set();

  function notify(p) {
    for (const fn of listeners) fn(p);
  }

  return {
    // Font — key is the CSS font-family name declared in @font-face.
    // Loads via a DOM probe + synchronous layout to ensure Chrome's CSS engine
    // queues the font before we await document.fonts.load().
    addFont(key) {
      if (cache.has(key)) return;
      pending.push({
        key,
        loader: async () => {
          const probe = document.createElement('span');
          probe.style.cssText = `font-family:"${key}";font-size:8px;position:absolute;top:-9999px;left:-9999px`;
          probe.textContent   = 'x';
          document.body.appendChild(probe);
          probe.getBoundingClientRect(); // force sync layout → signals Chrome to start loading
          await new Promise(r => requestAnimationFrame(r)); // let Chrome add it to the font queue
          const loaded = await document.fonts.load(`8px "${key}"`);
          probe.remove();
          if (loaded.length === 0) {
            console.warn(`[asset_store] font "${key}" did not load — check @font-face src`);
            return false;
          }
          // Warm up the font in a canvas context. After fonts.load() resolves,
          // Chrome may not have initialised the font for canvas rendering yet —
          // drawing a glyph here ensures all subsequent canvas contexts can use it.
          const warm = document.createElement('canvas').getContext('2d');
          warm.font = `8px "${key}"`;
          warm.fillText('M', 0, 0);
          return true;
        },
      });
    },

    // Layered PNG sprite (palms, cacti, etc.).
    addSprite(key, url, classify = classifyPalmPixel, nLayers = PALM_N_LAYERS) {
      if (cache.has(key)) return;
      pending.push({ key, loader: () => loadSprite(url, classify, nLayers) });
    },

    // Palette-quantized PNG sprite (car, etc.).
    addSpriteQuantized(key, url, palette) {
      if (cache.has(key)) return;
      pending.push({ key, loader: () => loadSpriteQuantized(url, palette) });
    },

    // Raw text file — returns the full string; caller is responsible for parsing.
    addText(key, url) {
      if (cache.has(key)) return;
      pending.push({ key, loader: () => fetch(url).then(r => r.text()) });
    },

    // Music player — instantiated during load() so DOM mutations happen at the
    // right time. createMusicPlayer is synchronous; wrapped in a resolved promise.
    addMusic(key, options) {
      if (cache.has(key)) return;
      pending.push({ key, loader: () => Promise.resolve(createMusicPlayer(options)) });
    },

    // Progress listeners — called with a value in [0, 1] as each asset finishes.
    onProgress(fn)  { listeners.add(fn);    },
    offProgress(fn) { listeners.delete(fn); },

    // Load all registered (non-cached) assets concurrently.
    // Progress is reported incrementally as each job completes.
    async load() {
      const jobs = pending.splice(0); // drain pending list
      if (jobs.length === 0) { notify(1); return; }

      let done = 0;
      notify(0);

      await Promise.all(jobs.map(async ({ key, loader }) => {
        const value = await loader();
        cache.set(key, value);
        notify(++done / jobs.length);
      }));
    },

    // Retrieve a loaded asset by key.
    get(key) { return cache.get(key); },
  };
}
