// Sunset demo.
// Layers (back to front): sky → sun → fuji → temple → trees → boids → title → ticker

import { createParallax } from '../../common/parallax.js';
import { SKY_STOP_SCALARS, SUN as SUN_CFG } from './config.js';

// Palette indices (SUNSET array from palette.js)
const P = {
  SKY_TOP:    0,
  SKY_1:      2,
  SKY_2:      4,
  SKY_3:      6,
  SKY_4:      8,
  SKY_5:      9,
  HORIZON:    10,
  GROUND_0:   11,
  GROUND_1:   12,
  FUJI:       14,
  FUJI_DARK:  15,
  SNOW:       17,
  SILHOUETTE: 2,
  TREE_SILHOUETTE: 18,
  SUN_BRIGHT: 24,
  SUN_RIM:    25,
  SUN_EDGE:   26,
};

// Build Fuji body + snow polygons from layout parameters.
// cx/peakY/baseY are pixel coords; shoulderW is the half-width from peak to shoulder elbow.
// The base always extends beyond both screen edges to keep tiling seamless.
function buildFujiRandom(width, height) {
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

function buildFuji(cx, peakY, shoulderW, baseY, width) {
  const shoulderDY = Math.floor(shoulderW * 0.74);
  const baseHW     = Math.floor(width * 0.5625); // overhangs each edge for seamless tiling
  const sw = shoulderW;
  const body = [
    [cx,          peakY             ],
    [cx + sw,     peakY + shoulderDY],
    [cx + baseHW, baseY             ],
    [cx - baseHW, baseY             ],
    [cx - sw,     peakY + shoulderDY],
  ];
  const snow = [
    [cx,           peakY - 5           ],
    [cx + sw*0.52, peakY + sw*0.44|0   ],
    [cx + sw*0.30, peakY + sw*0.60|0   ],
    [cx,           peakY + sw*0.52|0   ],
    [cx - sw*0.30, peakY + sw*0.60|0   ],
    [cx - sw*0.52, peakY + sw*0.44|0   ],
  ];
  return { body, snow };
}

// Temple: components defined relative to (cx=0, baseY=0), drawn at a fixed position.
// Each entry is a polygon for one part of the pagoda silhouette.
const TEMPLE_PARTS = [
  // Body
  [[-14, 0], [14, 0], [14, -28], [-14, -28]],
  // Roof tier 1 (widest, bottom)
  [[-24, -28], [24, -28], [16, -36], [-16, -36]],
  // Roof tier 2
  [[-16, -36], [16, -36], [10, -44], [-10, -44]],
  // Roof tier 3
  [[-10, -44], [10, -44], [5,  -51], [-5,  -51]],
  // Spire
  [[-2,  -51], [2,  -51], [2,  -62], [-2,  -62]],
];

// Trees: a 320-wide strip with a jagged silhouette top, tiled with layer 2.
// Sits just below the horizon.
const TREE_STRIP = [
  [  0, 200], [  0, 172],
  [ 12, 158], [ 20, 166], [ 32, 152], [ 44, 163], [ 55, 155], [ 65, 168],
  [ 78, 149], [ 88, 161], [100, 153], [112, 166], [122, 156], [133, 168],
  [145, 147], [155, 159], [167, 151], [178, 164], [190, 154], [200, 166],
  [212, 149], [222, 161], [234, 153], [245, 166], [256, 156], [266, 168],
  [278, 149], [288, 161], [300, 153], [312, 166], [320, 159],
  [320, 200],
];

export function createSunsetDemo(buffer, { titleSprite, ticker, config = {} } = {}) {
  const { width, height } = buffer;

  const SKY_PALETTE = [
    P.SKY_TOP, P.SKY_1, P.SKY_2, P.SKY_3, P.SKY_4,
    P.SKY_5, P.HORIZON, P.GROUND_0, P.GROUND_1,
  ];
  const skyStops = SKY_STOP_SCALARS.map((s, i) => ({
    y: Math.floor(height * s),
    idx: SKY_PALETTE[i],
  }));

  const horizonY = skyStops[7].y;

  const { peakYScale = 0.325, shoulderW = 50 } = config.mountain ?? {};
  let fujiA = buildFuji(
    Math.floor(width * 0.5),
    Math.floor(height * peakYScale),
    shoulderW,
    Math.floor(height * 0.89),
    width,
  );
  let fujiB = buildFujiRandom(width, height);
  let prevMountainOx = 0;

  const sun = {
    x: Math.floor(width  * SUN_CFG.xScale),
    y: Math.floor(height * SUN_CFG.yScale),
    r: SUN_CFG.r,
  };

  // Temple sits at a fixed horizontal center, just above horizon.
  const temple = {
    cx:    Math.floor(width * 0.5),
    baseY: horizonY + -10,
  };

  const parallax = createParallax([
    { speed:  8, wrapWidth: 320 },  // 0: fuji
    { speed: 16, wrapWidth: 320 },  // 1: temple
    { speed: 30, wrapWidth: 320 },  // 2: trees
  ]);

  function drawSky() {
    buffer.fillGradientDithered(skyStops, 12);
  }

  function drawSun() {
    //buffer.fillCircle(sun.x, sun.y, sun.r + 6, P.SUN_EDGE);
    buffer.fillCircle(sun.x, sun.y, sun.r + 3, P.SUN_RIM);
    buffer.fillCircle(sun.x, sun.y, sun.r,     P.SUN_BRIGHT);
  }

  function drawMountain() {
    const ox = parallax.getOffset(0);
    if (ox < prevMountainOx) {   // offset wrapped — new tile scrolls in
      fujiA = fujiB;
      fujiB = buildFujiRandom(width, height);
    }
    prevMountainOx = ox;
    const drawOne = (f, off) => {
      buffer.fillPolygon(f.body, P.FUJI,      off);
      buffer.fillPolygon(f.snow, P.FUJI_DARK, off);
      buffer.fillPolygon(f.snow, P.SNOW,      off);
    };
    drawOne(fujiA, -ox);
    drawOne(fujiB, 320 - ox);
  }

  function drawTemple() {
    parallax.drawTiled(1, (ox) => {
      const cx = temple.cx + ox;
      const by = temple.baseY;
      for (const part of TEMPLE_PARTS) {
        const pts = part.map(([dx, dy]) => [cx + dx, by + dy]);
        buffer.fillPolygon(pts, P.SILHOUETTE);
      }
    });
  }

  function drawTrees() {
    parallax.drawTiled(2, (ox) => {
      buffer.fillPolygon(TREE_STRIP, P.TREE_SILHOUETTE, ox);
    });
  }

  const { titleX, titleY, tickerY: TICKER_Y, tickerH: TICKER_H } = config;

  function drawTitle() {
    if (!titleSprite) return;
    buffer.blitSprite(titleSprite, titleX, titleY, P.SNOW);
  }

  function drawTicker() {
    if (!ticker) return;
    ticker.update(dt_ref[0]);
    // buffer.fillRect(0, TICKER_Y, width, TICKER_H, P.SILHOUETTE);
    const textY = TICKER_Y + Math.floor((TICKER_H - ticker.sprite.h) / 2);
    buffer.blitSpriteScrolled(ticker.sprite, 0, textY, P.SNOW, ticker.getScrollX(), width);
  }

  // dt passed via ref so drawTicker can access it without extra param threading.
  const dt_ref = [0];

  function update(dt) {
    dt_ref[0] = dt;
    parallax.update(dt);
    drawSky();
    drawSun();
    drawMountain();
    drawTemple();
    drawTrees();
    drawTitle();
    drawTicker();
  }

  return { update };
}
