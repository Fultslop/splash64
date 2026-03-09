import { initRenderer, startLoop, RENDER_W, RENDER_H } from './common/renderer.js';
import { C64_PALETTE }                    from './common/palette.js';
import { rasterizeText }                  from './common/font.js';
import { loadTickerText, createTicker }   from './common/ticker.js';
import { createSunsetDemo }               from './demo/sunset/sunset.js';
import { generateSunsetConfig, MAX_DISPLAY_TIME, FADE_DURATION, FADE_IN_DURATION } from './demo/sunset/config.js';
import { createC64Demo }                  from './demo/c64/c64.js';
import { generateC64Config, C64_W, C64_H } from './demo/c64/config.js';
import { buildCharset }                   from './demo/c64/charset.js';
import { createLoadingScreen }            from './common/loading.js';
import { wrapWithAutoFade }               from './common/fade.js';
import { createFpsCounter }              from './common/ui/fps.js';
import { createMusicPlayer }             from './common/ui/music.js';

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
// onProgress(0..1): optional callback for loading screen progress reporting.
// Font must be loaded by the caller before calling this function.
async function startSunset(buffer, present, setPalette, setUpdate, sampleFps, onProgress, onFadeOut = null, onComplete = null) {
  onProgress?.(0.5);

  // 16px = clean 2× of the native 8px C64 glyph grid.
  const titleSprite = rasterizeText('//  SPLASH 64  //', 'C64 Pro Mono', 16, 1, 1);
  const config      = generateSunsetConfig(titleSprite);
  setPalette(config.palette);

  const tickerText   = await loadTickerText('./doc/agent/devlog.md', 10);
  onProgress?.(0.9);

  const tickerSprite = rasterizeText(tickerText, 'C64 Pro Mono', 8, 1, 1);
  const ticker       = createTicker(tickerSprite, 40);

  const demo = createSunsetDemo(buffer, { titleSprite, ticker, config });
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

  await document.fonts.ready;
  // Force-load the local @font-face font — document.fonts.ready only guarantees
  // fonts already in the loading queue (i.e. linked via <link> or used in CSS).
  // A @font-face font that isn't used in any CSS rule is never fetched until here.
  await document.fonts.load('8px "C64 Pro Mono"');
  loading.setProgress(0.1);

  const canvas    = document.getElementById('screen');
  const demoName  = chooseDemoName();

  // Each demo gets its own buffer size; the renderer is sized up front.
  const [rw, rh]  = demoName === 'c64' ? [C64_W, C64_H] : [RENDER_W, RENDER_H];
  const renderer  = initRenderer(canvas, C64_PALETTE, rw, rh);
  const { setUpdate } = startLoop(() => {});  // noop until first demo is ready
  const sampleFps = createFpsCounter();
  const music = createMusicPlayer({ src: './music/very-superbeep.mp3', volume: 0.5, visible: true });

  // Restart: pick the next demo and launch it without a loading screen.
  function restart() {
    const next = chooseDemoName();
    if (next === 'c64') {
      renderer.resize(C64_W, C64_H);
      renderer.setPalette(C64_PALETTE);
      const charset = buildCharset('C64 Pro Mono', 8);
      generateC64Config().then(config => {
        const onComplete = () => {
          const newBuf = renderer.resize(RENDER_W, RENDER_H);
          startSunset(newBuf, renderer.present, renderer.setPalette, setUpdate, sampleFps, undefined, t => music.fadeVolume(t), restart);
        };
        const onTickerStart = () => music.scheduleReveal(config.musicDelay ?? 0);
        const demo = createC64Demo(renderer.buffer, { charset, config, onComplete, onTickerStart });
        setUpdate(wrapWithAutoFade(
          dt => { sampleFps(dt); demo.update(dt); renderer.present(); },
          config.maxDisplayTime, config.fadeDuration, config.fadeInDuration,
          t => music.fadeVolume(t), restart,
        ));
      });
    } else {
      const newBuf = renderer.resize(RENDER_W, RENDER_H);
      startSunset(newBuf, renderer.present, renderer.setPalette, setUpdate, sampleFps, undefined, t => music.fadeVolume(t), restart);
    }
  }

  if (demoName === 'c64') {
    renderer.setPalette(C64_PALETTE);
    loading.setProgress(0.5);

    const charset = buildCharset('C64 Pro Mono', 8);
    const config  = await generateC64Config();
    loading.setProgress(1.0);
    loading.hide();

    const onComplete = () => {
      // Shrink to the standard render resolution for the sunset demo.
      const newBuffer = renderer.resize(RENDER_W, RENDER_H);
      startSunset(newBuffer, renderer.present, renderer.setPalette, setUpdate, sampleFps, undefined, t => music.fadeVolume(t), restart);
    };
    const onTickerStart = () => music.scheduleReveal(config.musicDelay ?? 0);
    const demo = createC64Demo(renderer.buffer, { charset, config, onComplete, onTickerStart });
    setUpdate(wrapWithAutoFade(
      dt => { sampleFps(dt); demo.update(dt); renderer.present(); },
      config.maxDisplayTime,
      config.fadeDuration,
      config.fadeInDuration,
      t => music.fadeVolume(t),
      restart,
    ));

  } else {
    // Map startSunset's 0..1 progress into the 0.1..1.0 range (0.1 already consumed above).
    await startSunset(
      renderer.buffer, renderer.present, renderer.setPalette, setUpdate, sampleFps,
      p => loading.setProgress(0.1 + p * 0.9),
      undefined,
      restart,
    );
    loading.hide();
  }
}

init();
