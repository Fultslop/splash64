// Font — rasterizes text into a palette-friendly sprite.
// Each character is rasterized individually, then placed with explicit letter spacing.
// Call after document.fonts.ready to ensure web fonts are available.
//
// Glyph results are cached by (fontSpec, char) so that long strings (e.g. the
// ticker, which may be 10k+ characters) pay the canvas-creation cost only once
// per unique glyph — typically ~60–70 distinct characters for C64 Pro Mono.

// Cache: fontSpec → Map(char → { pixels, w, h })
const glyphCache = new Map();

function rasterizeChar(char, fontSpec, canvasH) {
  let fontMap = glyphCache.get(fontSpec);
  if (!fontMap) { fontMap = new Map(); glyphCache.set(fontSpec, fontMap); }
  if (fontMap.has(char)) return fontMap.get(char);

  const probe = document.createElement('canvas').getContext('2d');
  probe.font = fontSpec;
  const w = Math.ceil(probe.measureText(char).width) + 2;

  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  ctx.font         = fontSpec;
  ctx.fillStyle    = '#fff';
  ctx.textBaseline = 'top';
  ctx.fillText(char, 1, 0);

  const { data } = ctx.getImageData(0, 0, w, canvasH);
  const pixels = [];
  let maxX = 0, maxY = 0;

  for (let y = 0; y < canvasH; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 200) {
        pixels.push([x, y]);
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const result = { pixels, w: maxX + 1, h: maxY + 1 };
  fontMap.set(char, result);
  return result;
}

// Returns { pixels: [[dx, dy], ...], w, h }
// scaleX:       integer horizontal stretch per character pixel (default 1)
// letterSpacing: extra pixels between characters (default 1)
export function rasterizeText(text, fontFamily, fontSize, scaleX = 1, letterSpacing = 1) {
  const fontSpec  = `${fontSize}px "${fontFamily}"`;
  const canvasH   = Math.ceil(fontSize * 1.5);
  const allPixels = [];
  let cursorX = 0;
  let totalH  = 0;

  for (const char of text) {
    const { pixels, w, h } = rasterizeChar(char, fontSpec, canvasH);
    for (const [dx, dy] of pixels) {
      for (let sx = 0; sx < scaleX; sx++) {
        allPixels.push([cursorX + dx * scaleX + sx, dy]);
      }
    }
    cursorX += w * scaleX + letterSpacing;
    if (h > totalH) totalH = h;
  }

  return { pixels: allPixels, w: cursorX, h: totalH };
}
