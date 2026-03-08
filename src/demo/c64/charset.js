// C64 character set — precomputes a sprite per glyph, draws chars on a pixel grid.
// The C64 displayed uppercase only; callers should pass uppercase text.
//
// Does NOT use rasterizeText() because that function bakes a +1 x-offset into
// every sprite (from the fillText(char, 1, 0) call in rasterizeChar). For grid
// rendering we need sprites whose ink starts at (0,0) so columns align exactly.

const GLYPHS =
  ' !"#$%&\'()*+,-./0123456789:;<=>?' +
  '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_' +
  '`abcdefghijklmnopqrstuvwxyz{|}~';

// Rasterise a single character to a sprite with ink normalised to start at x=0.
function rasterizeGlyph(ch, fontSpec, charW, charH) {
  const canvas  = document.createElement('canvas');
  canvas.width  = charW;
  canvas.height = charH;
  const ctx = canvas.getContext('2d');
  ctx.font         = fontSpec;
  ctx.fillStyle    = '#fff';
  ctx.textBaseline = 'top';
  ctx.fillText(ch, 0, 0);  // draw flush to left edge — no +1 offset

  const { data } = ctx.getImageData(0, 0, charW, charH);
  const pixels   = [];
  let maxY = 0;

  for (let y = 0; y < charH; y++) {
    for (let x = 0; x < charW; x++) {
      if (data[(y * charW + x) * 4 + 3] > 32) {
        pixels.push([x, y]);
        if (y > maxY) maxY = y;
      }
    }
  }

  return { pixels, w: charW, h: maxY + 1 };
}

// Build a charset from a loaded font. Call after the font is confirmed loaded.
// Returns { sprites: Map<char,sprite>, charW, charH }.
export function buildCharset(fontFamily, fontSize) {
  const fontSpec = `${fontSize}px "${fontFamily}"`;

  // Measure the monospace cell advance width.
  const probe = document.createElement('canvas').getContext('2d');
  probe.font  = fontSpec;
  const charW = Math.round(probe.measureText('M').width);
  const charH = fontSize; // pixel font — cell height == point size

  const sprites = new Map();
  for (const ch of GLYPHS) {
    sprites.set(ch, rasterizeGlyph(ch, fontSpec, charW, charH));
  }

  return { sprites, charW, charH };
}

// Draw a single character at grid position (col, row).
export function drawChar(buffer, col, row, ch, colorIdx, charset, originX, originY) {
  const sprite = charset.sprites.get(ch) ?? charset.sprites.get(' ');
  if (!sprite || !sprite.pixels.length) return;
  buffer.blitSprite(sprite, originX + col * charset.charW, originY + row * charset.charH, colorIdx);
}

// Draw a string starting at grid position (col, row), one char per cell.
export function drawLine(buffer, col, row, text, colorIdx, charset, originX, originY) {
  for (let i = 0; i < text.length; i++) {
    drawChar(buffer, col + i, row, text[i], colorIdx, charset, originX, originY);
  }
}
