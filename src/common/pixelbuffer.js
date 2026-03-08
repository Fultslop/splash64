// PixelBuffer — software rasterizer backed by ImageData.
// All drawing uses palette indices (0–31). The palette is fixed at construction,
// enforcing the 32-color constraint and enabling palette swapping.

export class PixelBuffer {
  constructor(width, height, palette) {
    this.width     = width;
    this.height    = height;
    this.imageData = new ImageData(width, height);
    this.data      = this.imageData.data; // Uint8ClampedArray, RGBA

    // Pre-parse palette hex strings to [r, g, b] for fast lookup.
    this._rgb = palette.map(hex => {
      const v = parseInt(hex.slice(1), 16);
      return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
    });
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

  fillRect(x0, y0, w, h, idx) {
    const x1 = Math.min(x0 + w, this.width);
    const y1 = Math.min(y0 + h, this.height);
    const [r, g, b] = this._rgb[idx];
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

  // Blit pixel buffer to canvas context.
  flush(ctx) {
    ctx.putImageData(this.imageData, 0, 0);
  }

  // Swap the palette at runtime — used when transitioning between demos.
  setPalette(palette) {
    this._rgb = palette.map(hex => {
      const v = parseInt(hex.slice(1), 16);
      return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
    });
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
