// loadSprite — load a PNG and split it into 7 palette-indexed sprite layers.
//
// Layer order (also drawing order — shadow first, leaves last):
//   0  shadow/outline  near-black (lum < 0.08)
//   1  trunk dark      warm, lum 0.08–0.20
//   2  trunk mid       warm, lum 0.20–0.40
//   3  trunk light     warm, lum >= 0.40
//   4  leaf dark       green-dominant, lum 0.08–0.22
//   5  leaf mid        green-dominant, lum 0.22–0.45
//   6  leaf light      green-dominant, lum >= 0.45
//
// "Warm" = r > g, or r >= g AND both > b (catches orange coconuts + trunk).
// "Green" = g > r * 1.2 (strict green dominance to avoid warm-ish overlap).
//
// Each layer: { pixels: [[x,y],...], grid: Uint8Array(w*h), w, h }
// The `grid` field is used by PixelBuffer.blitScaled for nearest-neighbour sampling.

const N_LAYERS = 7;

function classifyPixel(r, g, b) {
  const lum = (r * 299 + g * 587 + b * 114) / (1000 * 255);
  if (lum < 0.08) return 0;                       // shadow / outline
  const isGreen = g > r * 1.2;
  if (isGreen) {
    return lum >= 0.45 ? 6 : lum >= 0.22 ? 5 : 4; // leaf light / mid / dark
  }
  // warm (trunk, coconut)
  return lum >= 0.40 ? 3 : lum >= 0.20 ? 2 : 1;  // trunk light / mid / dark
}

export async function loadSprite(url) {
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

      const layers = Array.from({ length: N_LAYERS }, () => ({
        pixels: [],
        grid: new Uint8Array(w * h),
      }));

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (data[i + 3] > 32) {
            const layer = classifyPixel(data[i], data[i + 1], data[i + 2]);
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
