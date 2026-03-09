// loadSprite — general PNG-to-sprite-layers loader.
//
// loadSprite(url, classify, nLayers)
//   url      — path to a PNG
//   classify — function (r, g, b) → layerIndex (0-based, < nLayers)
//   nLayers  — total number of layers to allocate
//
// Returns an array of `nLayers` sprites, each { pixels, grid, w, h }.
// The `grid` field (Uint8Array, w×h) is used by PixelBuffer.blitScaled for
// fast nearest-neighbour sampling without Set lookups.
//
// --- Palm classifier (classifyPalmPixel / PALM_N_LAYERS) ---
//
// Layer order (also the painter's-algorithm drawing order):
//   0  shadow / outline  near-black (lum < 0.08)
//   1  trunk dark        warm, lum 0.08–0.20
//   2  trunk mid         warm, lum 0.20–0.40
//   3  trunk light       warm, lum >= 0.40
//   4  leaf dark         green-dominant, lum 0.08–0.22
//   5  leaf mid          green-dominant, lum 0.22–0.45
//   6  leaf light        green-dominant, lum >= 0.45
//
// "Warm"  = r > g (catches trunk + orange coconuts)
// "Green" = g > r * 1.2 (strict dominance, avoids warm-ish overlap)

export const PALM_N_LAYERS = 7;

// Cactus sprite classifier — same 7-layer scheme as palms.
// Layer order:
//   0  shadow / outline  near-black
//   1  body dark green
//   2  body mid green
//   3  body light green
//   4  purple/violet accent  (barrel cactus highlights)
//   5  yellow spines / flowers
//   6  bright highlight green
export function classifyCactusPixel(r, g, b) {
  const lum = (r * 299 + g * 587 + b * 114) / (1000 * 255);
  if (lum < 0.08)                                     return 0; // shadow
  if (r > 140 && g > 100 && b < 90)                  return 5; // yellow flowers/spines
  if (b > 100 && r > 70 && g < b * 0.85)             return 4; // purple/violet accent
  if (g > r * 1.05) {
    return lum >= 0.42 ? 6 : lum >= 0.22 ? 3 : lum >= 0.12 ? 2 : 1;
  }
  return lum > 0.55 ? 6 : 1;                                    // fallback
}

export function classifyPalmPixel(r, g, b) {
  const lum = (r * 299 + g * 587 + b * 114) / (1000 * 255);
  if (lum < 0.08) return 0;                         // shadow / outline
  if (g > r * 1.2) {
    return lum >= 0.45 ? 6 : lum >= 0.22 ? 5 : 4;  // leaf light / mid / dark
  }
  return lum >= 0.40 ? 3 : lum >= 0.20 ? 2 : 1;    // trunk light / mid / dark
}

export async function loadSprite(url, classify = classifyPalmPixel, nLayers = PALM_N_LAYERS) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, w, h);

      const layers = Array.from({ length: nLayers }, () => ({
        pixels: [],
        grid: new Uint8Array(w * h),
      }));

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (data[i + 3] > 32) {
            const layer = classify(data[i], data[i + 1], data[i + 2]);
            layers[layer].pixels.push([x, y]);
            layers[layer].grid[y * w + x] = 1;
          }
        }
      }

      resolve(layers.map(l => ({ ...l, w, h })));
    };
    img.onerror = () => reject(new Error(`loadSprite: failed to load ${url}`));
    img.src = url;
  });
}

// loadSpriteQuantized — palette-aware PNG loader.
//
// Quantizes each opaque pixel to the nearest colour in `palette` (array of
// hex strings, e.g. DRIVE_PALETTE) using squared RGB distance.  Transparent
// pixels (alpha ≤ 32) are stored as 255 in the grid.
//
// Returns a single sprite { grid: Uint8Array(w*h), w, h } where each cell
// holds a palette index (0–254) or 255 for transparent.  Use with
// PixelBuffer.blitPalettizedScaled / blitPalettized.
export async function loadSpriteQuantized(url, palette) {
  // Pre-parse palette to [r,g,b] once.
  const rgb = palette.map(hex => {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
  });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, w, h);

      const grid = new Uint8Array(w * h).fill(255); // 255 = transparent

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (data[i + 3] <= 32) continue; // transparent
          const r = data[i], g = data[i + 1], b = data[i + 2];

          // Find nearest palette colour by squared RGB distance.
          let bestIdx = 0, bestDist = Infinity;
          for (let p = 0; p < rgb.length; p++) {
            const dr = r - rgb[p][0], dg = g - rgb[p][1], db = b - rgb[p][2];
            const dist = dr * dr + dg * dg + db * db;
            if (dist < bestDist) { bestDist = dist; bestIdx = p; }
          }
          grid[y * w + x] = bestIdx;
        }
      }

      resolve({ grid, w, h });
    };
    img.onerror = () => reject(new Error(`loadSpriteQuantized: failed to load ${url}`));
    img.src = url;
  });
}
