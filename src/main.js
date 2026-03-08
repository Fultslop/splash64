import { initRenderer, startLoop }        from './common/renderer.js';
import { C64_PALETTE }                    from './common/palette.js';
import { rasterizeText }                  from './common/font.js';
import { loadTickerText, createTicker }   from './common/ticker.js';
import { createSunsetDemo }               from './demo/sunset/sunset.js';
import { generateSunsetConfig }           from './demo/sunset/config.js';
import { createC64Demo }                  from './demo/c64/c64.js';
import { generateC64Config }              from './demo/c64/config.js';
import { buildCharset }                   from './demo/c64/charset.js';

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
async function startSunset(buffer, present, setPalette, setUpdate) {
  const titleSprite = rasterizeText('Fultslop - Claude', 'Shojumaru', 36);
  const config      = generateSunsetConfig(titleSprite);

  setPalette(config.palette);

  const tickerText   = await loadTickerText('./doc/agent/devlog.md', 10);
  const tickerSprite = rasterizeText(tickerText, 'Press Start 2P', 10, 1, 1);
  const ticker       = createTicker(tickerSprite, 40);

  const demo = createSunsetDemo(buffer, { titleSprite, ticker, config });
  setUpdate(dt => { demo.update(dt); present(); });
}

async function init() {
  await document.fonts.ready;

  const canvas                           = document.getElementById('screen');
  const { buffer, present, setPalette }  = initRenderer(canvas, C64_PALETTE);
  const { setUpdate }                    = startLoop(() => {});  // noop until first demo is ready

  const demoName = chooseDemoName();

  if (demoName === 'c64') {
    setPalette(C64_PALETTE);

    // Force-load the local @font-face font — document.fonts.ready only guarantees
    // fonts already in the loading queue (i.e. linked via <link> or used in CSS).
    // A @font-face font that isn't used in any CSS rule is never fetched until here.
    await document.fonts.load('8px "C64 Pro Mono"');

    const charset = buildCharset('C64 Pro Mono', 8);
    const config  = await generateC64Config();

    const onComplete = () => startSunset(buffer, present, setPalette, setUpdate);
    const demo = createC64Demo(buffer, { charset, config, onComplete });
    setUpdate(dt => { demo.update(dt); present(); });

  } else {
    await startSunset(buffer, present, setPalette, setUpdate);
  }
}

init();
