// Ticker — horizontally scrolling text strip.
// Text is pre-rasterized into a sprite; scrollX advances each frame and wraps.

import { rasterizeText } from './font.js';

// Fetch a text file, slice lines [startLine, endLine) (0-indexed, endLine null = EOF),
// strip blank lines, and join into a single scrolling string.
export async function loadTickerText(url, startLine = 0, endLine = null) {
  const raw    = await fetch(url).then(r => r.text());
  const lines  = raw.split('\n');
  const sliced = lines.slice(startLine, endLine ?? lines.length);
  return sliced
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .join('   ·   ');
}

// Build a ticker from a pre-rasterized sprite and a scroll speed (px/sec).
export function createTicker(sprite, speed) {
  let scrollX = 0;

  function update(dt) {
    scrollX = (scrollX + speed * dt) % sprite.w;
  }

  function getScrollX() { return Math.floor(scrollX); }

  return { update, getScrollX, sprite };
}
