// PixelBuffer — software rasterizer backed by ImageData.
// All drawing uses palette indices (0–31). The palette is fixed at construction,
// enforcing the 32-color constraint and enabling palette swapping.

import { parseHexColor } from './color.js';

// 4×4 Bayer ordered-dither matrix, values 0–15 (threshold = value / 16).
const BAYER4 = [
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5,
];

export class PixelBuffer {
  constructor(width, height, palette) {
    this.width     = width;
    this.height    = height;
    this.imageData = new ImageData(width, height);
    this.data      = this.imageData.data; // Uint8ClampedArray, RGBA

    // Pre-parse palette hex strings to [r, g, b] for fast lookup.
    this._rgb = palette.map(parseHexColor);
  }

  setPixel(x, y, idx) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const [r, g, b] = this._rgb[idx];
    const i = (y * this.width + x) * 4;
    this.data[i]     = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = 255;
  }

  // fogIdx / fogT: optional distance fog — same semantics as blitScaled.
  // Blend is pre-computed once before the loops; zero per-pixel overhead.
  fillRect(x0, y0, w, h, idx, fogIdx = -1, fogT = 0) {
    const x1 = Math.min(x0 + w, this.width);
    const y1 = Math.min(y0 + h, this.height);
    let [r, g, b] = this._rgb[idx];
    if (fogIdx >= 0 && fogT > 0) {
      const [fr, fg, fb] = this._rgb[fogIdx];
      r = (r + (fr - r) * fogT + 0.5) | 0;
      g = (g + (fg - g) * fogT + 0.5) | 0;
      b = (b + (fb - b) * fogT + 0.5) | 0;
    }
    for (let y = Math.max(y0, 0); y < y1; y++) {
      for (let x = Math.max(x0, 0); x < x1; x++) {
        const i = (y * this.width + x) * 4;
        this.data[i]     = r;
        this.data[i + 1] = g;
        this.data[i + 2] = b;
        this.data[i + 3] = 255;
      }
    }
  }

  // Horizontal gradient fill. stops: array of { y, idx } sorted by y.
  // Each row gets the color of the last stop whose y <= row.
  fillGradientH(stops) {
    let si = 0;
    for (let y = 0; y < this.height; y++) {
      while (si + 1 < stops.length && stops[si + 1].y <= y) si++;
      const [r, g, b] = this._rgb[stops[si].idx];
      const rowBase = y * this.width * 4;
      for (let x = 0; x < this.width; x++) {
        const i = rowBase + x * 4;
        this.data[i]     = r;
        this.data[i + 1] = g;
        this.data[i + 2] = b;
        this.data[i + 3] = 255;
      }
    }
  }

  // Filled circle — rasterized, no antialiasing.
  fillCircle(cx, cy, radius, idx) {
    const [r, g, b] = this._rgb[idx];
    const r2 = radius * radius;
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r2) this.setPixelRaw(x, y, r, g, b);
      }
    }
  }

  // Filled convex or concave polygon — scanline rasterization, no antialiasing.
  // points: array of [x, y]. offsetX shifts all points horizontally (for parallax).
  fillPolygon(points, idx, offsetX = 0) {
    const [r, g, b] = this._rgb[idx];
    const n = points.length;
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of points) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    minY = Math.max(0, Math.floor(minY));
    maxY = Math.min(this.height - 1, Math.floor(maxY));

    for (let y = minY; y <= maxY; y++) {
      const xs = [];
      for (let i = 0; i < n; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % n];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + (y - y0) * (x1 - x0) / (y1 - y0) + offsetX);
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i < xs.length; i += 2) {
        const xStart = Math.max(0, Math.ceil(xs[i]));
        const xEnd   = Math.min(this.width - 1, Math.floor(xs[i + 1]));
        for (let x = xStart; x <= xEnd; x++) this.setPixelRaw(x, y, r, g, b);
      }
    }
  }

  // Blit a rasterized text sprite (from font.js) at (x0, y0) in palette color idx.
  blitSprite(sprite, x0, y0, idx) {
    const [r, g, b] = this._rgb[idx];
    for (const [dx, dy] of sprite.pixels) {
      this.setPixelRaw(x0 + dx, y0 + dy, r, g, b);
    }
  }

  // Blit a rasterized text sprite clipped to the vertical range [clipY0, clipY1).
  // fadeZone: pixels at each clip edge fade in/out by alpha-blending against the
  // existing buffer contents.  Full-opacity pixels use the fast setPixelRaw path.
  blitSpriteClipped(sprite, x0, y0, idx, clipY0, clipY1, fadeZone = 0) {
    const [r, g, b] = this._rgb[idx];
    for (const [dx, dy] of sprite.pixels) {
      const py = y0 + dy;
      if (py < clipY0 || py >= clipY1) continue;
      const px = x0 + dx;
      if (px < 0 || px >= this.width || py < 0 || py >= this.height) continue;
      if (fadeZone > 0) {
        const alpha = Math.min(py - clipY0, clipY1 - 1 - py, fadeZone) / fadeZone;
        if (alpha <= 0) continue;
        if (alpha >= 1) { this.setPixelRaw(px, py, r, g, b); continue; }
        const i = (py * this.width + px) * 4;
        this.data[i]     = (this.data[i]     + (r - this.data[i])     * alpha + 0.5) | 0;
        this.data[i + 1] = (this.data[i + 1] + (g - this.data[i + 1]) * alpha + 0.5) | 0;
        this.data[i + 2] = (this.data[i + 2] + (b - this.data[i + 2]) * alpha + 0.5) | 0;
        this.data[i + 3] = 255;
      } else {
        this.setPixelRaw(px, py, r, g, b);
      }
    }
  }

  // Blit a sprite scaled by `scale` (0..1), nearest-neighbour.
  // sprite must have a `grid: Uint8Array(w*h)` field (see loadSprite.js).
  // fogIdx / fogT: optional distance fog — blends the draw color toward fogIdx
  //   by factor fogT (0 = no fog, 1 = fully fog color).  The blend is computed
  //   once before the loop so there is zero per-pixel overhead vs. the base call.
  // Clips automatically via setPixelRaw bounds checking.
  blitScaled(sprite, x0, y0, scale, idx, fogIdx = -1, fogT = 0, flipX = false) {
    if (scale <= 0) return;
    const [r0, g0, b0] = this._rgb[idx];
    let r = r0, g = g0, b = b0;
    if (fogIdx >= 0 && fogT > 0) {
      const [fr, fg, fb] = this._rgb[fogIdx];
      r = (r0 + (fr - r0) * fogT + 0.5) | 0;
      g = (g0 + (fg - g0) * fogT + 0.5) | 0;
      b = (b0 + (fb - b0) * fogT + 0.5) | 0;
    }
    const sw = Math.max(1, Math.round(sprite.w * scale));
    const sh = Math.max(1, Math.round(sprite.h * scale));
    const { w, h, grid } = sprite;
    for (let py = 0; py < sh; py++) {
      const sy = Math.min(h - 1, Math.floor(py / scale));
      const rowBase = sy * w;
      for (let px = 0; px < sw; px++) {
        const sx = Math.min(w - 1, Math.floor(px / scale));
        if (grid[rowBase + sx]) this.setPixelRaw(x0 + (flipX ? sw - 1 - px : px), y0 + py, r, g, b);
      }
    }
  }

  // Blit a palette-quantized sprite (from loadSpriteQuantized) scaled by `scale`.
  // grid values are palette indices; 255 = transparent (skipped).
  // flipX mirrors the sprite horizontally.
  blitPalettizedScaled(sprite, x0, y0, scale, flipX = false) {
    if (scale <= 0) return;
    const sw = Math.max(1, Math.round(sprite.w * scale));
    const sh = Math.max(1, Math.round(sprite.h * scale));
    const { w, h, grid } = sprite;
    for (let py = 0; py < sh; py++) {
      const sy = Math.min(h - 1, Math.floor(py / scale));
      const rowBase = sy * w;
      for (let px = 0; px < sw; px++) {
        const sx = Math.min(w - 1, Math.floor(px / scale));
        const idx = grid[rowBase + sx];
        if (idx === 255) continue;
        const [r, g, b] = this._rgb[idx];
        this.setPixelRaw(x0 + (flipX ? sw - 1 - px : px), y0 + py, r, g, b);
      }
    }
  }

  // Blit a scrolling sprite at (x0, y0), clipped to viewW pixels wide.
  // scrollX is how many pixels into the sprite we start; wraps seamlessly.
  blitSpriteScrolled(sprite, x0, y0, idx, scrollX, viewW) {
    const [r, g, b] = this._rgb[idx];
    const sw = sprite.w;
    for (const [dx, dy] of sprite.pixels) {
      const px = ((dx - scrollX) % sw + sw) % sw;
      if (px < viewW) this.setPixelRaw(x0 + px, y0 + dy, r, g, b);
    }
  }

  // Horizontal gradient with Bayer 4×4 ordered dithering at band transitions.
  // stops: same format as fillGradientH — array of { y, idx } sorted by y.
  // ditherRows: number of rows before each stop boundary to blend with dithering.
  fillGradientDithered(stops, ditherRows = 4) {
    let si = 0;
    for (let y = 0; y < this.height; y++) {
      while (si + 1 < stops.length && stops[si + 1].y <= y) si++;

      const rowBase  = y * this.width * 4;
      const nextStop = si + 1 < stops.length ? stops[si + 1] : null;
      const inDither = nextStop && y >= nextStop.y - ditherRows;

      if (inDither) {
        // t: 0 = all current color, 1 = all next color
        const t    = (y - (nextStop.y - ditherRows)) / ditherRows;
        const [r0, g0, b0] = this._rgb[stops[si].idx];
        const [r1, g1, b1] = this._rgb[nextStop.idx];
        const bayerRow = (y & 3) * 4;
        for (let x = 0; x < this.width; x++) {
          const threshold = BAYER4[bayerRow + (x & 3)] / 16;
          const useNext   = t > threshold;
          const i = rowBase + x * 4;
          this.data[i]     = useNext ? r1 : r0;
          this.data[i + 1] = useNext ? g1 : g0;
          this.data[i + 2] = useNext ? b1 : b0;
          this.data[i + 3] = 255;
        }
      } else {
        const [r, g, b] = this._rgb[stops[si].idx];
        for (let x = 0; x < this.width; x++) {
          const i = rowBase + x * 4;
          this.data[i]     = r;
          this.data[i + 1] = g;
          this.data[i + 2] = b;
          this.data[i + 3] = 255;
        }
      }
    }
  }

  // Dithered horizontal strip — blends idx0 (top) → idx1 (bottom) over `rows` rows.
  // Uses the same 4×4 Bayer matrix as fillGradientDithered.
  fillDitherStrip(x0, y0, w, rows, idx0, idx1) {
    const [r0, g0, b0] = this._rgb[idx0];
    const [r1, g1, b1] = this._rgb[idx1];
    const xEnd = Math.min(x0 + w, this.width);
    const yEnd = Math.min(y0 + rows, this.height);
    for (let y = Math.max(y0, 0); y < yEnd; y++) {
      const t        = (y - y0) / rows;
      const bayerRow = (y & 3) * 4;
      const rowBase  = y * this.width * 4;
      for (let x = Math.max(x0, 0); x < xEnd; x++) {
        const useNext = t > BAYER4[bayerRow + (x & 3)] / 16;
        const i = rowBase + x * 4;
        this.data[i]     = useNext ? r1 : r0;
        this.data[i + 1] = useNext ? g1 : g0;
        this.data[i + 2] = useNext ? b1 : b0;
        this.data[i + 3] = 255;
      }
    }
  }

  // Flush pixel buffer to canvas context (pure data write — no effects applied here).
  flush(ctx) {
    ctx.putImageData(this.imageData, 0, 0);
  }

  // Swap the palette at runtime — used when transitioning between demos.
  setPalette(palette) {
    this._rgb = palette.map(parseHexColor);
  }

  // Internal: write raw RGB without palette lookup (used by fillCircle inner loop).
  setPixelRaw(x, y, r, g, b) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const i = (y * this.width + x) * 4;
    this.data[i]     = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = 255;
  }
}
