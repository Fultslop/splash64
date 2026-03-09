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

// Car sprite classifier — 6 layers.
// Layer order (painter's algorithm):
//   0  shadow / outline  near-black (lum < 0.12)
//   1  red body          red-dominant (r > g*2, r > b*2)
//   2  dark interior     windshield, dark grey — catch-all
//   3  yellow helmet     high r+g, low b
//   4  purple helmet     blue-purple dominant
//   5  white detail      tail lights, chrome (lum > 0.65)
export const CAR_N_LAYERS = 6;

export function classifyCarPixel(r, g, b) {
  const lum = (r * 299 + g * 587 + b * 114) / (1000 * 255);
  if (lum < 0.12)                                   return 0; // shadow/outline
  if (r > 180 && g > 130 && b < 100)               return 3; // yellow helmet
  if (b > 100 && r > 60 && g < b * 0.75)           return 4; // purple helmet
  if (r > 160 && r > g * 2.0 && r > b * 2.0)       return 1; // red body
  if (lum > 0.65)                                   return 5; // white detail
  return 2;                                                    // dark interior
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
