import { DRIVE_PALETTE, DRIVE_DESERT, DRIVE_NIGHT, DRIVE_SYNTHWAVE } from '../../common/palette.js';

// Named curve intensities — pixel offset of the road centre at the horizon.
export const CURVE = {
  EXTREME_LEFT:  -150,
  LEFT:          -50,
  RIGHT:          50,
  EXTREME_RIGHT:  150,
};

// Shared curve state-machine — same feel across all variants.
function baseCurve() {
  return {
    intensities:     [CURVE.EXTREME_LEFT, CURVE.LEFT, CURVE.RIGHT, CURVE.EXTREME_RIGHT],
    straightBase:    1,
    straightRange:   1,
    transitionBase:  1.2,
    transitionRange: 1.0,
    holdBase:        1.5,
    holdRange:       1.0,
    returnBase:      1.2,
    returnRange:     0.5,
  };
}

// --- Shared base config objects ---
// Each variant spreads these and overrides only what differs.

const BASE_ROAD = {
  horizonY:      130,
  roadHalfWidth: 120,
  carTargetH:    38,
};

const BASE_DISPLAY_TIMING = {
  maxDisplayTime: 30,
  fadeDuration:   2,
  fadeInDuration: 1.5,
};

const BASE_CREDITS = {
  lineSpacing:     3,
  maxCharsPerLine: 34,
};

const BASE_PALM_GEOM = {
  minZ:     0.8,
  maxZ:     18.0,
  minScale: 0.05,
};

// Shared by daytime, night, and synthwave — identical slot layout.
const BASE_PALM_SLOTS = [
  { phase: 0.10, side: -1 },
  { phase: 0.55, side:  1 },
  { phase: 0.82, side: -1 },
  { phase: 0.32, side:  1, xGap: 1.5 },
  { phase: 0.65, side: -1, xGap: 1.5 },
];

// --- Variant generators ---

function generateDaytimeConfig() {
  return {
    variant:  'daytime',
    palette:  DRIVE_PALETTE,
    speed:    5.08 + Math.random() * 1.38,
    ...BASE_ROAD,
    stripeLen:      0.50,
    grassLen:       0.50,
    rumbleLen:      0.15,
    rumbleWidth:    0.08,
    showCenterLine: true,
    curve: baseCurve(),
    palm: {
      period:    5.0,
      slots:     BASE_PALM_SLOTS,
      ...BASE_PALM_GEOM,
      fogCutoff: 0.35,
      fogMax:    0.75,
    },
    credits: { speed: 18, ...BASE_CREDITS },
    ...BASE_DISPLAY_TIMING,
  };
}

function generateDesertConfig() {
  return {
    variant:  'desert',
    palette:  DRIVE_DESERT,
    speed:    5.80 + Math.random() * 1.80,  // faster — open road, scorching heat
    ...BASE_ROAD,
    stripeLen:      0.60,   // longer stripes look more like dirt-road tyre ruts
    grassLen:       0.80,   // wide sand dunes, slow colour bands
    rumbleLen:      0.15,
    rumbleWidth:    0.08,   // colours match ground in palette → invisible
    showCenterLine: false,  // dirt road, no markings
    curve: baseCurve(),
    palm: {
      period:    7.0,  // sparser — vegetation reduced
      slots: [
        { phase: 0.15, side: -1 },
        { phase: 0.70, side:  1 },
        { phase: 0.45, side:  1, xGap: 1.5 },
        { phase: 0.90, side: -1, xGap: 1.5 },
      ],
      ...BASE_PALM_GEOM,
      fogCutoff: 0.42,  // heat haze kicks in closer
      fogMax:    0.88,  // heavy shimmer
    },
    credits: { speed: 14, ...BASE_CREDITS },  // lazy heat
    ...BASE_DISPLAY_TIMING,
  };
}

function generateNightConfig() {
  return {
    variant:  'night',
    palette:  DRIVE_NIGHT,
    speed:    4.20 + Math.random() * 1.00,  // slower — careful at night
    ...BASE_ROAD,
    stripeLen:      0.50,
    grassLen:       0.50,
    rumbleLen:      0.15,
    rumbleWidth:    0.08,
    showCenterLine: true,
    curve: baseCurve(),
    palm: {
      period:    5.0,
      slots:     BASE_PALM_SLOTS,
      ...BASE_PALM_GEOM,
      fogCutoff: 0.22,  // night cuts visibility short
      fogMax:    0.92,  // nearly black at the horizon
    },
    credits: { speed: 15, ...BASE_CREDITS },  // slow, moody
    ...BASE_DISPLAY_TIMING,
  };
}

function generateSynthwaveConfig() {
  return {
    variant:  'synthwave',
    palette:  DRIVE_SYNTHWAVE,
    speed:    6.50 + Math.random() * 2.00,  // fast — neon blur
    ...BASE_ROAD,
    stripeLen:      0.40,   // tighter stripes = more kinetic feel
    grassLen:       0.40,
    rumbleLen:      0.12,
    rumbleWidth:    0.10,   // slightly chunkier neon rumble
    showCenterLine: true,
    curve: baseCurve(),
    palm: {
      period:    4.5,  // denser — electric boulevard
      slots:     BASE_PALM_SLOTS,
      ...BASE_PALM_GEOM,
      fogCutoff: 0.38,
      fogMax:    0.80,
    },
    credits: { speed: 22, ...BASE_CREDITS },  // fast, kinetic
    ...BASE_DISPLAY_TIMING,
  };
}

const VARIANTS = [
  generateDaytimeConfig,
  generateDesertConfig,
  generateNightConfig,
  generateSynthwaveConfig,
];

// Randomly picks a drive variant each time, never repeating back-to-back.
// Persisted in localStorage so refreshing the page also rotates the variant.
export function generateDriveConfig() {
  const last = parseInt(localStorage.getItem('lastDriveVariant') ?? '-1', 10);
  let idx;
  do { idx = Math.floor(Math.random() * VARIANTS.length); } while (idx === last);
  localStorage.setItem('lastDriveVariant', idx);
  return VARIANTS[idx]();
}
