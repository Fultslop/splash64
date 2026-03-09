import { DRIVE_PALETTE } from '../../common/palette.js';

// Named curve intensities — pixel offset of the road centre at the horizon.
// Positive = right, negative = left.  Used as the values in curve.intensities.
export const CURVE = {
  EXTREME_LEFT:  -150,
  LEFT:          -50,
  RIGHT:          50,
  EXTREME_RIGHT:  150,
};

export function generateDriveConfig() {
  // Slight speed variation per session — keeps each run feeling slightly different.
  const speed = 5.08 + Math.random() * 1.38;  // 1.08 – 1.46 world-units/sec

  return {
    palette:       DRIVE_PALETTE,
    speed,
    horizonY:      100,   // screen Y of horizon line (50% down the 200px screen)
    roadHalfWidth: 120,   // road half-width in pixels at the very bottom
    stripeLen:     0.50,  // world-space length of each road zebra stripe
    grassLen:      0.50,  // world-space length of grass colour bands
    rumbleLen:     0.15,  // world-space length of rumble alternation
    rumbleWidth:   0.08,  // rumble strip width as fraction of half-road width

    // Curve state-machine config.
    // All durations in seconds; intensities are signed horizon-pixel offsets.
    curve: {
      intensities:    [CURVE.EXTREME_LEFT, CURVE.LEFT, CURVE.RIGHT, CURVE.EXTREME_RIGHT],
      straightBase:   1,    // minimum seconds of straight road between curves
      straightRange:  1,    // + random(0..straightRange) seconds
      transitionBase: 1.2,  // minimum seconds to ease into a curve
      transitionRange: 1.0,
      holdBase:       1.5,  // minimum seconds to hold a curve before returning
      holdRange:      1.0,
      returnBase:     1.2,  // minimum seconds to ease back to straight
      returnRange:    0.5,
    },

    // Billboard / palm tree config.
    palm: {
      period:   5.0,   // world-units between billboard groups
      slots: [         // phase (0–1 within period) + side (-1 = left, 1 = right)
        { phase: 0.10, side: -1 },
        { phase: 0.55, side:  1 },
        { phase: 0.82, side: -1 },
      ],
      minZ:      0.8,   // don't draw closer than this
      maxZ:     18.0,   // cull beyond this distance
      minScale:  0.05,  // skip render below this fraction of full size
      fogCutoff: 0.35,  // perspective value below which fog starts (worldZ > ~2.9)
      fogMax:    0.75,  // max fog blend at the horizon (0 = none, 1 = full haze)
    },

    maxDisplayTime: 30,
    fadeDuration:   2,
    fadeInDuration: 1.5,
  };
}
