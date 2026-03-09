// drive.js — OutRun-style pseudo-3D road demo.
//
// Technique: raster projection ("1/y" method).
// Each scanline below the horizon is mapped to a world depth via the
// perspective formula worldZ = 1 / perspective, where
// perspective = (y - horizonY) / (H - 1 - horizonY).
//
// This gives worldZ = 1 at the bottom (camera-near) and → ∞ at the horizon.
// Road width tapers linearly with perspective (correct for a flat plane).
// Zebra stripes use floor((scrollZ + worldZ) / stripeLen) & 1 — as scrollZ
// accumulates, stripes appear to slide from horizon toward the camera.
//
// Curves: a state machine (STRAIGHT → CURVING_OUT → HOLDING → CURVING_IN)
// smoothly animates curveOffset.  The road centre at row y is shifted by
// curveOffset * (1 - p²): zero at the bottom (car/camera stays centred) and
// full curveOffset at the horizon (road bends away from the car into the distance).
// A fixed full-width horizon strip at y=horizonY acts as a visual anchor so the
// viewer sees the horizon as stationary and reads the road — not the camera — as curving.

const W = 320, H = 200;

// Palette index constants — must match DRIVE_PALETTE slot layout in palette.js.
const P = {
  SKY_TOP:      0,
  SKY_MID:      1,
  SKY_LOW:      2,
  HAZE:         3,
  ROAD_DARK:    4,
  ROAD_LIGHT:   5,
  GRASS_DARK:   6,
  GRASS_AVG:    11,
  GRASS_AVG_LIGHT: 12,
  GRASS_LIGHT:  7,
  RUMBLE_RED:   8,
  RUMBLE_WHITE: 9,
  CENTER_LINE:  10,
  // Palm layers — drawn in this order (back to front): shadow, trunk, leaves.
  // Indices match DRIVE_PALETTE slots 13–19.
  PALM_SHADOW:  13,
  PALM_TRUNK_D: 14,
  PALM_TRUNK_M: 15,
  PALM_TRUNK_L: 16,
  PALM_LEAF_D:  17,
  PALM_LEAF_M:  18,
  PALM_LEAF_L:  19,
  UI_WHITE:     27,
  // Car layers — palette slots 20–25.
  CAR_SHADOW:   20,
  CAR_BODY:     21,
  CAR_INTERIOR: 22,
  CAR_HELMET_Y: 23,
  CAR_HELMET_P: 24,
  CAR_DETAIL:   25,
};

// Color index for each car layer (indexed 0–5, matching classifyCarPixel order).
const CAR_LAYER_COLORS = [20, 21, 22, 23, 24, 25];

// Color index for each palm layer (indexed 0–6, matching loadSprite.js layer order).
const PALM_LAYER_COLORS = [
  13, // 0  shadow / outline
  14, // 1  trunk dark
  15, // 2  trunk mid
  16, // 3  trunk light
  17, // 4  leaf dark
  18, // 5  leaf mid
  19, // 6  leaf light
];

