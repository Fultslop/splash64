// Ticker — horizontally scrolling text strip.
// Text is pre-rasterized into a sprite; scrollX advances each frame and wraps.

// Slice and join raw text into a single scrolling string.
// startLine/endLine are 0-indexed; endLine null means EOF.
// Blank lines are stripped; non-blank lines are joined with ' · ' separators.
// Call with text fetched via the asset store (store.addText / store.get).
export function processTickerText(raw, startLine = 0, endLine = null) {
  const lines  = raw.split('\n');
  const sliced = lines.slice(startLine, endLine ?? lines.length);
  return sliced
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .join('   ·   ');
}

// Build a ticker from a pre-rasterized sprite and a scroll speed (px/sec).
export function createTicker(sprite, speed) {
  let scrollX = 0;

  function update(dt) {
    scrollX = (scrollX + speed * dt) % sprite.w;
  }

  function getScrollX() { return Math.floor(scrollX); }

  return { update, getScrollX, sprite };
}
