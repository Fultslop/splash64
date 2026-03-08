// Sunset demo — session config.
// All randomised choices for one page load live here.
// Call generateSunsetConfig(titleSprite) once at startup, before initRenderer.

import { PALETTES } from '../../common/palette.js';
import { RENDER_W, RENDER_H } from '../../common/renderer.js';

// Tuneable constants (not randomised).
export const TICKER_H         = 24;
export const TITLE_TICKER_GAP = 30; // minimum px gap between title and ticker bar

export function generateSunsetConfig(titleSprite) {
  // --- Palette: no repeat on consecutive refreshes ---
  const lastIdx  = parseInt(localStorage.getItem('paletteIdx') ?? '-1', 10);
  const available = PALETTES.map((_, i) => i).filter(i => i !== lastIdx);
  const paletteIdx = available[Math.floor(Math.random() * available.length)];
  localStorage.setItem('paletteIdx', paletteIdx);

  // --- Title: random Y within screen bounds ---
  const titleMinY = Math.floor(RENDER_H * 0.08);
  const titleMaxY = RENDER_H - titleSprite.h;
  const titleY    = titleMinY + Math.floor(Math.random() * (titleMaxY - titleMinY + 1));
  const titleX    = Math.floor((RENDER_W - titleSprite.w) / 2);

  // --- Ticker: random Y, above or below title, respecting gap ---
  const aboveZone = titleY - TICKER_H - TITLE_TICKER_GAP >= 0
    ? [0, titleY - TICKER_H - TITLE_TICKER_GAP]
    : null;
  const belowZone = titleY + titleSprite.h + TITLE_TICKER_GAP <= RENDER_H - TICKER_H
    ? [titleY + titleSprite.h + TITLE_TICKER_GAP, RENDER_H - TICKER_H]
    : null;
  const zones  = [aboveZone, belowZone].filter(Boolean);
  const zone   = zones[Math.floor(Math.random() * zones.length)];
  const tickerY = zone[0] + Math.floor(Math.random() * (zone[1] - zone[0] + 1));

  return {
    palette: PALETTES[paletteIdx],
    paletteIdx,
    titleX,
    titleY,
    tickerY,
    tickerH: TICKER_H,
  };
}
