// color.js — shared color utility used by pixelbuffer.js and loadSprite.js.

// Parse a CSS hex color string ('#rrggbb') to an [r, g, b] array.
export function parseHexColor(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}
