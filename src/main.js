import { initRenderer, startLoop, RENDER_W, RENDER_H } from './common/renderer.js';
import { C64_PALETTE }                    from './common/palette.js';
import { rasterizeText }                  from './common/font.js';
import { processTickerText, createTicker } from './common/ticker.js';
import { createSunsetDemo }               from './demo/sunset/sunset.js';
import { generateSunsetConfig, MAX_DISPLAY_TIME, FADE_DURATION, FADE_IN_DURATION } from './demo/sunset/config.js';
import { createC64Demo }                  from './demo/c64/c64.js';
import { generateC64Config, C64_W, C64_H } from './demo/c64/config.js';
import { buildCharset }                   from './demo/c64/charset.js';
import { createDriveDemo }                from './demo/drive/drive.js';
import { generateDriveConfig }            from './demo/drive/config.js';
import { classifyCactusPixel }            from './common/loadSprite.js';
import { DRIVE_PALETTE }                  from './common/palette.js';
import { createLoadingScreen }            from './common/loading.js';
import { wrapWithAutoFade }               from './common/fade.js';
import { createFpsCounter }               from './common/ui/fps.js';
import { DEMOS }                          from './config.js';
import { parseCreditsLines, buildCreditLines } from './common/credits.js';
import { createAssetStore }               from './common/asset_store.js';

// Choose a demo name, never repeating the previous session's choice.
// When DEMOS has a single entry, always returns that entry (dev/test mode).
function chooseDemoName() {
  const names = Object.keys(DEMOS);
  if (names.length === 1) return names[0];
  const last    = localStorage.getItem('lastDemo') ?? '';
  const choices = names.filter(d => d !== last);
  const name    = choices[Math.floor(Math.random() * choices.length)];
  localStorage.setItem('lastDemo', name);
  return name;
}

// Set up and start the sunset demo, swapping in the new palette and update fn.
// All assets (titleSprite, tickerSprite) must be pre-built by the caller during
// the loading phase. startSunset is synchronous — no processing happens here.
// A fresh ticker wrapper is created each call so scrollX resets to 0.
function startSunset(buffer, present, setPalette, setUpdate, sampleFps, titleSprite, tickerSprite, onFadeOut = null, onComplete = null) {
  const config = Object.assign(generateSunsetConfig(titleSprite), DEMOS.sunset ?? {});
  setPalette(config.palette);

  const ticker = createTicker(tickerSprite, 40);
  const demo   = createSunsetDemo(buffer, { titleSprite, ticker, config });
  setUpdate(wrapWithAutoFade(
    dt => { sampleFps(dt); demo.update(dt); present(); },
    MAX_DISPLAY_TIME,
    FADE_DURATION,
    FADE_IN_DURATION,
    onFadeOut,
    onComplete,
  ));
}

