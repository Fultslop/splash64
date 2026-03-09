// postrender.js — per-frame CRT effects applied after software rasterization.
// Modifies ImageData in place; called by renderer.present() before putImageData.

// Fraction of the pixel above that bleeds into the current pixel (phosphor glow).
const PHOSPHOR_GLOW = 0.12;

let cachedHeight = 0;
let scanlineTable = null;

let fadeBlack = 0;
export function setFade(t) { fadeBlack = Math.max(0, Math.min(1, t)); }

function updateScanlineTable(h, strength) {
  scanlineTable = new Float32Array(h);
  for (let y = 0; y < h; y++) {
    // Horizontal "ribbed" texture via sine wave.
    scanlineTable[y] = 1.0 - (Math.abs(Math.sin(y * Math.PI * 0.5)) * strength);
  }
  cachedHeight = h;
}

// Apply all CRT effects to imageData in place.
// Options:
//   scanlineStrength — darkening between lines (0.0–1.0)
//   vignetteStrength — how dark the corners get (0.0–1.0)
//   vignetteExtent   — how far the vignette spreads inward (e.g. 0.2–0.5)
//   boost            — global brightness multiplier
export function applyFullCRTEffect(imageData, {
  scanlineStrength = 0.02,
  vignetteStrength = 0.55,
  vignetteExtent   = 0.2,
  boost            = 1.25,
} = {}) {
  const data = imageData.data;
  const w = imageData.width;
  const h = imageData.height;

  if (h !== cachedHeight) {
    updateScanlineTable(h, scanlineStrength);
  }

  const centerX = w / 2;
  const centerY = h / 2;

  for (let y = 0; y < h; y++) {
    const scanline = scanlineTable[y];
    const normY = (y - centerY) / centerY;

    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const normX = (x - centerX) / centerX;

      // 1. Vignette — exponential falloff from center.
      // dist = 0 at center, ~1 at mid-edges, ~2 at corners.
      const dist = normX * normX + normY * normY;
      const vignette = Math.max(
        1.0 - vignetteStrength,
        Math.pow(Math.max(0, 1.0 - dist * vignetteExtent), 2)
      );

      // 2. Phosphor glow — vertical bleed from the pixel above.
      let r = data[i], g = data[i + 1], b = data[i + 2];
      if (y > 0) {
        const above = ((y - 1) * w + x) * 4;
        r = r * (1 - PHOSPHOR_GLOW) + data[above]     * PHOSPHOR_GLOW;
        g = g * (1 - PHOSPHOR_GLOW) + data[above + 1] * PHOSPHOR_GLOW;
        b = b * (1 - PHOSPHOR_GLOW) + data[above + 2] * PHOSPHOR_GLOW;
      }

      // 3. Final multiplier — scanlines × vignette × boost × fade.
      const finalMult = scanline * vignette * boost * (1 - fadeBlack);
      data[i]     = Math.min(255, r * finalMult);
      data[i + 1] = Math.min(255, g * finalMult);
      data[i + 2] = Math.min(255, b * finalMult);
    }
  }
}
