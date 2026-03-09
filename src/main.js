import { initRenderer, startLoop, RENDER_W, RENDER_H } from './common/renderer.js';
import { C64_PALETTE }                    from './common/palette.js';
import { rasterizeText }                  from './common/font.js';
import { loadTickerText, createTicker }   from './common/ticker.js';
import { createSunsetDemo }               from './demo/sunset/sunset.js';
import { generateSunsetConfig, MAX_DISPLAY_TIME, FADE_DURATION, FADE_IN_DURATION } from './demo/sunset/config.js';
import { createC64Demo }                  from './demo/c64/c64.js';
import { generateC64Config, C64_W, C64_H } from './demo/c64/config.js';
import { buildCharset }                   from './demo/c64/charset.js';
import { createDriveDemo }               from './demo/drive/drive.js';
import { generateDriveConfig }           from './demo/drive/config.js';
import { loadSprite, loadSpriteQuantized, classifyCactusPixel } from './common/loadSprite.js';
import { DRIVE_PALETTE }                  from './common/palette.js';
import { createLoadingScreen }            from './common/loading.js';
import { wrapWithAutoFade }               from './common/fade.js';
import { createFpsCounter }              from './common/ui/fps.js';
import { createMusicPlayer }             from './common/ui/music.js';
import { DEMOS }                          from './config.js';

// Parse README-style markdown into clean display lines for the credits scroll.
// Returns an array of strings; empty strings are blank spacer lines.
function parseCreditsLines(raw) {
  const lines = [];
  let inCode = false;
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (t.startsWith('```')) { inCode = !inCode; continue; }
    if (inCode) continue;
    if (t === '---') { lines.push(''); continue; }
    const hm = t.match(/^#{1,3}\s+(.+)$/);
    if (hm) { lines.push(hm[1].toUpperCase()); lines.push(''); continue; }
    const c = t
      .replace(/\*\*\[([^\]]+)\]\([^)]+\)\*\*/g, (_, s) => s.toUpperCase())
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^-\s+/, '');
    lines.push(c);
  }
  return lines;
}
// Fetch and parse the source file; returns raw string[] (no rasterization yet).
async function loadRawCreditLines(url) {
  const raw = await fetch(url).then(r => r.text());
  return parseCreditsLines(raw);
}
// Word-wrap a single line to maxChars, breaking at spaces where possible.
function wrapLine(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const result = [];
  let remaining = text;
  while (remaining.length > maxChars) {
    let breakAt = remaining.lastIndexOf(' ', maxChars);
    if (breakAt <= 0) breakAt = maxChars;
    result.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }
  if (remaining.length > 0) result.push(remaining);
  return result;
}
// Wrap each line to maxCharsPerLine and rasterize to sprites (null = spacer).
function buildCreditLines(rawLines, maxCharsPerLine) {
  const wrapped = [];
  for (const line of rawLines) {
    if (line.length === 0) { wrapped.push(''); continue; }
    for (const w of wrapLine(line, maxCharsPerLine)) wrapped.push(w);
  }
  return wrapped.map(l => l.length > 0 ? rasterizeText(l, 'C64 Pro Mono', 8, 1, 1) : null);
}

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
// onProgress(0..1): optional callback for loading screen progress reporting.
// Font must be loaded by the caller before calling this function.
async function startSunset(buffer, present, setPalette, setUpdate, sampleFps, onProgress, onFadeOut = null, onComplete = null) {
  onProgress?.(0.5);

  // 16px = clean 2× of the native 8px C64 glyph grid.
  const titleSprite = rasterizeText('//  SPLASH 64  //', 'C64 Pro Mono', 16, 1, 1);
  const config      = Object.assign(generateSunsetConfig(titleSprite), DEMOS.sunset ?? {});
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

  // Load all palm variants + car sprites once — reused across drive demo restarts.
  // Each resolved promise nudges the loading bar forward (0.1 → 0.5).
  // Credits lines are loaded in parallel (fonts already ready at this point).
  const creditsPromise = loadRawCreditLines('./README.md');
  function spriteProgress(i, total) { loading.setProgress(0.1 + (i / total) * 0.4); }
  const spriteJobs = [
    loadSprite('./graphics/palm1.png'),
    loadSprite('./graphics/palm2.png'),
    loadSprite('./graphics/cactus.png',  classifyCactusPixel),
    loadSprite('./graphics/cactus2.png', classifyCactusPixel),
    loadSpriteQuantized('./graphics/car.png',      DRIVE_PALETTE),
    loadSpriteQuantized('./graphics/car-left.png', DRIVE_PALETTE),
  ];
  let spritesDone = 0;
  spriteJobs.forEach(p => p.then(() => spriteProgress(++spritesDone, spriteJobs.length)));
  const [palm1, palm2, cactus1, cactus2, carSprite, carSpriteLeft] = await Promise.all(spriteJobs);
  const rawCreditLines = await creditsPromise;
  const palmVariants   = [palm1, palm2];
  const cactusVariants = [cactus1, cactus2];

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
      generateC64Config().then(cfg => {
        const config = Object.assign(cfg, DEMOS.c64 ?? {});
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
    } else if (next === 'drive') {
      renderer.resize(RENDER_W, RENDER_H);
      const config = Object.assign(generateDriveConfig(), DEMOS.drive ?? {});
      renderer.setPalette(config.palette);
      const titleSprite = rasterizeText('//  DRIVE 64  //', 'C64 Pro Mono', 16, 1, 1);
      const creditLines = buildCreditLines(rawCreditLines, config.credits.maxCharsPerLine);
      const demo = createDriveDemo(renderer.buffer, { config, titleSprite, palmVariants, cactusVariants, carSprite, carSpriteLeft, creditLines });
      setUpdate(wrapWithAutoFade(
        dt => { sampleFps(dt); demo.update(dt); renderer.present(); },
        config.maxDisplayTime, config.fadeDuration, config.fadeInDuration,
        undefined, restart,
      ));
    } else {
      const newBuf = renderer.resize(RENDER_W, RENDER_H);
      startSunset(newBuf, renderer.present, renderer.setPalette, setUpdate, sampleFps, undefined, t => music.fadeVolume(t), restart);
    }
  }

  if (demoName === 'c64') {
    renderer.setPalette(C64_PALETTE);
    loading.setProgress(0.6);

    const charset = buildCharset('C64 Pro Mono', 8);
    const cfg     = await generateC64Config();
    const config  = Object.assign(cfg, DEMOS.c64 ?? {});
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

  } else if (demoName === 'drive') {
    const config = Object.assign(generateDriveConfig(), DEMOS.drive ?? {});
    renderer.setPalette(config.palette);
    const titleSprite = rasterizeText('//  DRIVE 64  //', 'C64 Pro Mono', 16, 1, 1);
    const creditLines = buildCreditLines(rawCreditLines, config.credits.maxCharsPerLine);
    const demo = createDriveDemo(renderer.buffer, { config, titleSprite, palmVariants, cactusVariants, carSprite, carSpriteLeft, creditLines });
    setUpdate(wrapWithAutoFade(
      dt => { sampleFps(dt); demo.update(dt); renderer.present(); },
      config.maxDisplayTime,
      config.fadeDuration,
      config.fadeInDuration,
      undefined,
      restart,
    ));
    loading.hide();

  } else {
    // Map startSunset's 0..1 progress into the 0.5..1.0 range (sprites consumed 0.1→0.5).
    await startSunset(
      renderer.buffer, renderer.present, renderer.setPalette, setUpdate, sampleFps,
      p => loading.setProgress(0.5 + p * 0.5),
      undefined,
      restart,
    );
    loading.hide();
  }
}

init();