async function init() {
  const loading = createLoadingScreen();
  const store   = createAssetStore();

  store.addFont('C64 Pro Mono');
  store.addSprite('palm1',   './graphics/palm1.png');
  store.addSprite('palm2',   './graphics/palm2.png');
  store.addSprite('cactus1', './graphics/cactus.png',  classifyCactusPixel);
  store.addSprite('cactus2', './graphics/cactus2.png', classifyCactusPixel);
  store.addSpriteQuantized('car',      './graphics/car.png',      DRIVE_PALETTE);
  store.addSpriteQuantized('car-left', './graphics/car-left.png', DRIVE_PALETTE);
  store.addText('credits-raw', './README.md');
  store.addText('devlog',      './doc/agent/devlog.md');
  store.addMusic('music', { src: './music/very-superbeep.mp3', volume: 0.5, visible: true });

  const onProgress = p => loading.setProgress(p);
  store.onProgress(onProgress);
  await store.load();
  store.offProgress(onProgress);

  // All async I/O is done. Rasterize text assets now, before hiding the loading
  // screen, so the demo can start immediately when loading.hide() is called.
  // 16px = clean 2× of the native 8px C64 glyph grid.
  const sunsetTitleSprite  = rasterizeText('//  SPLASH 64  //', 'C64 Pro Mono', 16, 1, 1);
  const tickerText         = processTickerText(store.get('devlog'), 10);
  const sunsetTickerSprite = rasterizeText(tickerText, 'C64 Pro Mono', 8, 1, 1);

  const palmVariants   = [store.get('palm1'), store.get('palm2')];
  const cactusVariants = [store.get('cactus1'), store.get('cactus2')];
  const carSprite      = store.get('car');
  const carSpriteLeft  = store.get('car-left');
  const rawCreditLines = parseCreditsLines(store.get('credits-raw'));
  const music          = store.get('music');

  const firstDemo     = chooseDemoName();
  const canvas        = document.getElementById('screen');
  const [rw, rh]      = firstDemo === 'c64' ? [C64_W, C64_H] : [RENDER_W, RENDER_H];
  const renderer      = initRenderer(canvas, C64_PALETTE, rw, rh);
  const { setUpdate } = startLoop(() => {});  // noop until first demo is ready
  const sampleFps     = createFpsCounter();

  // Launch a demo by name. Closes over all loaded assets and renderer.
  // Used for both the initial boot and every subsequent transition.
  function launchDemo(name) {
    if (name === 'c64') {
      renderer.resize(C64_W, C64_H);
      renderer.setPalette(C64_PALETTE);
      const charset = buildCharset('C64 Pro Mono', 8);
      generateC64Config().then(cfg => {
        const config = Object.assign(cfg, DEMOS.c64 ?? {});
        // C64 always transitions to sunset (not a random next demo).
        const onComplete = () => {
          const newBuf = renderer.resize(RENDER_W, RENDER_H);
          startSunset(newBuf, renderer.present, renderer.setPalette, setUpdate, sampleFps,
            sunsetTitleSprite, sunsetTickerSprite,
            t => music.fadeVolume(t), () => launchDemo(chooseDemoName()));
        };
        const onTickerStart = () => music.scheduleReveal(config.musicDelay ?? 0);
        const demo = createC64Demo(renderer.buffer, { charset, config, onComplete, onTickerStart });
        setUpdate(wrapWithAutoFade(
          dt => { sampleFps(dt); demo.update(dt); renderer.present(); },
          config.maxDisplayTime, config.fadeDuration, config.fadeInDuration,
          t => music.fadeVolume(t), () => launchDemo(chooseDemoName()),
        ));
      });

    } else if (name === 'drive') {
      renderer.resize(RENDER_W, RENDER_H);
      const config = Object.assign(generateDriveConfig(), DEMOS.drive ?? {});
      renderer.setPalette(config.palette);
      const titleSprite = rasterizeText('//  DRIVE 64  //', 'C64 Pro Mono', 16, 1, 1);
      const creditLines = buildCreditLines(rawCreditLines, config.credits.maxCharsPerLine);
      const demo = createDriveDemo(renderer.buffer, { config, titleSprite, palmVariants, cactusVariants, carSprite, carSpriteLeft, creditLines });
      setUpdate(wrapWithAutoFade(
        dt => { sampleFps(dt); demo.update(dt); renderer.present(); },
        config.maxDisplayTime, config.fadeDuration, config.fadeInDuration,
        undefined, () => launchDemo(chooseDemoName()),
      ));

    } else {
      const newBuf = renderer.resize(RENDER_W, RENDER_H);
      startSunset(newBuf, renderer.present, renderer.setPalette, setUpdate, sampleFps,
        sunsetTitleSprite, sunsetTickerSprite,
        t => music.fadeVolume(t), () => launchDemo(chooseDemoName()));
    }
  }

  // --- Initial boot ---
  loading.hide();

  if (firstDemo === 'c64') {
    launchDemo('c64');

  } else if (firstDemo === 'drive') {
    launchDemo('drive');

  } else {
    startSunset(
      renderer.buffer, renderer.present, renderer.setPalette, setUpdate, sampleFps,
      sunsetTitleSprite, sunsetTickerSprite,
      undefined, () => launchDemo(chooseDemoName()),
    );
  }
}

init();
