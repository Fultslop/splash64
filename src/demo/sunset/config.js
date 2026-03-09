// Sunset demo — session config.
// All randomised choices for one page load live here.
// Call generateSunsetConfig(titleSprite) once at startup, before initRenderer.

import { PALETTES } from '../../common/palette.js';
import { RENDER_W, RENDER_H } from '../../common/renderer.js';  // layout constants only — no renderer state

// Tuneable constants (not randomised).
export const TICKER_H         = 24;
export const TITLE_TICKER_GAP = 30; // minimum px gap between title and ticker bar
export const MAX_DISPLAY_TIME  = 20;  // seconds before fade-to-black and page reload
export const FADE_DURATION     = 1.0; // seconds for the fade-out
export const FADE_IN_DURATION  = 3.0; // seconds for the fade-in at demo start

// Sky gradient band positions as fractions of render height.
// Each entry pairs with the corresponding palette index in sunset.js (SKY_TOP … GROUND_1).
export const SKY_STOP_SCALARS = [0, 0.10, 0.15, 0.2, 0.27, 0.35, 0.44, 0.98, 1];

// Index into SKY_STOP_SCALARS / skyStops where the horizon band sits.
export const HORIZON_STOP_INDEX = 7;

// Sun layout (fractions of render width / height, plus fixed pixel radius).
export const SUN = { xScale: 0.72, yScale: 0.65, r: 20 };

// Fuji geometry ratios.
const SHOULDER_DY_RATIO  = 0.74;   // vertical drop from peak to shoulder, as a fraction of shoulderW
const FUJI_BASE_HW_RATIO = 0.5625; // half-width of base overhang as a fraction of total width (= 9/16)

// Build Fuji body + snow polygons from explicit layout parameters.
// cx/peakY/baseY are pixel coords; shoulderW is the half-width from peak to shoulder elbow.
// The base always extends beyond both screen edges to keep tiling seamless.
export function buildFuji(cx, peakY, shoulderW, baseY, width) {
  const shoulderDY = Math.floor(shoulderW * SHOULDER_DY_RATIO);
  const baseHW     = Math.floor(width * FUJI_BASE_HW_RATIO);
  const body = [
    [cx,          peakY             ],
    [cx + shoulderW, peakY + shoulderDY],
    [cx + baseHW, baseY             ],
    [cx - baseHW, baseY             ],
    [cx - shoulderW, peakY + shoulderDY],
  ];
  const snow = [
    [cx,                     peakY - 5                             ],
    [cx + shoulderW * 0.52,  Math.floor(peakY + shoulderW * 0.44) ],
    [cx + shoulderW * 0.30,  Math.floor(peakY + shoulderW * 0.60) ],
    [cx,                     Math.floor(peakY + shoulderW * 0.52) ],
    [cx - shoulderW * 0.30,  Math.floor(peakY + shoulderW * 0.60) ],
    [cx - shoulderW * 0.52,  Math.floor(peakY + shoulderW * 0.44) ],
  ];
  return { body, snow };
}

// Build a Fuji with randomly chosen peak height and shoulder width.
// Used for generating seamless scroll-in tiles at runtime.
export function buildRandomFuji(width, height) {
  const peakYScale = 0.25 + Math.random() * 0.20;
  const shoulderW  = 30 + Math.floor(Math.random() * 50);
  return buildFuji(
    Math.floor(width * 0.5),
    Math.floor(height * peakYScale),
    shoulderW,
    Math.floor(height * 0.89),
    width,
  );
}

// Generate a parallax direction: ±0.75–2.25 chosen randomly, sign flipped 50% of the time.
export function generateParallaxDirection() {
  const magnitude = 0.75 + Math.random() * 1.5;
  return Math.random() > 0.5 ? magnitude : -magnitude;
}

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

  // --- Mountain: random height and slope width ---
  // peakYScale: fraction of height for peak tip (lower = taller mountain)
  // shoulderW:  px from peak center to shoulder elbow (wider = broader/gentler slope)
  const peakYScale = 0.25 + Math.random() * 0.20;       // 0.25 – 0.45
  const shoulderW  = 30 + Math.floor(Math.random() * 50); // 30 – 79 px

  return {
    palette: PALETTES[paletteIdx],
    paletteIdx,
    titleX,
    titleY,
    tickerY,
    tickerH: TICKER_H,
    mountain: { peakYScale, shoulderW },
    parallaxDirection: generateParallaxDirection(),
  };
}
