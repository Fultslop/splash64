import { initRenderer, startLoop } from './common/renderer.js';
import { rasterizeText } from './common/font.js';
import { loadTickerText, createTicker } from './common/ticker.js';
import { createSunsetDemo } from './demo/sunset/sunset.js';
import { generateSunsetConfig } from './demo/sunset/config.js';

async function init() {
  await document.fonts.ready;

  // Sprites are palette-agnostic, so rasterize before choosing palette.
  const titleSprite = rasterizeText('Fultslop - Claude', 'Shojumaru', 36);

  // All random choices for this session in one place.
  const config = generateSunsetConfig(titleSprite);

  const canvas = document.getElementById('screen');
  const { buffer, present } = initRenderer(canvas, config.palette);

  const tickerText   = await loadTickerText('./doc/agent/devlog.md', 10);
  const tickerSprite = rasterizeText(tickerText, 'Press Start 2P', 10, 1, 1);
  const ticker       = createTicker(tickerSprite, 40); // 40 px/sec — easy to tune

  const demo = createSunsetDemo(buffer, { titleSprite, ticker, config });

  startLoop((dt) => {
    demo.update(dt);
    present();
  });
}

init();