// Smooth ease-in-out (quadratic).
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function createDriveDemo(buffer, { config, titleSprite, palmVariants = null, carSprite = null, carSpriteLeft = null }) {
  const {
    horizonY, roadHalfWidth,
    stripeLen, grassLen, rumbleLen, rumbleWidth,
    curve: cv,
    palm: { fogCutoff, fogMax },
  } = config;

  // palmVariants: array of sprite-sets, one per palm type (palm1, palm2, …).
  // Each sprite-set is an array of 7 layers as returned by loadSprite.
  const hasPalms = palmVariants && palmVariants.length > 0;

  let scrollZ = 0;
  const cx = Math.floor(W / 2);

  // Sky gradient stops — fill entire buffer; road scanlines overdraw below horizonY.
  const skyStops = [
    { y: 0,                           idx: P.SKY_TOP },
    { y: Math.floor(horizonY * 0.30), idx: P.SKY_MID },
    { y: Math.floor(horizonY * 0.65), idx: P.SKY_LOW },
    { y: horizonY - 4,                idx: P.HAZE    },
  ];

  // Title centred horizontally, near the top of the sky.
  const titleX = Math.floor((W - titleSprite.w) / 2);
  const titleY = 8;

  // --- Curve state machine ---
  // States: STRAIGHT → CURVING_OUT → HOLDING → CURVING_IN → STRAIGHT → …
  let curveState    = 'STRAIGHT';
  let curveOffset   = 0;   // current signed pixel offset applied at the horizon
  let curveTarget   = 0;   // target offset for the current curve
  let curveFrom     = 0;   // offset at the start of the current transition
  let curveTimer    = 0;   // elapsed seconds in current state
  let curveDuration = cv.straightBase + Math.random() * cv.straightRange;

  function pickNextCurve() {
    const opts = cv.intensities;
    return opts[Math.floor(Math.random() * opts.length)];
  }

  function updateCurve(dt) {
    curveTimer += dt;
    const t = curveDuration > 0 ? Math.min(1, curveTimer / curveDuration) : 1;

    if (curveState === 'STRAIGHT') {
      curveOffset = 0;
      if (t >= 1) {
        curveFrom     = 0;
        curveTarget   = pickNextCurve();
        curveDuration = cv.transitionBase + Math.random() * cv.transitionRange;
        curveTimer    = 0;
        curveState    = 'CURVING_OUT';
      }

    } else if (curveState === 'CURVING_OUT') {
      curveOffset = curveFrom + (curveTarget - curveFrom) * easeInOut(t);
      if (t >= 1) {
        curveOffset   = curveTarget;
        curveDuration = cv.holdBase + Math.random() * cv.holdRange;
        curveTimer    = 0;
        curveState    = 'HOLDING';
      }

    } else if (curveState === 'HOLDING') {
      curveOffset = curveTarget;
      if (t >= 1) {
        curveFrom     = curveTarget;
        curveDuration = cv.returnBase + Math.random() * cv.returnRange;
        curveTimer    = 0;
        curveState    = 'CURVING_IN';
      }

    } else if (curveState === 'CURVING_IN') {
      curveOffset = curveFrom * (1 - easeInOut(t));
      if (t >= 1) {
        curveOffset   = 0;
        curveTarget   = 0;
        curveDuration = cv.straightBase + Math.random() * cv.straightRange;
        curveTimer    = 0;
        curveState    = 'STRAIGHT';
      }
    }
  }

  // --- Billboard system ---
  // Returns visible palm instances sorted back-to-front (largest z_rel first).
  // Each entry: { z_rel, side, variant } — variant is a stable index into palmVariants,
  // derived deterministically from (slot index, segment k) so the same world
  // position always shows the same palm type with no per-frame randomness.
  function getVisibleBillboards() {
    const { period, slots, minZ, maxZ } = config.palm;
    const nVariants = palmVariants ? palmVariants.length : 1;
    const results = [];
    for (let si = 0; si < slots.length; si++) {
      const slot = slots[si];
      const lo = (scrollZ + minZ) / period - slot.phase;
      const hi = (scrollZ + maxZ) / period - slot.phase;
      for (let k = Math.ceil(lo); k <= Math.floor(hi); k++) {
        const z_rel   = (slot.phase + k) * period - scrollZ;
        const variant = Math.abs(k * 7 + si * 3) % nVariants;
        results.push({ z_rel, side: slot.side, variant });
      }
    }
    results.sort((a, b) => b.z_rel - a.z_rel);
    return results;
  }

  function get_grass_color(grassStripe, halfW)  {
    if (halfW < 12) {
      return P.GRASS_AVG
    }

    if (halfW < 40) {
      return grassStripe ? P.GRASS_AVG_LIGHT: P.GRASS_AVG;
    }

    return grassStripe ? P.GRASS_LIGHT: P.GRASS_DARK;
  }

  function update(dt) {
    scrollZ += config.speed * dt;
    updateCurve(dt);

    // --- Sky ---
    buffer.fillGradientDithered(skyStops, 10);

    // Horizon anchor — a fixed full-width strip at the sky/road boundary.
    // It never shifts with curveOffset, so the viewer perceives the horizon as
    // stationary and reads the road (not the camera) as the thing that curves.
    buffer.fillRect(0, horizonY, W, 2, P.HAZE);

    // --- Road scanlines ---
    for (let y = horizonY + 2; y < H; y++) {
      // Perspective scale: 0 at horizon, 1 at bottom of screen.
      const perspective = (y - horizonY) / (H - 1 - horizonY);
      // World depth: large near horizon (far), small near camera (bottom).
      const worldZ = 1.0 / perspective;

      // Stripe indices — identical formula for all layers, different periods.
      const pos          = scrollZ + worldZ;
      const roadStripe   = Math.floor(pos / stripeLen)         & 1;
      const grassStripe  = Math.floor(pos / grassLen)          & 1;
      const rumbleStripe = Math.floor(pos / rumbleLen)         & 1;
      // Center dashes: slightly longer period than road stripe → independent rhythm.
      const dashStripe   = Math.floor(pos / (stripeLen * 2.5)) & 1;

      // (1 - p²): zero at bottom (car/camera at cx), full curveOffset at horizon.
      // The road curves away from the car's position into the distance.
      const roadCX = Math.round(cx + curveOffset * (1 - perspective) * (1 - perspective));
      const halfW  = Math.round(roadHalfWidth * perspective);
      const left   = roadCX - halfW;
      const right  = roadCX + halfW;
      const rumbW  = Math.max(1, Math.round(halfW * rumbleWidth));

      const roadColor   = roadStripe   ? P.ROAD_LIGHT  : P.ROAD_DARK;
      const grassColor  = get_grass_color(grassStripe, halfW);
      const rumbleColor = rumbleStripe ? P.RUMBLE_WHITE : P.RUMBLE_RED;
      const fogT        = fogMax * Math.max(0, 1 - perspective / fogCutoff);

      // Left grass
      buffer.fillRect(0,             y, Math.max(0, left - rumbW),         1, grassColor,  P.HAZE, fogT);
      // Left rumble strip
      buffer.fillRect(left - rumbW,  y, rumbW,                             1, rumbleColor, P.HAZE, fogT);
      // Road surface
      buffer.fillRect(left,          y, halfW * 2,                         1, roadColor,   P.HAZE, fogT);
      // Right rumble strip
      buffer.fillRect(right,         y, rumbW,                             1, rumbleColor, P.HAZE, fogT);
      // Right grass
      buffer.fillRect(right + rumbW, y, Math.max(0, W - right - rumbW),   1, grassColor,  P.HAZE, fogT);

      // Center dashes — only when road is wide enough to show them.
      if (dashStripe && halfW > 8) {
        const dashW = Math.max(1, Math.round(halfW * 0.06));
        buffer.fillRect(roadCX - Math.floor(dashW / 2), y, dashW, 1, P.CENTER_LINE, P.HAZE, fogT);
      }
    }

    // --- Billboards (palms) — back to front so near ones overdraw far ones ---
    if (hasPalms) {
      const { minScale } = config.palm;
      for (const { z_rel, side, variant } of getVisibleBillboards()) {
        const perspective = 1 / z_rel;
        if (perspective < minScale) continue;
        const sprites = palmVariants[variant];
        const scale   = Math.min(1, perspective);
        // Fog: blend toward HAZE as palms recede.  Linear from fogCutoff (no fog)
        // down to 0 (full fogMax).  Pre-computed once, zero per-pixel overhead.
        const fogT    = fogMax * Math.max(0, 1 - perspective / fogCutoff);
        const y       = Math.round(horizonY + perspective * (H - 1 - horizonY));
        const halfW   = Math.round(roadHalfWidth * perspective);
        const roadCX  = Math.round(cx + curveOffset * (1 - perspective) * (1 - perspective));
        const rumbW   = Math.max(1, Math.round(halfW * rumbleWidth));
        // Use this variant's own dimensions (palms may differ in size).
        const scaledW = Math.round(sprites[0].w * scale);
        const scaledH = Math.round(sprites[0].h * scale);
        // Palm inner edge sits just outside the rumble strip.
        const palmX = side > 0
          ? roadCX + halfW + rumbW
          : roadCX - halfW - rumbW - scaledW;
        const palmY = y - scaledH;
        for (let i = 0; i < sprites.length; i++) {
          if (sprites[i].pixels.length > 0) {
            buffer.blitScaled(sprites[i], palmX, palmY, scale, PALM_LAYER_COLORS[i], P.HAZE, fogT);
          }
        }
      }
    }

    // --- Car ---
    // Drawn after billboards so it always appears in front.
    // Sprite switches based on curve direction; right curve mirrors car-left.
    if (carSprite) {
      const CURVE_THRESHOLD = 25;
      const sprites = (carSpriteLeft && Math.abs(curveOffset) > CURVE_THRESHOLD)
        ? carSpriteLeft
        : carSprite;
      const flipX    = carSpriteLeft && curveOffset > CURVE_THRESHOLD;
      const carScale = config.carTargetH / sprites[0].h;
      const scaledW  = Math.round(sprites[0].w * carScale);
      const scaledH  = Math.round(sprites[0].h * carScale);
      const carX = Math.round(cx - scaledW / 2 - curveOffset * 0.10);
      const carY = H - scaledH;
      for (let i = 0; i < sprites.length; i++) {
        if (sprites[i].pixels.length > 0) {
          buffer.blitScaled(sprites[i], carX, carY, carScale, CAR_LAYER_COLORS[i], -1, 0, flipX);
        }
      }
    }

    // --- Title ---
    buffer.blitSprite(titleSprite, titleX, titleY, P.UI_WHITE);
  }

  return { update };
}
